/*
  Parcours audio — bibliothèque partagée des fonctions Netlify.

  Porté de « Mon Parcours » (Jobo92800/Applipodcast, netlify/lib/core.js) et
  adapté au schéma de l'application nutrition :

    clientes  -> profiles              (le compte Supabase Auth est le compte)
    etapes    -> podcasts              (display_order = numéro, access_tiers = cure)
    parcours  -> profiles.subscription_tier ('3_month' | '6_month')
    progression / appareils / acces_log -> parcours_progression / parcours_appareils / parcours_acces_log

  On appelle l'API REST de Supabase directement plutôt que @supabase/supabase-js :
  son client temps réel exige des WebSockets natifs, absents de l'environnement
  Node de Netlify. Même constat que pour les notifications push (push-core.js).
*/

export const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
export const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const ADMIN_CODE = process.env.ADMIN_CODE;
export const SEUIL = Number(process.env.SEUIL_DEBLOCAGE || 0.9);
export const APPAREILS_MAX = Number(process.env.APPAREILS_MAX || 4);
export const BUCKET = 'parcours-audio';

/*
  Relais vers « Mon Parcours » pendant la transition : tant que l'ancienne
  application sert les clientes, chaque compte créé ici lui est aussi
  transmis, avec le même mot de passe. Les deux variables se retirent le jour
  de la bascule, et le relais disparaît de lui-même.
*/
export const RELAIS_URL = process.env.MON_PARCOURS_API_URL || '';
export const RELAIS_CODE = process.env.MON_PARCOURS_ADMIN_CODE || '';
export const relaisActif = () => !!(RELAIS_URL && RELAIS_CODE);

export async function relais(corps) {
  const r = await fetch(RELAIS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-mbp-code': RELAIS_CODE },
    body: JSON.stringify(corps),
  });
  return { ok: r.ok, statut: r.status, corps: await r.json().catch(() => ({})) };
}

/** Les cures qui ont un parcours. La cure 1 mois est abandonnée (décision du 11/09/2026). */
export const CURES = {
  '3_month': 'Cure 3 mois',
  '6_month': 'Cure 6 mois',
};

/** Codes historiques de Mon Parcours, encore envoyés par la V2 thérapeute. */
export const CODES_PARCOURS = { B: '3_month', C: '6_month' };

export const json = (status, payload) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export function configManquante() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Configuration Supabase absente (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
    return json(500, { erreur: 'Service indisponible.' });
  }
  return null;
}

/*
  Les clés au format sb_secret_… ne sont pas des JWT. Sans l'en-tête apikey,
  l'API Storage tente de décoder le Bearer comme un jeton et répond
  « Invalid Compact JWS ». On envoie toujours les deux, partout.
*/
const enTetesSupabase = () => ({
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
});

/* ------------------------------------------------------------------ REST --- */

async function rest(chemin, options = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${chemin}`, {
    ...options,
    headers: { ...enTetesSupabase(), ...(options.headers || {}) },
  });
  if (!r.ok) {
    const texte = await r.text();
    throw new Error(`Supabase ${r.status} sur ${chemin} : ${texte.slice(0, 300)}`);
  }
  return r.status === 204 ? null : r.json();
}

export const db = {
  lire: (table, requete) => rest(`/${table}?${requete}`),
  async un(table, requete) {
    const lignes = await rest(`/${table}?${requete}&limit=1`);
    return lignes && lignes.length ? lignes[0] : null;
  },
  creer: (table, donnees) =>
    rest(`/${table}`, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(donnees),
    }),
  majSur: (table, requete, donnees) =>
    rest(`/${table}?${requete}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(donnees),
    }),
  fusionner: (table, donnees, cles) =>
    rest(`/${table}?on_conflict=${cles}`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(donnees),
    }),
  supprimer: (table, requete) => rest(`/${table}?${requete}`, { method: 'DELETE' }),
};

/* --------------------------------------------------------------- Storage --- */

