/*
  Contrôles du parcours audio : node tests/parcours/run.mjs
  Aucune connexion à Supabase. Voir serveur.mjs pour ce qui est simulé.
*/
import { journal, connecter, tables, parEmail, EXPORT, PORT } from './serveur.mjs';
await new Promise((r) => setTimeout(r, 300));

const B = `http://localhost:${PORT}`;
const T = []; const p = (n, r, d = '') => { T.push([n, r, d]); };
const post = async (r, c, h = {}) => {
  const x = await fetch(B + '/api/' + r, { method: 'POST', headers: { 'Content-Type': 'application/json', ...h }, body: JSON.stringify(c) });
  return { statut: x.status, ...(await x.json().catch(() => ({}))) };
};
const ADMIN = { 'x-mbp-code': 'test-2026' };
const auth = (t) => ({ Authorization: 'Bearer ' + t });
function pack(bits) { const o = new Uint8Array(Math.ceil(bits.length / 8)); for (let i = 0; i < bits.length; i++) if (bits[i]) o[i >> 3] |= 128 >> (i & 7); return Buffer.from(o).toString('base64'); }

let r;

// --- l'API d'administration ---
r = await post('admin-parcours', { action: 'liste' });
p('admin sans code refusé', r.statut === 401);
r = await post('admin-parcours', { action: 'liste' }, { 'x-mbp-code': 'faux' });
p('admin code erroné refusé', r.statut === 401);

// --- un administrateur connecté n'a pas de code à retaper ---
r = await post('admin-parcours', { action: 'creer', prenom: 'Admin', email: 'admin@exemple.fr', parcours: 'B', motDePasse: 'motdepasse-long' }, ADMIN);
tables.profiles.find((x) => x.email === 'admin@exemple.fr').role = 'admin';
r = await post('admin-parcours', { action: 'liste' }, auth(connecter('admin@exemple.fr')));
p('jeton d\'un compte admin accepté', r.statut === 200 && Array.isArray(r.clientes));
r = await post('admin-parcours', { action: 'creer', prenom: 'Simple', email: 'simple@exemple.fr', parcours: 'B', motDePasse: 'motdepasse-long' }, ADMIN);
r = await post('admin-parcours', { action: 'liste' }, auth(connecter('simple@exemple.fr')));
p('jeton d\'un compte non admin refusé', r.statut === 401);

// --- création de compte, comme la V2 le fait à la signature ---
r = await post('admin-parcours', { action: 'creer', prenom: 'Marie', nom: 'Dupont', email: 'MARIE@Exemple.FR', parcours: 'B', motDePasse: 'motdepasse-long' }, ADMIN);
p('création avec mot de passe (code B)', r.statut === 200 && r.invitation?.motDePasseDefini === true);
const marie = tables.profiles.find((x) => x.email === 'marie@exemple.fr');
p('profil créé par le trigger, cure 3 mois', marie?.subscription_tier === '3_month' && marie?.name === 'Marie Dupont');
p('e-mail en minuscules', r.cliente?.email === 'marie@exemple.fr');

r = await post('admin-parcours', { action: 'creer', prenom: 'Léa', email: 'lea@exemple.fr', parcours: '6_month' }, ADMIN);
p('création sans mot de passe = invitation (cure 6 mois)', r.statut === 200 && r.invitation?.envoye === true && journal.emails.at(-1)?.type === 'invite');
p('profil 6 mois', tables.profiles.find((x) => x.email === 'lea@exemple.fr')?.subscription_tier === '6_month');

r = await post('admin-parcours', { action: 'creer', prenom: 'X', email: 'marie@exemple.fr', parcours: 'B' }, ADMIN);
p('e-mail déjà utilisé sans mot de passe refusé', r.statut === 409 && r.erreur === 'email-deja-utilise');
r = await post('admin-parcours', { action: 'creer', prenom: 'Marie', email: 'marie@exemple.fr', parcours: 'C', motDePasse: 'nouveau-mdp-long' }, ADMIN);
p('compte existant + mot de passe = redéfini, cure changée', r.statut === 200 && r.existante === true && marie.subscription_tier === '6_month');
await post('admin-parcours', { action: 'modifier', id: marie.id, cure: '3_month' }, ADMIN);
p('cure remise à 3 mois par le centre', marie.subscription_tier === '3_month');

