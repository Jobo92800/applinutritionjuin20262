/*
  Banc d'essai du parcours audio. Exécute les vraies fonctions Netlify en
  simulant l'API REST de Supabase, son Auth et son stockage. Sert à vérifier
  la logique avant tout déploiement — ce n'est pas du code de production.

  Ce que le simulateur ne fait PAS : valider le corps des requêtes Storage ni
  le format des clés. Les deux bugs Storage rencontrés sur Mon Parcours sont
  passés au travers pour cette raison. Toute nouvelle route Storage se vérifie
  en vrai.
*/
import http from 'node:http';
import { randomUUID } from 'node:crypto';

const RACINE = new URL('../..', import.meta.url).pathname;
const BANC_UI = !!process.env.BANC_UI;
export const PORT = BANC_UI ? 8124 : 8125;   // les tests et le mode UI peuvent tourner ensemble
// En mode UI, le « Supabase » simulé est ce serveur lui-même : le navigateur
// peut alors réellement charger les adresses signées, qui servent un son de test.
const FAUX = BANC_UI ? `http://localhost:${PORT}` : 'http://fauxsupabase.local';

process.env.SUPABASE_URL = FAUX;
process.env.SUPABASE_SERVICE_ROLE_KEY = 'cle-de-service-test';
process.env.ADMIN_CODE = 'test-2026';

/*
  BANC_UI=1 : le banc sert de serveur à l'application en mode démo (sans .env),
  derrière le proxy de Vite. Tout appel sans jeton est traité comme la cliente
  démo, admin et en cure 3 mois — de quoi voir tous les écrans tourner sans
  identifiants ni vraie base.
*/
const JETON_DEMO = 'banc-demo';

/* ------------------------------------------------- base simulée --- */
export const tables = {
  profiles: [],
  podcasts: [],
  parcours_progression: [],
  parcours_appareils: [],
  parcours_acces_log: [],
  push_subscriptions: [],
};

const podcast = (id, title, tiers, ordre, extra = {}) => ({
  id, title, description: 'desc ' + title, key_points: [], week_challenges: [],
  support_pdf_url: null, cta_button: null, cta_button2: null, thumbnail: null,
  access_tiers: tiers, display_order: ordre, duration: 900, fichier: `${tiers[0]}/${id}.mp3`, fiches: {},
  actif: true, created_at: new Date(2026, 0, ordre).toISOString(), ...extra,
});
tables.podcasts.push(
  podcast('p1', 'Introduction',      ['3_month', '6_month'], 1, {
    // Un vrai texte de production, pour juger la mise en page dans le banc.
    description: "Cette semaine, on lance officiellement la cure. Vous êtes au cœur de votre journée détox, une étape stratégique de remise à zéro essentielle pour relancer la purification du corps.\n\nDès demain, vous entrez dans la phase d'attaque (7 jours). Vous retirez les féculents le midi et le soir, non pas par punition, mais pour stabiliser la glycémie et inciter le corps à puiser dans ses réserves. Attention, cette phase est volontairement courte pour éviter que l'organisme ne ralentisse son métabolisme.\n\nLe succès de cette semaine repose sur un petit-déjeuner structuré qui respecte les 4 piliers essentiels protéines, fruit, graisses de qualité et glucides à IG bas.\n\nLes protéines maigres (volaille, œufs, poisson blanc) sont fondamentales car elles apportent les acides aminés essentiels. Les fruits, riches en nutriments, sont vos alliés s'ils sont bien choisis (limitez ceux contenant plus de 15 % de sucre à une portion/jour). Pendant cette semaine, vos assiettes seront composées de légumes à volonté, de protéines maigres et de bonnes graisses.",
    key_points: ["La journée détox est une remise à zéro symbolique et stratégique des organes d'élimination.", "La phase d'attaque retire les féculents midi et soir pour stabiliser la glycémie et brûler les graisses.", 'Le petit-déjeuner doit contenir les 4 piliers protéines, fibres, graisses saines et glucides à IG bas.'],
    week_challenges: ["Boire 2 litres d'eau par jour.", "Suivre votre semaine d'attaque à la lettre, sans écart."],
  }),
  podcast('p2', 'Semaine 1',         ['3_month', '6_month'], 2, { duration: 600 }),
  podcast('p3', 'Semaine 2',         ['3_month'],            3, { duration: 600 }),
  podcast('p4', 'Semaine 12 (3 m)',  ['3_month'],            4),
  podcast('p5', 'Bonus commun',      ['all'],                5, { duration: 300 }),
  podcast('p6', 'Vieille cure 1 m',  ['1_month'],            6),
  podcast('p7', 'Désactivée',        ['3_month'],            7, { actif: false }),
  podcast('p8', 'Sans durée connue', ['6_month'],            8, { duration: 0 }),
  // Déposés avant la fusion : une adresse publique, pas encore de fichier privé.
  podcast('p9',  'Ancien épisode',   ['1_month'],            9, { fichier: null, audio_url: `${FAUX}/storage/v1/object/public/podcast-audio/1700000000-semaine.mp3` }),
  podcast('p10', 'Ancien perdu',     ['1_month'],           10, { fichier: null, audio_url: `${FAUX}/storage/v1/object/public/podcast-audio/absent.mp3` }),
);