/** URL de lecture temporaire d'un fichier audio. */
export async function urlSignee(chemin, secondes = 7200) {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${chemin}`, {
    method: 'POST',
    headers: enTetesSupabase(),
    body: JSON.stringify({ expiresIn: secondes }),
  });
  if (!r.ok) {
    const detail = (await r.text()).slice(0, 200);
    throw new Error(`Signature refusée pour ${chemin} : ${r.status} ${detail}`);
  }
  const { signedURL } = await r.json();
  return `${SUPABASE_URL}/storage/v1${signedURL}`;
}

/** URL d'envoi temporaire, utilisée par l'administration. */
export async function urlEnvoi(chemin) {
  // L'API Storage n'accepte aucune propriété dans le corps de cette route : le
  // remplacement se demande par l'en-tête x-upsert.
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/${chemin}`, {
    method: 'POST',
    headers: { ...enTetesSupabase(), 'x-upsert': 'true' },
    body: JSON.stringify({}),
  });
  if (!r.ok) {
    const detail = (await r.text()).slice(0, 200);
    throw new Error(`Signature d'envoi refusée pour ${chemin} : ${r.status} ${detail}`);
  }
  const { url } = await r.json();
  return `${SUPABASE_URL}/storage/v1${url}`;
}

/** Copie un fichier de l'ancien bucket public vers le bucket privé. */
export async function copierVersPrive(bucketSource, cle, destination) {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/copy`, {
    method: 'POST',
    headers: enTetesSupabase(),
    body: JSON.stringify({ bucketId: bucketSource, sourceKey: cle, destinationBucket: BUCKET, destinationKey: destination }),
  });
  if (!r.ok) {
    const detail = (await r.text()).slice(0, 200);
    throw new Error(`Copie refusée pour ${cle} : ${r.status} ${detail}`);
  }
}

/* ------------------------------------------------------------ Couverture --- */

/**
 * La couverture d'écoute est un bitset : un bit par seconde du fichier.
 * Une seconde ne compte qu'une fois, quel que soit le nombre de réécoutes.
 * Vingt minutes tiennent dans 150 octets, soit 200 caractères en base64.
 */
export function tauxCouverture(base64, dureeSec) {
  if (!base64 || !dureeSec || dureeSec < 1) return 0;
  let octets;
  try {
    octets = Buffer.from(base64, 'base64');
  } catch {
    return 0;
  }
  let n = 0;
  for (let i = 0; i < dureeSec; i++) {
    const o = octets[i >> 3];
    if (o && o & (128 >> (i & 7))) n++;
  }
  return Math.min(1, n / dureeSec);
}

/* --------------------------------------------------- Authentification --- */

/** Appel à l'API Auth de Supabase, avec la clé de service ou le jeton d'une cliente. */
export async function auth(chemin, options = {}) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1${chemin}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: options.jetonUtilisateur
        ? `Bearer ${options.jetonUtilisateur}`
        : `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const corps = await r.json().catch(() => ({}));
  return { ok: r.ok, statut: r.status, corps };
}

/** Vérifie un jeton de session et renvoie le compte Auth, ou null. */
export async function utilisateurDuJeton(jetonAcces) {
  if (!jetonAcces) return null;
  const { ok, corps } = await auth('/user', { jetonUtilisateur: jetonAcces });
  return ok && corps?.id ? corps : null;
}