r = await post('admin-parcours', { action: 'creer', prenom: 'X', email: 'x@exemple.fr', parcours: 'A' }, ADMIN);
p('cure 1 mois refusée', r.statut === 400 && r.erreur === 'parcours-inconnu');
r = await post('admin-parcours', { action: 'creer', prenom: 'X', email: 'pas-un-email', parcours: 'B' }, ADMIN);
p('e-mail invalide refusé', r.statut === 400);
r = await post('admin-parcours', { action: 'creer', prenom: 'X', email: 'y@exemple.fr', parcours: 'B', motDePasse: 'court' }, ADMIN);
p('mot de passe trop court refusé', r.statut === 400 && r.erreur === 'mot-de-passe-court');

// --- relais de transition vers Mon Parcours ---
const relaisMarie = journal.relais.find((x) => x.action === 'creer' && x.email === 'marie@exemple.fr');
p('création relayée à Mon Parcours, même mot de passe, code B', relaisMarie?.motDePasse === 'motdepasse-long' && relaisMarie?.parcours === 'B' && relaisMarie?.code === 'code-podcast-test');
r = await post('admin-parcours', { action: 'creer', prenom: 'Nina', email: 'nina@exemple.fr', parcours: 'C', motDePasse: 'motdepasse-long' }, ADMIN);
p('relais signalé dans la réponse', r.statut === 200 && r.relaye?.statut === 200 && r.relaye?.dejaLa === false);
r = await post('admin-parcours', { action: 'creer', prenom: 'Refus', email: 'refus@exemple.fr', parcours: 'B', motDePasse: 'motdepasse-long' }, ADMIN);
p('Mon Parcours refuse → la thérapeute le voit, rien n\'est créé ici', r.statut === 502 && r.erreur === 'relais-refuse' && !tables.profiles.some((x) => x.email === 'refus@exemple.fr'));
r = await post('admin-parcours', { action: 'renvoyer-invitation', id: marie.id }, ADMIN);
p('renvoi relayé à Mon Parcours', r.statut === 200 && journal.relais.some((x) => x.action === 'renvoyer-invitation'));

// --- ouverture du parcours ---
r = await post('parcours', { appareil: 'ap1' });
p('parcours sans session refusé', r.statut === 401);
r = await post('parcours', { appareil: 'ap1' }, auth('jeton-bidon'));
p('jeton invalide refusé', r.statut === 401);

const acces = connecter('marie@exemple.fr');
r = await post('parcours', { appareil: 'ap1' }, auth(acces));
p('ouverture du parcours', r.statut === 200 && r.cliente?.prenom === 'Marie Dupont' && r.cliente?.cure === 'Cure 3 mois');
p('5 étapes pour la cure 3 mois (bonus « all » inclus, 1 mois et inactive exclues)', r.total === 5);
p('1 seule accessible', r.etapes.filter((e) => e.accessible).length === 1 && r.disponible === 0);
p('titre de l\'étape 1 visible', r.etapes[0].titre === 'Introduction' && r.etapes[0].id === 'p1');
p('titres verrouillés masqués', r.etapes.slice(1).every((e) => e.titre === undefined && e.id === undefined));
p('première fois signalée', r.cliente.premiereFois === true);

// --- audio ---
r = await post('audio', { numero: 1, appareil: 'ap1' }, auth(acces));
p('URL signée étape 1', r.statut === 200 && r.url.includes('/object/sign/parcours-audio/3_month/p1.mp3') && r.dureeSec === 900);
r = await post('audio', { numero: 3, appareil: 'ap1' }, auth(acces));
p('étape 3 verrouillée', r.statut === 403 && r.erreur === 'etape-verrouillee');
p('tentative journalisée', tables.parcours_acces_log.some((l) => l.action === 'etape-verrouillee' && l.user_id === marie.id));
r = await post('audio', { numero: 9, appareil: 'ap1' }, auth(acces));
p('étape inexistante', r.statut === 404);