export const journal = { emails: [], signatures: [], copies: [], relais: [], pushs: [], v2: [] };
/* La base de l'application thérapeute (V2), lue par « Mon profil ». */
const V2 = 'http://fauxv2.local';
process.env.V2_SUPABASE_URL = V2;
process.env.V2_SUPABASE_SERVICE_ROLE_KEY = 'cle-v2-test';
const AXE = (name, sig, feel, imp) => ({ name, sig, feel, imp, note: '' });
export const tablesV2 = {
  clientes: [
    // Marie a deux fiches (une reprise du CRM, une née dans la V2) : on lit les deux.
    { id: 'c-marie', prenom: 'Marie', nom: 'Dupont', civilite: 'Mme', email: 'Marie@Exemple.fr', airtable_record_id: 'recM', cree_le: '2026-06-01T10:00:00Z' },
    { id: 'c-marie-2', prenom: 'Marie', nom: 'Dupont', civilite: 'Mme', email: 'marie@exemple.fr', airtable_record_id: null, cree_le: '2025-01-01T10:00:00Z' },
    { id: 'c-lea', prenom: 'Léa', nom: 'Martin', civilite: 'Mme', email: 'lea@exemple.fr', airtable_record_id: 'recL', cree_le: '2026-06-01T10:00:00Z' },
    { id: 'c-demo', prenom: 'Démo', nom: 'Cliente', civilite: 'Mme', email: 'demo@nutrition.com', airtable_record_id: 'recD', cree_le: '2026-06-01T10:00:00Z' },
  ],
  bareme_empreinte: [
    { version: 3, actif: true, contenu: {
      AX: {
        P1: AXE('Émotionnelle', 'Vous mangez ce que vous ressentez.', 'Les émotions guident <b>vos choix</b> à table.', ['Grignotage du soir', 'Compensation après une contrariété']),
        P2: AXE('Pressée', 'Le temps manque, l’assiette s’en ressent.', 'Vous mangez vite, souvent debout.', ['Repas sautés']),
        P3: AXE('Sociale', '', 'Les repas sont des moments partagés.', []),
        P4: AXE('Contrôlante', '', 'Vous surveillez tout.', []),
        P5: AXE('Gourmande', '', 'Le plaisir d’abord.', []),
        T1: AXE('Hormonal', 'Votre corps suit ses cycles.', 'Le terrain hormonal pèse sur <b>la rétention</b> et l’énergie.', ['Ventre gonflé en fin de journée']),
        T2: AXE('Digestif', '', 'La digestion est lente.', []),
        T3: AXE('Circulatoire', '', 'Les jambes sont lourdes.', []),
        T4: AXE('Métabolique', '', 'Le métabolisme est ralenti.', []),
        T5: AXE('Inflammatoire', '', 'Le terrain est inflammatoire.', []),
      },
      TERRAIN_COMPL: { T1: { n: 'SOS / Sauveur', r: 'Pour accompagner <b>les cycles</b>.' } },
      CURE_PRIO: {},
      STEPS: [],
    } },
  ],
  bilans: [
    { id: '11111111-1111-4111-8111-111111111111', cliente_id: 'c-marie', famille: 'perte_de_poids', statut: 'termine', date_bilan: '2026-06-02', cree_le: '2026-06-02T10:00:00Z', bareme_version: 3,
      scores: { P1: 82, P2: 64, P3: 40, P4: 20, P5: 55, T1: 75, T2: 61, T3: 30, T4: 45, T5: 10 },
      profil_dominant: 'P1', terrain_dominant: 'T1', inbody: { mesures: [{ libelle: 'Graisse viscérale', valeur: 'Élevée (dans la zone gris foncé)' }, { libelle: 'Score InBody / 100', valeur: '72' }] },
      texte_libre: 'Retrouver de l’énergie le matin.', bioportrait_pdf: Buffer.from('%PDF-1.4 faux document').toString('base64'), bioportrait_depose_le: null },
    { id: '22222222-2222-4222-8222-222222222222', cliente_id: 'c-marie-2', famille: 'perte_de_poids', statut: 'termine', date_bilan: '2025-01-10', cree_le: '2025-01-10T10:00:00Z', bareme_version: 3,
      scores: { P1: 50, P2: 70, P3: 40, P4: 20, P5: 55, T1: 40, T2: 80, T3: 30, T4: 45, T5: 10 },
      profil_dominant: 'P2', terrain_dominant: 'T2', inbody: {}, texte_libre: '', bioportrait_pdf: null, bioportrait_depose_le: null },
    // Abandonné : pas de profil, ne s'affiche pas.
    { id: '33333333-3333-4333-8333-333333333333', cliente_id: 'c-marie', famille: 'perte_de_poids', statut: 'abandonne', date_bilan: '2026-07-01', cree_le: '2026-07-01T10:00:00Z', bareme_version: 3,
      scores: {}, profil_dominant: null, terrain_dominant: null, inbody: {}, texte_libre: '', bioportrait_pdf: null, bioportrait_depose_le: null },
    // Anti-âge : un autre document, pas repris ici.
    { id: '44444444-4444-4444-8444-444444444444', cliente_id: 'c-marie', famille: 'anti_age', statut: 'termine', date_bilan: '2026-08-01', cree_le: '2026-08-01T10:00:00Z', bareme_version: 1,
      scores: { fermete: 5 }, profil_dominant: 'fermete', terrain_dominant: 'hydratation', inbody: {}, texte_libre: '', bioportrait_pdf: null, bioportrait_depose_le: null },
    // Léa : un bilan à elle, que Marie ne doit pas pouvoir ouvrir.
    { id: '55555555-5555-4555-8555-555555555555', cliente_id: 'c-lea', famille: 'perte_de_poids', statut: 'termine', date_bilan: '2026-06-05', cree_le: '2026-06-05T10:00:00Z', bareme_version: 3,
      scores: { P1: 30, P2: 30, P3: 90, P4: 20, P5: 55, T1: 40, T2: 20, T3: 85, T4: 45, T5: 10 },
      profil_dominant: 'P3', terrain_dominant: 'T3', inbody: {}, texte_libre: '', bioportrait_pdf: Buffer.from('%PDF-1.4 lea').toString('base64'), bioportrait_depose_le: '2026-06-05T11:00:00Z' },
    { id: '66666666-6666-4666-8666-666666666666', cliente_id: 'c-demo', famille: 'perte_de_poids', statut: 'termine', date_bilan: '2026-09-01', cree_le: '2026-09-01T10:00:00Z', bareme_version: 3,
      scores: { P1: 82, P2: 64, P3: 40, P4: 20, P5: 55, T1: 75, T2: 61, T3: 30, T4: 45, T5: 10 },
      profil_dominant: 'P1', terrain_dominant: 'T1', inbody: { mesures: [{ libelle: 'Graisse viscérale', valeur: 'Élevée (dans la zone gris foncé)' }, { libelle: 'Masse musculaire', valeur: 'Moyenne' }, { libelle: 'Métabolisme', valeur: 'Lent (sur / juste sous la fourchette basse)' }, { libelle: 'Rétention d’eau', valeur: 'Moyenne (0,381 à 0,390)' }, { libelle: 'Score InBody / 100', valeur: '72' }] },
      texte_libre: 'Retrouver de l’énergie le matin.', bioportrait_pdf: Buffer.from('%PDF-1.4 faux document').toString('base64'), bioportrait_depose_le: null },
    { id: '77777777-7777-4777-8777-777777777777', cliente_id: 'c-demo', famille: 'perte_de_poids', statut: 'termine', date_bilan: '2026-03-01', cree_le: '2026-03-01T10:00:00Z', bareme_version: 3,
      scores: { P1: 50, P2: 70, P3: 40, P4: 20, P5: 55, T1: 40, T2: 80, T3: 30, T4: 45, T5: 10 },
      profil_dominant: 'P2', terrain_dominant: 'T2', inbody: {}, texte_libre: '', bioportrait_pdf: null, bioportrait_depose_le: null },
  ],
  mensurations: [
    { id: 'm1', cliente_id: 'c-marie', date_mesure: '2026-06-02', cree_le: '2026-06-02T10:00:00Z', taille: 84, ventre: 96, hanches: 104, cuisse_droite: 62, cuisse_gauche: 62 },
    { id: 'm2', cliente_id: 'c-marie', date_mesure: '2026-07-14', cree_le: '2026-07-14T10:00:00Z', taille: 80.5, ventre: 91, hanches: 101, cuisse_droite: 60, cuisse_gauche: 60.5 },
    { id: 'm3', cliente_id: 'c-demo', date_mesure: '2026-09-01', cree_le: '2026-09-01T10:00:00Z', taille: 84, ventre: 96, hanches: 104, cuisse_droite: 62, cuisse_gauche: 62 },
    { id: 'm4', cliente_id: 'c-demo', date_mesure: '2026-09-15', cree_le: '2026-09-15T10:00:00Z', taille: 80.5, ventre: 91, hanches: 101, cuisse_droite: 60, cuisse_gauche: 60.5 },
  ],
};

