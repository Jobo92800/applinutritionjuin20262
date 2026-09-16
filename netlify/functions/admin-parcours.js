/*
  Administration du parcours audio.
  POST { action, ... }, autorisé de deux façons :
    - l'en-tête x-mbp-code (ADMIN_CODE) : de serveur à serveur, c'est ce que
      l'application thérapeute (V2) envoie à la signature d'un contrat ;
    - Authorization: Bearer <jeton Supabase> d'un compte dont le profil a
      role = 'admin' : c'est l'onglet Clientes de l'administration, qui n'a
      donc aucun code à retaper.

  L'action `creer` garde exactement la forme d'appel de « Mon Parcours », pour
  qu'il n'y ait qu'une adresse à changer côté V2.
*/
import {
  json, configManquante, corpsJson, db, auth, ADMIN_CODE, APPAREILS_MAX,
  CURES, CODES_PARCOURS, etapesDeLaCure, indexDisponible, urlEnvoi, urlSignee,
  copierVersPrive, journaliser, ipDe, utilisateurDuJeton, jetonDeRequete,
  relaisActif, relais, EXPORT_CODE,
} from '../lib/parcours-core.js';

const ok = (donnees) => json(200, { ok: true, ...donnees });
const nettoyerEmail = (v) => String(v || '').trim().toLowerCase();
const emailValide = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const MDP_MIN = 8;

const CODE_DE_CURE = Object.fromEntries(Object.entries(CODES_PARCOURS).map(([code, cure]) => [cure, code]));

/** 'B' / 'C' (codes historiques) ou '3_month' / '6_month' -> cure, ou null. */
function cureDemandee(valeur) {
  const v = String(valeur || '').trim();
  if (CURES[v]) return v;
  return CODES_PARCOURS[v.toUpperCase()] || null;
}

/**
 * Crée le compte avec son mot de passe déjà défini et l'e-mail confirmé.
 * La cliente est dans le centre au moment de la signature : lui faire faire
 * un aller-retour par sa boîte mail pendant que la thérapeute attend n'a pas
 * de sens. Le compte fonctionne immédiatement.
 *
 * Le profil est créé par le trigger `handle_new_user`, qui lit `name` dans
 * les métadonnées.
 */
async function creerAvecMotDePasse(email, name, motDePasse) {
  const r = await auth('/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password: motDePasse, email_confirm: true, user_metadata: { name } }),
  });
  if (r.ok) return { envoye: false, motDePasseDefini: true, utilisateur: r.corps };
  const message = String(r.corps?.msg || r.corps?.message || r.corps?.error_description || '');
  return { envoye: false, motDePasseDefini: false, raison: 'creation-refusee', detail: message.slice(0, 160) };
}