// --- déblocage : c'est le serveur qui compte ---
const moitie = new Array(900).fill(0); for (let i = 0; i < 450; i++) moitie[i] = 1;
r = await post('progression', { numero: 1, appareil: 'ap1', couverture: pack(moitie), position: 450, duree: 900 }, auth(acces));
p('50 % écouté, non validé', r.statut === 200 && r.taux === 0.5 && r.terminee === false);
r = await post('progression', { numero: 1, appareil: 'ap1', couverture: pack(moitie), position: 900, duree: 900, terminee: true, taux: 1 }, auth(acces));
p('« terminee » forgé ignoré', r.terminee === false);
const presque = new Array(900).fill(0); for (let i = 0; i < 801; i++) presque[i] = 1;
r = await post('progression', { numero: 1, appareil: 'ap1', couverture: pack(presque), position: 801, duree: 900 }, auth(acces));
p('89 % : toujours verrouillé', r.terminee === false);
const assez = new Array(900).fill(0); for (let i = 0; i < 815; i++) assez[i] = 1;
r = await post('progression', { numero: 1, appareil: 'ap1', couverture: pack(assez), position: 815, duree: 900 }, auth(acces));
p('90,6 % : étape validée', r.terminee === true);
r = await post('parcours', { appareil: 'ap1' }, auth(acces));
p('étape 2 débloquée', r.disponible === 1 && r.etapes[1].accessible && r.etapes[1].titre === 'Semaine 1');
p('1 étape terminée', r.terminees === 1);
p('couverture effacée après validation', r.etapes[0].couverture === '');
r = await post('progression', { numero: 1, appareil: 'ap1', couverture: pack(moitie), position: 0, duree: 900 }, auth(acces));
p('étape validée le reste (deja)', r.deja === true && r.terminee === true);

// --- reprise sur un autre appareil, envoi à la fermeture (sendBeacon) ---
const tiers = new Array(600).fill(0); for (let i = 0; i < 200; i++) tiers[i] = 1;
r = await post('progression', { acces, appareil: 'ap2', numero: 2, couverture: pack(tiers), position: 200, duree: 600 });
p('sendBeacon accepté sans en-tête', r.statut === 200 && r.taux > 0.33 && r.taux < 0.34);
r = await post('parcours', { appareil: 'ap2' }, auth(acces));
p('couverture rendue pour reprise', !!r.etapes[1].couverture && r.etapes[1].position === 200);

// --- appareils ---
for (const ap of ['ap3', 'ap4']) { r = await post('parcours', { appareil: ap }, auth(acces)); }
p('4 appareils acceptés', r.statut === 200 && tables.parcours_appareils.filter((a) => a.user_id === marie.id).length === 4);
r = await post('parcours', { appareil: 'ap5' }, auth(acces));
p('5e appareil accepté, le plus ancien libéré', r.statut === 200 && tables.parcours_appareils.filter((a) => a.user_id === marie.id).length === 4);

// --- durée inconnue : figée à la première écoute ---
const lea = connecter('lea@exemple.fr');
r = await post('parcours', { appareil: 'l1' }, auth(lea));
p('cure 6 mois : 4 étapes (p1, p2, bonus, sans durée)', r.total === 4);
// Léa valide p1, p2 et le bonus pour atteindre l'étape sans durée.
for (const [numero, d] of [[1, 900], [2, 600], [3, 300]]) {
  const tout = new Array(d).fill(1);
  await post('progression', { numero, appareil: 'l1', couverture: pack(tout), position: d, duree: d }, auth(lea));
}
r = await post('progression', { numero: 4, appareil: 'l1', couverture: pack(new Array(100).fill(1)), position: 100, duree: 20 }, auth(lea));
p('durée client aberrante ignorée', r.statut === 202 && r.note === 'duree-inconnue');
r = await post('progression', { numero: 4, appareil: 'l1', couverture: pack(new Array(100).fill(1)), position: 100, duree: 400 }, auth(lea));
p('durée figée depuis le navigateur', r.statut === 200 && tables.podcasts.find((x) => x.id === 'p8').duration === 400 && r.taux === 0.25);