/* Un « Mon Parcours » simulé pour le relais de transition. */
const RELAIS = 'http://fauxmonparcours.local/api/admin';
process.env.MON_PARCOURS_API_URL = RELAIS;
process.env.MON_PARCOURS_ADMIN_CODE = 'code-podcast-test';
process.env.MON_PARCOURS_EXPORT_CODE = 'export-test';
const clientesRelais = new Map();   // email -> id
/* Ce que Mon Parcours exporte pour la migration. */
export const EXPORT = {
  clientes: [
    { id: 'mp-1', prenom: 'Anaïs', nom: 'Roux', email: 'anais@exemple.fr', parcours_code: 'B', statut: 'actif', debloque_manuel: 0, auth_user_id: 'x1', hachage: '$2a$10$hache-anais' },
    { id: 'mp-2', prenom: 'Léa', nom: 'Martin', email: 'lea@exemple.fr', parcours_code: 'C', statut: 'suspendu', debloque_manuel: 1, auth_user_id: 'x2', hachage: '$2a$10$hache-lea' },
    { id: 'mp-3', prenom: 'Vieille', nom: 'Cure', email: 'vieille@exemple.fr', parcours_code: 'A', statut: 'actif', debloque_manuel: 0, auth_user_id: 'x3', hachage: null },
    { id: 'mp-4', prenom: 'Jamais', nom: 'Activée', email: 'jamais@exemple.fr', parcours_code: 'B', statut: 'actif', debloque_manuel: 0, auth_user_id: null, hachage: null },
  ],
  progression: [
    { cliente_id: 'mp-1', parcours_code: 'B', numero: 1, couverture: '', position_sec: 900, taux: 1, terminee: true, terminee_le: '2026-09-01T10:00:00Z', updated_at: '2026-09-01T10:00:00Z' },
    { cliente_id: 'mp-1', parcours_code: 'B', numero: 2, couverture: 'AAAA', position_sec: 120, taux: 0.2, terminee: false, terminee_le: null, updated_at: '2026-09-02T10:00:00Z' },
    { cliente_id: 'mp-2', parcours_code: 'C', numero: 1, couverture: '', position_sec: 900, taux: 1, terminee: true, terminee_le: '2026-09-03T10:00:00Z', updated_at: '2026-09-03T10:00:00Z' },
  ],
  hachagesDisponibles: true,
};