/** Extrait le jeton de session de l'en-tête Authorization. */
export function jetonDeRequete(req) {
  return (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim() || null;
}

/* --------------------------------------------------- Journal et débit --- */

export function ipDe(req) {
  return (
    req.headers.get('x-nf-client-connection-ip') ||
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'inconnue'
  );
}

export async function journaliser(action, { userId = null, ip = null, detail = null } = {}) {
  try {
    await db.creer('parcours_acces_log', { user_id: userId, action, ip, detail });
  } catch (e) {
    console.error('Journalisation impossible :', e.message);
  }
}

/** Vrai si l'IP a dépassé le nombre d'appels autorisés sur la fenêtre donnée. */
export async function tropDAppels(ip, action, max = 10, secondes = 60) {
  const depuis = new Date(Date.now() - secondes * 1000).toISOString();
  try {
    const lignes = await db.lire(
      'parcours_acces_log',
      `select=id&ip=eq.${encodeURIComponent(ip)}&action=eq.${action}&created_at=gte.${depuis}&limit=${max + 1}`
    );
    return lignes.length > max;
  } catch (e) {
    console.error('Contrôle de débit impossible :', e.message);
    return false;
  }
}

export async function corpsJson(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

/* --------------------------------------------------------- Le parcours --- */

/**
 * Les étapes d'une cure, dans l'ordre. `podcasts` est petite : on la lit en
 * entier et on filtre ici, ce qui évite de dépendre des opérateurs de tableau
 * de PostgREST. Une étape marquée `all` fait partie de toutes les cures.
 */
export async function etapesDeLaCure(tier) {
  const podcasts = await db.lire(
    'podcasts',
    'select=id,title,description,key_points,week_challenges,support_pdf_url,cta_button,cta_button2,thumbnail,duration,fichier,access_tiers,display_order,created_at&actif=eq.true&order=display_order.asc,created_at.asc'
  );
  return podcasts.filter((p) => {
    const tiers = Array.isArray(p.access_tiers) ? p.access_tiers : [];
    return tiers.includes(tier) || tiers.includes('all');
  });
}

/**
 * Index de la première étape accessible : la première non terminée, jamais
 * avant celle forcée par le centre (`parcours_debloque_manuel`).
 */
export function indexDisponible(etapes, terminees, debloqueManuel) {
  let dispo = etapes.findIndex((e) => !terminees.has(e.id));
  if (dispo === -1) dispo = etapes.length - 1;
  return Math.max(dispo, Math.min(debloqueManuel || 0, etapes.length - 1));
}

/**
 * Retrouve la cliente derrière une session, vérifie qu'elle a un parcours,
 * enregistre l'appareil et applique la limite. Renvoie { profil, cure } ou
 * { erreur, statut }.
 */
export async function profilParSession(req, empreinte, jetonSecours) {
  // sendBeacon ne permet pas de poser un en-tête : le jeton peut arriver dans le corps.
  const utilisateur = await utilisateurDuJeton(jetonDeRequete(req) || jetonSecours);
  if (!utilisateur) return { erreur: 'session-expiree', statut: 401 };

  const profil = await db.un(
    'profiles',
    `select=id,email,name,role,subscription_tier,parcours_statut,parcours_debloque_manuel&id=eq.${utilisateur.id}`
  );
  if (!profil) return { erreur: 'session-expiree', statut: 401 };

  const cure = profil.subscription_tier;
  if (!CURES[cure]) return { erreur: 'compte-sans-parcours', statut: 403 };
  if (profil.parcours_statut === 'suspendu') return { erreur: 'acces-suspendu', statut: 403 };

  if (empreinte) {
    const appareils = await db.lire('parcours_appareils', `select=*&user_id=eq.${profil.id}`);
    const connu = appareils.find((a) => a.empreinte === empreinte);
    if (connu) {
      await db.majSur('parcours_appareils', `id=eq.${connu.id}`, { derniere_vue: new Date().toISOString() });
    } else {
      // Limite atteinte : on libère la place du plus ancien appareil au lieu de
      // fermer la porte. Une cliente qui passe du téléphone à la tablette puis à
      // l'ordinateur n'est jamais bloquée ; un accès réellement partagé, lui,
      // déconnecte ses utilisateurs les uns après les autres.
      if (appareils.length >= APPAREILS_MAX) {
        const plusAncien = appareils.reduce((a, b) => (a.derniere_vue <= b.derniere_vue ? a : b));
        await db.supprimer('parcours_appareils', `id=eq.${plusAncien.id}`);
      }
      await db.creer('parcours_appareils', {
        user_id: profil.id,
        empreinte,
        ua: (req.headers.get('user-agent') || '').slice(0, 200),
      });
    }
  }
  return { profil, cure };
}