// --- un compte sans cure (inscription libre) ---
r = await post('admin-parcours', { action: 'creer', prenom: 'Zoé', email: 'zoe@exemple.fr', parcours: 'B', motDePasse: 'motdepasse-long' }, ADMIN);
tables.profiles.find((x) => x.email === 'zoe@exemple.fr').subscription_tier = 'user';
r = await post('parcours', { appareil: 'z1' }, auth(connecter('zoe@exemple.fr')));
p('compte sans parcours refusé', r.statut === 403 && r.erreur === 'compte-sans-parcours');

// --- actions du centre ---
r = await post('admin-parcours', { action: 'liste' }, ADMIN);
const fiche = r.clientes.find((c) => c.email === 'marie@exemple.fr');
p('progression visible côté centre', fiche?.terminees === 1 && fiche?.total === 5 && fiche?.cureNom === 'Cure 3 mois');
p('appareils comptés', fiche?.appareils === 4 && fiche?.appareilsMax === 4);
p('les comptes sans cure ne sont pas listés', !r.clientes.some((c) => c.email === 'zoe@exemple.fr'));

r = await post('admin-parcours', { action: 'valider-etape', id: marie.id }, ADMIN);
p('validation manuelle → étape 3', r.numero === 3);
r = await post('parcours', { appareil: 'ap1' }, auth(acces));
p('étape 3 accessible sans écoute', r.etapes[2].accessible === true && r.etapes[2].titre === 'Semaine 2');

await post('admin-parcours', { action: 'modifier', id: marie.id, statut: 'suspendu' }, ADMIN);
r = await post('parcours', { appareil: 'ap1' }, auth(acces));
p('accès suspendu bloqué', r.statut === 403 && r.erreur === 'acces-suspendu');
await post('admin-parcours', { action: 'modifier', id: marie.id, statut: 'actif', reinitialiserAppareils: true }, ADMIN);
p('appareils réinitialisés', tables.parcours_appareils.filter((a) => a.user_id === marie.id).length === 0);
r = await post('parcours', { appareil: 'ap9' }, auth(acces));
p('accès rétabli', r.statut === 200);

r = await post('admin-parcours', { action: 'renvoyer-invitation', id: marie.id }, ADMIN);
p('renvoi vers un compte existant = e-mail de réinitialisation', r.statut === 200 && journal.emails.at(-1)?.type === 'recovery');

// --- ce que la V2 thérapeute lit ---
r = await post('admin-parcours', { action: 'parcours' }, ADMIN);
p('liste des étapes au format V2 (B = 3 mois, C = 6 mois)', r.statut === 200 && r.etapes.filter((e) => e.parcours_code === 'B').length === 5 && r.etapes.filter((e) => e.parcours_code === 'C').length === 4);
p('numéros et fichiers présents', r.etapes.find((e) => e.parcours_code === 'C' && e.numero === 1)?.fichier === '3_month/p1.mp3');
r = await post('admin-parcours', { action: 'liste' }, ADMIN);
p('champs V2 sur la liste (parcoursCode, compteActive, derniereActivite)', fiche && r.clientes.find((c) => c.email === 'marie@exemple.fr').parcoursCode === 'B' && r.clientes.every((c) => c.compteActive === true) && !!r.clientes.find((c) => c.email === 'marie@exemple.fr').derniereActivite);