/* Comptes simulés de Supabase Auth, et le trigger qui crée le profil. */
export const comptes = new Map();   // jeton d'accès -> compte
export const parEmail = new Map();  // email -> compte
let seq = 0;
function nouveauCompte(email, metadata = {}) {
  const c = { id: 'auth-' + (++seq), email, motDePasse: null, user_metadata: metadata };
  parEmail.set(email, c);
  // Ce que fait handle_new_user() en base : un profil par compte, cure 'user'.
  tables.profiles.push({
    id: c.id, email, name: metadata.name || 'Utilisateur', role: 'user',
    subscription_tier: 'user', parcours_statut: 'actif', parcours_debloque_manuel: 0,
    created_at: new Date().toISOString(),
  });
  return c;
}
function ouvrirSession(compte) {
  const acces = 'acc-' + compte.id + '-' + (++seq);
  comptes.set(acces, compte);
  return { access_token: acces, refresh_token: 'ref-' + compte.id, expires_in: 3600, user: compte };
}
if (BANC_UI) {
  const demo = nouveauCompte('demo@nutrition.com', { name: 'Utilisateur Démo' });
  Object.assign(tables.profiles.find((x) => x.id === demo.id), { role: 'admin', subscription_tier: '3_month' });
  comptes.set(JETON_DEMO, demo);
  // Deux clientes pour peupler l'onglet Clientes.
  for (const [email, name, tier] of [['marie@exemple.fr', 'Marie Dupont', '3_month'], ['lea@exemple.fr', 'Léa Martin', '6_month']]) {
    const c = nouveauCompte(email, { name });
    tables.profiles.find((x) => x.id === c.id).subscription_tier = tier;
  }
}

