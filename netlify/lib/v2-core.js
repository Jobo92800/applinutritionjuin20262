/*
  Lecture de la base de l'application thérapeute (« V2 »).

  Le BioPortrait, les mesures InBody et les mensurations d'une cliente sont
  écrits par les thérapeutes dans la V2, sur son propre projet Supabase. On
  les lit ici, en lecture seule, avec la clé de service de ce projet : rien
  n'est copié, la cliente voit ce que le centre a saisi, à jour.

  Le rapprochement se fait sur l'email : c'est la V2 qui crée le compte
  nutrition avec l'email de la fiche, il est donc le même des deux côtés.
*/

export const V2_URL = process.env.V2_SUPABASE_URL || '';
export const V2_KEY = process.env.V2_SUPABASE_SERVICE_ROLE_KEY || '';
export const v2Active = () => !!(V2_URL && V2_KEY);

/** Au-dessus de ce pourcentage, un axe secondaire est « présent » (même règle que la V2). */
export const SEUIL_PRESENCE = 60;
const AXES_PROFIL = ['P1', 'P2', 'P3', 'P4', 'P5'];
const AXES_TERRAIN = ['T1', 'T2', 'T3', 'T4', 'T5'];

async function rest(chemin) {
  const r = await fetch(`${V2_URL}/rest/v1${chemin}`, {
    headers: { apikey: V2_KEY, Authorization: `Bearer ${V2_KEY}` },
  });
  if (!r.ok) {
    const texte = await r.text();
    throw new Error(`V2 ${r.status} sur ${chemin.split('?')[0]} : ${texte.slice(0, 300)}`);
  }
  return r.json();
}