// --- migration des clientes de Mon Parcours ---
r = await post('admin-parcours', { action: 'importer-clientes' }, ADMIN);
const anais = tables.profiles.find((x) => x.email === 'anais@exemple.fr');
p('import : comptes créés avec le hachage du mot de passe', r.statut === 200 && r.crees === 1 && parEmail.get('anais@exemple.fr')?.hachage === '$2a$10$hache-anais' && anais?.subscription_tier === '3_month');
p('import : compte déjà présent complété (Léa → cure 6 mois, suspendue, 1 étape débloquée à la main)', r.completes === 1 && tables.profiles.find((x) => x.email === 'lea@exemple.fr')?.parcours_statut === 'suspendu' && tables.profiles.find((x) => x.email === 'lea@exemple.fr')?.parcours_debloque_manuel === 1);
p('import : progression recopiée sur les bons épisodes, sans écraser l\'existant', r.progressions === 2 && tables.parcours_progression.some((x) => x.user_id === anais.id && x.podcast_id === 'p1' && x.terminee === true) && tables.parcours_progression.some((x) => x.user_id === anais.id && x.podcast_id === 'p2' && x.position_sec === 120));
p('import : cure 1 mois et compte jamais activé ignorés', r.ignores.length === 2 && r.echecs.length === 0);
r = await post('admin-parcours', { action: 'importer-clientes' }, ADMIN);
p('import relancé : rien de recréé, rien de doublé', r.crees === 0 && r.completes === 2 && r.progressions === 0);
r = await post('parcours', { appareil: 'an1' }, auth(connecter('anais@exemple.fr')));
p('Anaïs ouvre son parcours là où elle en était', r.statut === 200 && r.disponible === 1 && r.etapes[1].position === 120);
// Anaïs a continué d'écouter sur Mon Parcours : l'import relancé rattrape, sans toucher au reste.
EXPORT.progression[1] = { ...EXPORT.progression[1], position_sec: 540, taux: 0.9, terminee: true, terminee_le: '2026-09-20T10:00:00Z', updated_at: '2026-09-20T10:00:00Z' };
r = await post('admin-parcours', { action: 'importer-clientes' }, ADMIN);
p('import relancé : l\'écoute plus récente de Mon Parcours remplace l\'ancienne', r.progressions === 1 && tables.parcours_progression.find((x) => x.user_id === anais.id && x.podcast_id === 'p2')?.terminee === true);
r = await post('parcours', { appareil: 'an1' }, auth(connecter('anais@exemple.fr')));
p('Anaïs voit l\'étape 3 débloquée', r.disponible === 2);

// --- rapatriement des anciens audios ---
r = await post('admin-parcours', { action: 'migrer-audio' }, ADMIN);
p('rapatriement : 1 copié, 1 échec (fichier absent), les autres ignorés', r.copies === 1 && r.echecs.length === 1 && r.echecs[0].id === 'p10' && r.ignores === 8);
p('copie demandée vers le bucket privé', journal.copies.some((c) => c.destinationBucket === 'parcours-audio' && c.sourceKey === '1700000000-semaine.mp3'));
p('chemin privé enregistré', tables.podcasts.find((x) => x.id === 'p9').fichier === 'episodes/1700000000-semaine.mp3');
r = await post('admin-parcours', { action: 'migrer-audio' }, ADMIN);
p('relancer ne recopie rien', r.copies === 0 && r.ignores === 9);

// --- dépôt et écoute de contrôle ---
r = await post('admin-parcours', { action: 'url-envoi', chemin: '3_month/S01-1234.mp3' }, ADMIN);
p('URL d\'envoi signée', r.statut === 200 && r.url.includes('token=faux'));
r = await post('admin-parcours', { action: 'url-envoi', chemin: '../secret.env' }, ADMIN);
p('chemin d\'envoi malveillant refusé', r.statut === 400);
r = await post('admin-parcours', { action: 'etape-maj', id: 'p8', fichier: '6_month/p8-nouveau.mp3', dureeSec: 512 }, ADMIN);
const p8 = tables.podcasts.find((x) => x.id === 'p8');
p('fichier et durée rattachés', r.statut === 200 && p8.fichier === '6_month/p8-nouveau.mp3' && p8.duration === 512);
r = await post('admin-parcours', { action: 'ecouter', id: 'p8' }, ADMIN);
p('écoute de contrôle signée', r.statut === 200 && r.url.includes('p8-nouveau.mp3') && r.titre === 'Sans durée connue');
r = await post('admin-parcours', { action: 'ecouter', id: 'inexistant' }, ADMIN);
p('écoute d\'une étape inconnue refusée', r.statut === 404);
r = await post('admin-parcours', { action: 'etape-maj', id: 'p5', actif: false }, ADMIN);
r = await post('parcours', { appareil: 'ap9' }, auth(acces));
p('étape désactivée retirée du parcours', r.total === 4);

let ko = 0;
for (const [n, ok, d] of T) { if (!ok) ko++; console.log((ok ? '  OK  ' : '  KO  ') + n + (d && !ok ? ' -> ' + d : '')); }
console.log(`\n${T.length - ko} contrôle${T.length - ko > 1 ? 's' : ''} passe${T.length - ko > 1 ? 'nt' : ''}` + (ko ? `, ${ko} en échec` : ''));
process.exit(ko ? 1 : 0);