/** Ce que fait supabase-js dans le navigateur : ouvrir une session pour un compte. */
export function connecter(email) {
  const c = parEmail.get(email);
  if (!c) throw new Error('compte inconnu ' + email);
  return ouvrirSession(c).access_token;
}

/* ------------------------------------- PostgREST minimal simulé --- */
function filtrer(lignes, params) {
  let out = [...lignes];
  for (const [cle, val] of params) {
    if (['select', 'order', 'limit', 'on_conflict', 'offset'].includes(cle)) continue;
    const [op, ...reste] = val.split('.');
    const v = decodeURIComponent(reste.join('.'));
    out = out.filter((l) => {
      const c = l[cle];
      if (op === 'eq') return String(c) === v || (v === 'true' && c === true) || (v === 'false' && c === false);
      if (op === 'gte') return String(c) >= v;
      if (op === 'lte') return String(c) <= v;
      if (op === 'in') return v.replace(/^\(|\)$/g, '').split(',').includes(String(c));
      if (op === 'ilike') return String(c ?? '').toLowerCase() === v.replace(/[%*]/g, '').toLowerCase();
      if (op === 'is') return v === 'null' ? c == null : String(c) === v;
      if (op === 'not' && reste[0] === 'is') return reste[1] === 'null' ? c != null : String(c) !== reste[1];
      return true;
    });
  }
  const ordre = params.get('order');
  if (ordre) {
    const criteres = ordre.split(',').map((o) => o.split('.'));
    out.sort((a, b) => {
      for (const [col, sens] of criteres) {
        const x = a[col], y = b[col];
        if (x === y) continue;
        return ((x > y ? 1 : -1)) * (sens === 'desc' ? -1 : 1);
      }
      return 0;
    });
  }
  const limite = params.get('limit');
  return limite ? out.slice(0, Number(limite)) : out;
}