/** Les textes du barème portent quelques balises (<b>…) : la cliente lit du texte nu. */
const sansBalises = (t) => String(t || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

/*
  Les fiches d'une adresse. PostgREST : `ilike` sans joker = égalité sans
  tenir compte de la casse ; on retire ce qui serait pris pour un joker.
*/
export async function fichesParEmail(email) {
  const propre = String(email || '').trim().replace(/[%_*]/g, '');
  if (!propre) return [];
  return rest(`/clientes?select=id,prenom,nom,civilite,cree_le&email=ilike.${encodeURIComponent(propre)}&order=cree_le.desc`);
}

function decrireAxe(bareme, code, pourcentages) {
  const a = bareme.AX?.[code] || {};
  return {
    code,
    nom: a.name || code,
    signature: sansBalises(a.sig),
    texte: sansBalises(a.feel),
    impacts: (a.imp || []).map(sansBalises),
    pourcentage: Math.round(pourcentages[code] || 0),
  };
}

function jauges(bareme, codes, pourcentages, dominant) {
  return codes
    .map((code) => ({
      code,
      nom: bareme.AX?.[code]?.name || code,
      pourcentage: Math.round(pourcentages[code] || 0),
    }))
    .sort((a, b) => b.pourcentage - a.pourcentage)
    .map((j) => ({ ...j, dominant: j.code === dominant, present: j.pourcentage >= SEUIL_PRESENCE }));
}

/*
  La phrase de synthèse, reprise de la V2 (domain/bioportrait.ts) : le
  profil, le terrain, et au plus une force secondaire de chaque côté.
*/
function synthese(bareme, profil, terrain, secondaires) {
  const noms = secondaires.map((c) => (bareme.AX?.[c]?.name || c).toLowerCase());
  const nuance = noms.length === 0 ? ''
    : noms.length === 1 ? ` Une force secondaire la nuance : ${noms[0]}.`
    : ` Deux forces secondaires la nuancent : ${noms.join(' et ')}.`;
  return `Votre BioPortrait associe un profil ${profil.nom} à un terrain ${terrain.nom}.${nuance} `
    + 'Cette combinaison est la vôtre, et elle seule guide votre parcours.';
}

/** Un bilan de la V2, mis en forme pour la cliente. */
export function presenterBilan(b, bareme) {
  const pct = b.scores || {};
  const profil = decrireAxe(bareme, b.profil_dominant, pct);
  const terrain = decrireAxe(bareme, b.terrain_dominant, pct);
  const profils = jauges(bareme, AXES_PROFIL, pct, b.profil_dominant);
  const terrains = jauges(bareme, AXES_TERRAIN, pct, b.terrain_dominant);
  const secondaires = [
    ...profils.filter((j) => !j.dominant && j.present).slice(0, 1),
    ...terrains.filter((j) => !j.dominant && j.present).slice(0, 1),
  ].map((j) => j.code);
  const aussiPresents = [...profils, ...terrains]
    .filter((j) => !j.dominant && j.present)
    .map((j) => ({ nom: j.nom, pourcentage: j.pourcentage }));
  const complement = bareme.TERRAIN_COMPL?.[b.terrain_dominant];

  return {
    id: b.id,
    date: b.date_bilan,
    profil,
    terrain,
    synthese: synthese(bareme, profil, terrain, secondaires),
    jauges: { profils, terrains },
    aussiPresents,
    inbody: Array.isArray(b.inbody?.mesures) ? b.inbody.mesures : [],
    complement: complement ? { nom: sansBalises(complement.n), raison: sansBalises(complement.r) } : null,
    texteLibre: b.texte_libre || '',
    document: !!b.a_un_pdf,
  };
}

/*
  Tout ce que la cliente peut voir : ses bilans de perte de poids terminés,
  du plus récent au plus ancien, chacun lu dans la version de barème qui l'a
  produit, et ses mensurations dans l'ordre du temps.

  Le Bio-Portrait Anti-Âge (famille `anti_age`) se lit autrement et n'est pas
  repris ici. Le PDF n'est pas lu ici non plus : il pèse, on le sert à part
  (`documentBilan`).
*/
export async function profilCliente(email) {
  const fiches = await fichesParEmail(email);
  if (!fiches.length) return null;
  const ids = fiches.map((f) => f.id).join(',');

  const bilans = await rest(
    `/bilans?select=id,cliente_id,date_bilan,bareme_version,scores,profil_dominant,terrain_dominant,inbody,texte_libre`
    + `&cliente_id=in.(${ids})&statut=eq.termine&famille=eq.perte_de_poids&profil_dominant=not.is.null&order=date_bilan.desc,cree_le.desc`
  ).catch(async (e) => {
    // Une V2 d'avant la migration 056 n'a pas `famille` : on relit sans.
    if (!/famille/.test(e.message)) throw e;
    return rest(
      `/bilans?select=id,cliente_id,date_bilan,bareme_version,scores,profil_dominant,terrain_dominant,inbody,texte_libre`
      + `&cliente_id=in.(${ids})&statut=eq.termine&profil_dominant=not.is.null&order=date_bilan.desc,cree_le.desc`
    );
  });

  // Les bilans qui ont leur PDF : on ne lit que les identifiants, le fichier pèse.
  const avecPdf = new Set(
    (await rest(`/bilans?select=id&cliente_id=in.(${ids})&bioportrait_pdf=not.is.null`)).map((l) => l.id)
  );

  const versions = [...new Set(bilans.map((b) => b.bareme_version))];
  const baremes = {};
  if (versions.length) {
    for (const l of await rest(`/bareme_empreinte?select=version,contenu&version=in.(${versions.join(',')})`)) {
      baremes[l.version] = l.contenu;
    }
  }

  const mensurations = await rest(
    `/mensurations?select=date_mesure,poitrine,sous_poitrine,taille,ventre,hanches,bras_droit,bras_gauche,cuisse_droite,cuisse_gauche,mollet_droit,mollet_gauche`
    + `&cliente_id=in.(${ids})&order=date_mesure.asc,cree_le.asc`
  );

  const fiche = fiches[0];
  return {
    cliente: { prenom: fiche.prenom, civilite: fiche.civilite || 'Mme' },
    bilans: bilans
      .filter((b) => baremes[b.bareme_version])
      .map((b) => presenterBilan({ ...b, a_un_pdf: avecPdf.has(b.id) }, baremes[b.bareme_version])),
    mensurations: mensurations.map(({ date_mesure, ...mesures }) => ({ date: date_mesure, ...mesures })),
    seuil: SEUIL_PRESENCE,
  };
}

/** Le PDF d'un bilan de la cliente (base64), ou null s'il n'est pas à elle ou n'existe pas. */
export async function documentBilan(email, bilanId) {
  const fiches = await fichesParEmail(email);
  if (!fiches.length || !/^[0-9a-f-]{36}$/i.test(bilanId)) return null;
  const ids = fiches.map((f) => f.id).join(',');
  const lignes = await rest(`/bilans?select=bioportrait_pdf,date_bilan&id=eq.${bilanId}&cliente_id=in.(${ids})&limit=1`);
  const b = lignes[0];
  return b && b.bioportrait_pdf ? { base64: b.bioportrait_pdf, date: b.date_bilan } : null;
}
