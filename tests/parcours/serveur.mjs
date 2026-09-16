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
};

const podcast = (id, title, tiers, ordre, extra = {}) => ({
  id, title, description: 'desc ' + title, key_points: [], week_challenges: [],
  support_pdf_url: null, cta_button: null, cta_button2: null, thumbnail: null,
  access_tiers: tiers, display_order: ordre, duration: 900, fichier: `${tiers[0]}/${id}.mp3`,
  actif: true, created_at: new Date(2026, 0, ordre).toISOString(), ...extra,
});
tables.podcasts.push(
  podcast('p1', 'Introduction',      ['3_month', '6_month'], 1),
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

export const journal = { emails: [], signatures: [], copies: [], relais: [] };
/* Un « Mon Parcours » simulé pour le relais de transition. */
const RELAIS = 'http://fauxmonparcours.local/api/admin';
process.env.MON_PARCOURS_API_URL = RELAIS;
process.env.MON_PARCOURS_ADMIN_CODE = 'code-podcast-test';
const clientesRelais = new Map();   // email -> id

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
  podcasts: { actif: true, duration: 0, fichier: null, access_tiers: ['all'], display_order: 0 },
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
    if (corps.action === 'renvoyer-invitation') return repondre({ ok: true });
    return repondre({ erreur: 'action-inconnue' }, 400);
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
      if ((corps.password || '').length < 8) return repondre({ msg: 'weak password' }, 422);
      const c = nouveauCompte(corps.email, corps.user_metadata || {});
      c.motDePasse = corps.password;
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
for (const nom of ['parcours', 'audio', 'progression', 'admin-parcours']) {
  FONCTIONS[nom] = (await import(`${RACINE}/netlify/functions/${nom}.js`)).default;
}

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
  res.end(await reponse.text());
}).listen(PORT, () => console.log('banc prêt sur ' + PORT));