/** Ajoute les relations demandées dans select=..., version simplifiée. */
function embarquer(table, lignes, select) {
  if (!select) return lignes;
  return lignes.map((l) => {
    const copie = { ...l };
    if (table === 'profiles') {
      if (select.includes('parcours_progression(')) {
        copie.parcours_progression = tables.parcours_progression.filter((p) => p.user_id === l.id);
      }
      if (select.includes('parcours_appareils(')) {
        copie.parcours_appareils = tables.parcours_appareils.filter((a) => a.user_id === l.id);
      }
    }
    return copie;
  });
}

function repondre(donnees, statut = 200) {
  if (statut === 204) return new Response(null, { status: 204 });
  return new Response(JSON.stringify(donnees), {
    status: statut, headers: { 'Content-Type': 'application/json' },
  });
}

// Postgres applique les DEFAULT des colonnes ; on les reproduit ici.
const DEFAUTS = {
  profiles: { role: 'user', subscription_tier: 'user', parcours_statut: 'actif', parcours_debloque_manuel: 0 },
  parcours_progression: { couverture: '', position_sec: 0, taux: 0, terminee: false },
  podcasts: { actif: true, duration: 0, fichier: null, access_tiers: ['all'], display_order: 0, fiches: {} },
  parcours_appareils: { derniere_vue: new Date().toISOString() },
};