async function redefinirMotDePasse(userId, motDePasse) {
  const r = await auth(`/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ password: motDePasse, email_confirm: true }),
  });
  return r.ok;
}

/** Envoie l'e-mail d'invitation qui permet de choisir son mot de passe. */
async function inviter(email, name) {
  const r = await auth('/invite', {
    method: 'POST',
    body: JSON.stringify({ email, data: { name } }),
  });
  if (r.ok) return { envoye: true, utilisateur: r.corps };
  const message = String(r.corps?.msg || r.corps?.error_description || r.corps?.message || '');
  console.error('Invitation refusée :', r.statut, message);
  return { envoye: false, raison: 'invitation-refusee', detail: message.slice(0, 160) };
}

/** Attend que le trigger ait créé le profil, puis y écrit la cure et le nom. */
async function completerProfil(userId, champs) {
  for (let essai = 0; essai < 5; essai++) {
    const lignes = await db.majSur('profiles', `id=eq.${userId}`, champs);
    if (lignes && lignes.length) return lignes[0];
    await new Promise((r) => setTimeout(r, 150));
  }
  return null;
}

/** Le code partagé, ou un compte administrateur connecté. */
async function autorise(req) {
  if ((req.headers.get('x-mbp-code') || '') === ADMIN_CODE) return true;
  const utilisateur = await utilisateurDuJeton(jetonDeRequete(req));
  if (!utilisateur) return false;
  const profil = await db.un('profiles', `select=role&id=eq.${utilisateur.id}`);
  return profil?.role === 'admin';
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { erreur: 'Méthode non autorisée.' });
  const manque = configManquante();
  if (manque) return manque;
  if (!ADMIN_CODE) return json(500, { erreur: 'Service indisponible.' });

  if (!(await autorise(req))) {
    await journaliser('admin-refuse', { ip: ipDe(req) });
    return json(401, { erreur: 'code-invalide' });
  }

  const corps = await corpsJson(req);
  if (!corps || !corps.action) return json(400, { erreur: 'Requête invalide.' });

  try {
    switch (corps.action) {
      /* --------------------------------------------------- créer un compte --- */
      case 'creer': {
        const prenom = (corps.prenom || '').trim();
        const nom = (corps.nom || '').trim();
        const email = nettoyerEmail(corps.email);
        if (!prenom) return json(400, { erreur: 'prenom-requis' });
        if (!emailValide(email)) return json(400, { erreur: 'email-invalide' });

        const cure = cureDemandee(corps.parcours);
        if (!cure) return json(400, { erreur: 'parcours-inconnu' });

        const motDePasse = String(corps.motDePasse || '');
        if (motDePasse && motDePasse.length < MDP_MIN) return json(400, { erreur: 'mot-de-passe-court' });

        const name = [prenom, nom].filter(Boolean).join(' ');

        // Transition : Mon Parcours d'abord, puisque c'est lui que les
        // clientes utilisent encore. S'il refuse, la thérapeute le voit,
        // comme aujourd'hui. « Déjà là » (409) n'est pas un refus.
        let relaye = null;
        if (relaisActif()) {
          const r = await relais({
            action: 'creer', prenom, nom, email, telephone: corps.telephone, centre: corps.centre,
            parcours: CODE_DE_CURE[cure], ...(motDePasse ? { motDePasse } : {}),
          });
          if (!r.ok && r.statut !== 409) {
            await journaliser('relais-refuse', { ip: ipDe(req), detail: `${r.statut} ${r.corps?.erreur || ''}` });
            return json(502, { erreur: 'relais-refuse', detail: r.corps?.erreur || `Mon Parcours a répondu ${r.statut}` });
          }
          relaye = { statut: r.statut, dejaLa: r.statut === 409 };
        }

        const existant = await db.un(
          'profiles',
          `select=id,name,subscription_tier,parcours_statut&email=eq.${encodeURIComponent(email)}`
        );

        // Compte déjà là : avec un mot de passe fourni, on le redéfinit et on met
        // la cure à jour plutôt que de refuser. C'est ce que la thérapeute veut
        // quand elle reprend une cliente au comptoir.
        if (existant) {
          if (!motDePasse) return json(409, { erreur: 'email-deja-utilise', prenom: existant.name });
          const redefini = await redefinirMotDePasse(existant.id, motDePasse);
          if (!redefini) return json(502, { erreur: 'mot-de-passe-refuse' });
          await db.majSur('profiles', `id=eq.${existant.id}`, {
            subscription_tier: cure, parcours_statut: 'actif',
          });
          await journaliser('cliente-mdp-redefini', { userId: existant.id, ip: ipDe(req) });
          return ok({
            cliente: { id: existant.id, prenom: existant.name, email },
            invitation: { envoye: false, motDePasseDefini: true },
            existante: true,
            relaye,
          });
        }

        const invitation = motDePasse
          ? await creerAvecMotDePasse(email, name, motDePasse)
          : await inviter(email, name);
        const userId = invitation.utilisateur?.id;
        if (!userId) return json(502, { erreur: invitation.raison || 'creation-refusee', detail: invitation.detail });

        const profil = await completerProfil(userId, { name, subscription_tier: cure, parcours_statut: 'actif' });
        if (!profil) return json(502, { erreur: 'profil-absent' });

        await journaliser('cliente-creee', { userId, ip: ipDe(req), detail: email });
        return ok({ cliente: { id: userId, prenom, email }, invitation, relaye });
      }

      case 'renvoyer-invitation': {
        const profil = await db.un('profiles', `select=id,email,name&id=eq.${corps.id}`);
        if (!profil) return json(404, { erreur: 'cliente-inconnue' });
        // Compte existant : Supabase refuse une seconde invitation, on passe par
        // l'e-mail de réinitialisation, qui aboutit au même écran.
        await auth('/recover', { method: 'POST', body: JSON.stringify({ email: profil.email }) });
        // Transition : Mon Parcours renvoie aussi la sienne, si le compte y existe.
        if (relaisActif()) {
          try {
            const liste = await relais({ action: 'liste' });
            const la = (liste.corps?.clientes || []).find((c) => (c.email || '').toLowerCase() === profil.email.toLowerCase());
            if (la) await relais({ action: 'renvoyer-invitation', id: la.id });
          } catch (e) {
            console.error('Relais du renvoi impossible :', e.message);
          }
        }
        await journaliser('invitation-renvoyee', { userId: profil.id, ip: ipDe(req) });
        return ok({ invitation: { envoye: true, deja: true } });
      }

      /* ------------------------------------------------------- les clientes --- */
      case 'liste': {
        const profils = await db.lire(
          'profiles',
          'select=id,email,name,subscription_tier,parcours_statut,parcours_debloque_manuel,created_at,parcours_progression(terminee,updated_at),parcours_appareils(id)&order=created_at.desc&limit=500'
        );
        const totaux = {};
        for (const cure of Object.keys(CURES)) totaux[cure] = (await etapesDeLaCure(cure)).length;
        return ok({
          clientes: profils
            .filter((p) => CURES[p.subscription_tier])
            .map((p) => ({
              id: p.id,
              prenom: p.name,
              email: p.email,
              cure: p.subscription_tier,
              cureNom: CURES[p.subscription_tier],
              statut: p.parcours_statut,
              terminees: (p.parcours_progression || []).filter((x) => x.terminee).length,
              total: totaux[p.subscription_tier] || 0,
              appareils: (p.parcours_appareils || []).length,
              appareilsMax: APPAREILS_MAX,
              // Champs lus par la V2 thérapeute, hérités de Mon Parcours.
              parcoursCode: CODE_DE_CURE[p.subscription_tier],
              compteActive: true,
              derniereActivite: (p.parcours_progression || []).map((x) => x.updated_at).filter(Boolean).sort().pop() || null,
            })),
        });
      }

      case 'modifier': {
        const profil = await db.un('profiles', `select=id&id=eq.${corps.id}`);
        if (!profil) return json(404, { erreur: 'cliente-inconnue' });
        const champs = {};
        if (corps.statut === 'actif' || corps.statut === 'suspendu') champs.parcours_statut = corps.statut;
        if (corps.cure && CURES[corps.cure]) champs.subscription_tier = corps.cure;
        if (Object.keys(champs).length) await db.majSur('profiles', `id=eq.${profil.id}`, champs);
        if (corps.reinitialiserAppareils) {
          await db.supprimer('parcours_appareils', `user_id=eq.${profil.id}`);
          await journaliser('appareils-reinitialises', { userId: profil.id, ip: ipDe(req) });
        }
        return ok({});
      }

      /* Validation manuelle : le centre débloque l'étape suivante. */
      case 'valider-etape': {
        const profil = await db.un(
          'profiles',
          `select=id,subscription_tier,parcours_debloque_manuel&id=eq.${corps.id}`
        );
        if (!profil || !CURES[profil.subscription_tier]) return json(404, { erreur: 'cliente-inconnue' });
        const etapes = await etapesDeLaCure(profil.subscription_tier);
        const avancement = await db.lire(
          'parcours_progression',
          `select=podcast_id,terminee&user_id=eq.${profil.id}`
        );
        const terminees = new Set(avancement.filter((x) => x.terminee).map((x) => x.podcast_id));
        const dispo = indexDisponible(etapes, terminees, profil.parcours_debloque_manuel);
        const suivant = Math.min(dispo + 1, etapes.length - 1);
        await db.majSur('profiles', `id=eq.${profil.id}`, { parcours_debloque_manuel: suivant });
        await journaliser('validation-manuelle', {
          userId: profil.id, ip: ipDe(req), detail: `étape ${suivant + 1}`,
        });
        return ok({ numero: suivant + 1 });
      }

      /* ---------------------------------------------------------- les étapes --- */
      case 'url-envoi': {
        const chemin = String(corps.chemin || '').replace(/[^A-Za-z0-9/._-]/g, '');
        if (!/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+\.(mp3|m4a|aac|wav)$/i.test(chemin)) {
          return json(400, { erreur: 'chemin-invalide' });
        }
        return ok({ url: await urlEnvoi(chemin), chemin });
      }

      /* Rattache un fichier déposé à une étape, avec sa durée réelle. */
      case 'etape-maj': {
        if (!corps.id) return json(400, { erreur: 'etape-incomplete' });
        const champs = {};
        if (corps.fichier !== undefined) champs.fichier = corps.fichier;
        if (corps.dureeSec !== undefined) champs.duration = Math.floor(Number(corps.dureeSec)) || 0;
        if (corps.actif !== undefined) champs.actif = !!corps.actif;
        await db.majSur('podcasts', `id=eq.${corps.id}`, champs);
        return ok({});
      }

      /*
        La liste des étapes par cure, dans la forme héritée de Mon Parcours
        (parcours_code B/C, numero) : c'est ce que la V2 lit pour proposer
        l'écoute d'un épisode depuis la fiche d'une cliente.
      */
      case 'parcours': {
        const etapes = [];
        for (const [code, cure] of Object.entries(CODES_PARCOURS)) {
          (await etapesDeLaCure(cure)).forEach((e, i) => etapes.push({
            id: e.id, parcours_code: code, numero: i + 1, titre: e.title, fichier: e.fichier || null, actif: true,
          }));
        }
        return ok({
          parcours: Object.entries(CODES_PARCOURS).map(([code, cure]) => ({ code, nom_commercial: CURES[cure] })),
          etapes,
        });
      }

      /*
        Rapatriement, une fois : les épisodes déposés avant la fusion ont une
        adresse publique dans l'ancien bucket `podcast-audio`. On copie chaque
        fichier dans le bucket privé et on enregistre son chemin. Ré-exécutable :
        un épisode déjà rapatrié est ignoré.
      */
      case 'migrer-audio': {
        const podcasts = await db.lire('podcasts', 'select=id,title,audio_url,fichier&order=display_order.asc');
        const resultat = { copies: 0, ignores: 0, echecs: [] };
        for (const p of podcasts) {
          if (p.fichier) { resultat.ignores++; continue; }
          const m = /\/object\/public\/([^/]+)\/(.+)$/.exec(p.audio_url || '');
          if (!m) { resultat.echecs.push({ id: p.id, titre: p.title, raison: 'adresse-inconnue' }); continue; }
          const [, bucketSource, cle] = m;
          const destination = `episodes/${decodeURIComponent(cle).replace(/[^A-Za-z0-9._-]/g, '-')}`;
          try {
            await copierVersPrive(bucketSource, decodeURIComponent(cle), destination);
            await db.majSur('podcasts', `id=eq.${p.id}`, { fichier: destination });
            resultat.copies++;
          } catch (e) {
            resultat.echecs.push({ id: p.id, titre: p.title, raison: e.message.slice(0, 120) });
          }
        }
        await journaliser('audio-rapatrie', { ip: ipDe(req), detail: `${resultat.copies} copié(s), ${resultat.echecs.length} échec(s)` });
        return ok(resultat);
      }

      /*
        Migration des clientes de Mon Parcours, une fois.

        Lit l'export de l'ancienne application (comptes, progression, mots de
        passe hachés), recrée chaque compte ici avec le même hachage — la
        cliente garde son mot de passe — et recopie la progression en faisant
        correspondre les étapes par cure et numéro. Ré-exécutable : un compte
        déjà présent est complété, jamais recréé ; une progression déjà là est
        laissée telle quelle.
      */
      case 'importer-clientes': {
        if (!relaisActif() || !EXPORT_CODE) return json(400, { erreur: 'import-non-configure' });
        const exp = await relais({ action: 'exporter' }, { 'x-export-code': EXPORT_CODE });
        if (!exp.ok) return json(502, { erreur: 'export-refuse', detail: exp.corps?.erreur || `Mon Parcours a répondu ${exp.statut}` });

        const etapesParCure = {};
        for (const cure of Object.keys(CURES)) etapesParCure[cure] = await etapesDeLaCure(cure);
        const profils = await db.lire('profiles', 'select=id,email&limit=2000');
        const profilParEmail = Object.fromEntries(profils.map((p) => [String(p.email || '').toLowerCase(), p.id]));

        const bilan = { crees: 0, completes: 0, progressions: 0, ignores: [], echecs: [] };
        const progParCliente = {};
        for (const p of exp.corps.progression || []) (progParCliente[p.cliente_id] ||= []).push(p);

        for (const c of exp.corps.clientes || []) {
          const email = nettoyerEmail(c.email);
          const cure = CODES_PARCOURS[String(c.parcours_code || '').toUpperCase()];
          if (!emailValide(email)) { bilan.ignores.push({ email: c.email, raison: 'email-invalide' }); continue; }
          if (!cure) { bilan.ignores.push({ email, raison: `cure ${c.parcours_code} sans parcours ici` }); continue; }
          if (!c.auth_user_id) { bilan.ignores.push({ email, raison: 'jamais activée sur Mon Parcours' }); continue; }

          try {
            const name = [c.prenom, c.nom].filter(Boolean).join(' ').trim() || 'Cliente';
            let userId = profilParEmail[email];
            if (!userId) {
              const r = await auth('/admin/users', {
                method: 'POST',
                body: JSON.stringify({
                  email, email_confirm: true, user_metadata: { name },
                  ...(c.hachage ? { password_hash: c.hachage } : {}),
                }),
              });
              if (!r.ok || !r.corps?.id) throw new Error(r.corps?.msg || r.corps?.message || `Auth ${r.statut}`);
              userId = r.corps.id;
              profilParEmail[email] = userId;
              bilan.crees++;
            } else {
              bilan.completes++;
            }
            await completerProfil(userId, {
              name, subscription_tier: cure,
              parcours_statut: c.statut === 'suspendu' ? 'suspendu' : 'actif',
              parcours_debloque_manuel: Number(c.debloque_manuel) || 0,
            });

            const deja = new Set((await db.lire('parcours_progression', `select=podcast_id&user_id=eq.${userId}`)).map((x) => x.podcast_id));
            for (const p of progParCliente[c.id] || []) {
              const cureP = CODES_PARCOURS[String(p.parcours_code || '').toUpperCase()];
              const podcast = cureP && etapesParCure[cureP][Number(p.numero) - 1];
              if (!podcast || deja.has(podcast.id)) continue;
              await db.creer('parcours_progression', {
                user_id: userId, podcast_id: podcast.id,
                couverture: p.couverture || '', position_sec: p.position_sec || 0,
                taux: Number(p.taux || 0), terminee: !!p.terminee, terminee_le: p.terminee_le || null,
                updated_at: p.updated_at || new Date().toISOString(),
              });
              bilan.progressions++;
            }
          } catch (e) {
            bilan.echecs.push({ email, raison: String(e.message).slice(0, 120) });
          }
        }

        await journaliser('import-clientes', { ip: ipDe(req), detail: `${bilan.crees} créées, ${bilan.completes} complétées, ${bilan.progressions} progressions, ${bilan.echecs.length} échecs` });
        return ok({ ...bilan, hachages: !!exp.corps.hachagesDisponibles });
      }

      /* Écoute de contrôle : même adresse signée que pour une cliente, sans condition. */
      case 'ecouter': {
        const etape = await db.un('podcasts', `select=id,title,fichier&id=eq.${corps.id}`);
        if (!etape) return json(404, { erreur: 'etape-inconnue' });
        if (!etape.fichier) return json(404, { erreur: 'audio-absent' });
        return ok({ url: await urlSignee(etape.fichier, 3600), titre: etape.title });
      }

      default:
        return json(400, { erreur: 'action-inconnue' });
    }
  } catch (e) {
    console.error('admin-parcours :', e.message);
    return json(500, { erreur: 'Service momentanément indisponible.' });
  }
};