const vraiFetch = globalThis.fetch;
globalThis.fetch = async (url, options = {}) => {
  const u = String(url);
  if (u === RELAIS) {
    const corps = JSON.parse(options.body);
    journal.relais.push({ ...corps, code: options.headers['x-mbp-code'] });
    if (options.headers['x-mbp-code'] !== 'code-podcast-test') return repondre({ erreur: 'code-invalide' }, 401);
    if (corps.action === 'creer') {
      if (corps.email === 'refus@exemple.fr') return repondre({ erreur: 'parcours-inconnu' }, 400);
      if (clientesRelais.has(corps.email) && !corps.motDePasse) return repondre({ erreur: 'email-deja-utilise' }, 409);
      if (!clientesRelais.has(corps.email)) clientesRelais.set(corps.email, 'mp-' + clientesRelais.size);
      return repondre({ ok: true, cliente: { id: clientesRelais.get(corps.email) }, invitation: { motDePasseDefini: !!corps.motDePasse } });
    }
    if (corps.action === 'liste') return repondre({ ok: true, clientes: [...clientesRelais].map(([email, id]) => ({ id, email })) });
    if (corps.action === 'exporter') {
      if (options.headers['x-export-code'] !== 'export-test') return repondre({ erreur: 'code-export-invalide' }, 401);
      return repondre({ ok: true, ...EXPORT });
    }
    if (corps.action === 'renvoyer-invitation') return repondre({ ok: true });
    return repondre({ erreur: 'action-inconnue' }, 400);
  }
  if (u.startsWith(V2)) {
    if (options.headers?.apikey !== 'cle-v2-test') return repondre({ message: 'clé V2 invalide' }, 401);
    const [chemin, requete = ''] = u.slice(V2.length).replace('/rest/v1/', '').split('?');
    if (!tablesV2[chemin]) return repondre({ message: 'table V2 inconnue ' + chemin }, 404);
    journal.v2.push(chemin);
    return repondre(filtrer(tablesV2[chemin], new URLSearchParams(requete)));
  }
  if (!u.startsWith(FAUX)) return vraiFetch(url, options);
  const apres = u.slice(FAUX.length);

  /* ---- Supabase Auth ---- */
  if (apres.startsWith('/auth/v1/')) {
    const corps = options.body ? JSON.parse(options.body) : {};
    const jeton = (options.headers?.Authorization || '').replace('Bearer ', '');
    const chemin = apres.split('?')[0];

    if (chemin === '/auth/v1/user' && (options.method || 'GET') === 'GET') {
      const c = comptes.get(jeton);
      return c ? repondre(c) : repondre({ msg: 'invalid token' }, 401);
    }
    if (chemin === '/auth/v1/invite') {
      if (parEmail.has(corps.email)) {
        return repondre({ msg: 'A user with this email address has already been registered' }, 422);
      }
      const c = nouveauCompte(corps.email, corps.data || {});
      journal.emails.push({ type: 'invite', email: corps.email });
      return repondre(c);
    }
    if (chemin === '/auth/v1/admin/users' && options.method === 'POST') {
      if (parEmail.has(corps.email)) {
        return repondre({ msg: 'A user with this email address has already been registered' }, 422);
      }
      if (!corps.password_hash && (corps.password || '').length < 8) return repondre({ msg: 'weak password' }, 422);
      const c = nouveauCompte(corps.email, corps.user_metadata || {});
      c.motDePasse = corps.password || null;
      c.hachage = corps.password_hash || null;
      journal.emails.push({ type: 'creation-directe', email: corps.email });
      return repondre(c);
    }
    if (chemin.startsWith('/auth/v1/admin/users/') && options.method === 'PUT') {
      const id = chemin.split('/').pop();
      const c = [...parEmail.values()].find((x) => x.id === id);
      if (!c) return repondre({ msg: 'not found' }, 404);
      c.motDePasse = corps.password;
      return repondre(c);
    }
    if (chemin === '/auth/v1/recover') {
      if (parEmail.has(corps.email)) journal.emails.push({ type: 'recovery', email: corps.email });
      return repondre({});
    }
    return repondre({ msg: 'auth non simulé : ' + chemin }, 404);
  }

  /* ---- Storage ---- */
  if (apres.startsWith('/storage/v1/object/sign/')) {
    const chemin = apres.replace('/storage/v1/object/sign/parcours-audio/', '');
    journal.signatures.push(chemin);
    return repondre({ signedURL: `/object/sign/parcours-audio/${chemin}?token=faux` });
  }
  if (apres === '/storage/v1/object/copy') {
    const corps = JSON.parse(options.body);
    journal.copies.push(corps);
    if (corps.sourceKey.includes('absent')) return repondre({ message: 'Object not found' }, 404);
    return repondre({ Key: `${corps.destinationBucket}/${corps.destinationKey}` });
  }
  if (apres.startsWith('/storage/v1/object/upload/sign/')) {
    const chemin = apres.replace('/storage/v1/object/upload/sign/parcours-audio/', '');
    return repondre({ url: `/object/upload/sign/parcours-audio/${chemin}?token=faux` });
  }

  /* ---- REST ---- */
  const [chemin, requete = ''] = apres.replace('/rest/v1/', '').split('?');
  const table = chemin;
  const params = new URLSearchParams(requete);
  if (!tables[table]) return repondre({ message: 'table inconnue ' + table }, 404);
  const methode = (options.method || 'GET').toUpperCase();
  const corps = options.body ? JSON.parse(options.body) : null;

  if (methode === 'GET') {
    return repondre(embarquer(table, filtrer(tables[table], params), params.get('select')));
  }
  if (methode === 'POST') {
    const entrees = Array.isArray(corps) ? corps : [corps];
    const prefer = options.headers?.Prefer || '';
    const creees = entrees.map((e) => {
      const ligne = { id: e.id || randomUUID(), created_at: new Date().toISOString(), ...(DEFAUTS[table] || {}), ...e };
      if (prefer.includes('merge-duplicates')) {
        const cles = (params.get('on_conflict') || '').split(',').filter(Boolean);
        const idx = tables[table].findIndex((l) => cles.every((k) => String(l[k]) === String(e[k])));
        if (idx >= 0) { tables[table][idx] = { ...tables[table][idx], ...e }; return tables[table][idx]; }
      }
      tables[table].push(ligne);
      return ligne;
    });
    return repondre(creees, 201);
  }
  if (methode === 'PATCH') {
    const cibles = filtrer(tables[table], params);
    cibles.forEach((l) => Object.assign(l, corps));
    return repondre(cibles);
  }
  if (methode === 'DELETE') {
    const cibles = new Set(filtrer(tables[table], params));
    tables[table] = tables[table].filter((l) => !cibles.has(l));
    return repondre(null, 204);
  }
  return repondre({ message: 'méthode non gérée' }, 400);
};

/* ------------------------------------------- serveur de test --- */
const FONCTIONS = {};
for (const nom of ['parcours', 'audio', 'progression', 'admin-parcours', 'profil']) {
  FONCTIONS[nom] = (await import(`${RACINE}/netlify/functions/${nom}.js`)).default;
}
// Les notifications : on note ce qui partirait, sans rien envoyer.
const { definirTransportPush } = await import(`${RACINE}/netlify/lib/parcours-core.js`);
definirTransportPush(async (abonnements, message) => {
  journal.pushs.push({ ...message, endpoints: abonnements.map((a) => a.endpoint) });
  const expiredEndpoints = abonnements.filter((a) => a.endpoint.includes('perime')).map((a) => a.endpoint);
  return { sent: abonnements.length - expiredEndpoints.length, failed: expiredEndpoints.length, expiredEndpoints };
});

/** Un son de test : 60 s de tonalité douce, en WAV 8 kHz mono, généré ici. */
function sonDeTest(secondes = 60) {
  const freq = 8000, n = freq * secondes;
  const donnees = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const t = i / freq;
    const v = Math.sin(2 * Math.PI * 220 * t) * 0.15 * (0.6 + 0.4 * Math.sin(2 * Math.PI * 0.5 * t));
    donnees.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const entete = Buffer.alloc(44);
  entete.write('RIFF', 0); entete.writeUInt32LE(36 + donnees.length, 4); entete.write('WAVE', 8);
  entete.write('fmt ', 12); entete.writeUInt32LE(16, 16); entete.writeUInt16LE(1, 20); entete.writeUInt16LE(1, 22);
  entete.writeUInt32LE(freq, 24); entete.writeUInt32LE(freq * 2, 28); entete.writeUInt16LE(2, 32); entete.writeUInt16LE(16, 34);
  entete.write('data', 36); entete.writeUInt32LE(donnees.length, 40);
  return Buffer.concat([entete, donnees]);
}
const SON = BANC_UI ? sonDeTest() : null;
if (BANC_UI) for (const p of tables.podcasts) p.duration = 60;   // la durée du son de test

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  // Dépôt depuis l'admin en mode UI : on accepte le fichier et on l'oublie.
  if (BANC_UI && req.method === 'PUT' && url.pathname.startsWith('/storage/v1/object/upload/sign/')) {
    for await (const _ of req) { /* on vide le flux */ }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end('{"Key":"parcours-audio/test"}');
  }
  if (BANC_UI && req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'PUT, POST, GET', 'Access-Control-Allow-Headers': 'content-type, x-upsert' });
    return res.end();
  }
  if (SON && url.pathname.startsWith('/storage/v1/object/sign/')) {
    res.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': SON.length, 'Accept-Ranges': 'bytes', 'Access-Control-Allow-Origin': '*' });
    return res.end(SON);
  }
  const nom = url.pathname.replace(/^\/api\//, '');
  const fn = FONCTIONS[nom];
  if (!fn) { res.writeHead(404); return res.end('route inconnue'); }

  const morceaux = [];
  for await (const m of req) morceaux.push(m);
  if (BANC_UI && !req.headers.authorization) req.headers.authorization = `Bearer ${JETON_DEMO}`;
  const requete = new Request(`http://localhost:${PORT}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: morceaux.length ? Buffer.concat(morceaux) : undefined,
  });
  const reponse = await fn(requete);
  res.writeHead(reponse.status, Object.fromEntries(reponse.headers));
  res.end(Buffer.from(await reponse.arrayBuffer()));
}).listen(PORT, () => console.log('banc prêt sur ' + PORT));
