# MAbeautyplus Nutrition — mémoire du projet

Ce fichier est lu au début de chaque session. Il porte les décisions et les
conventions qui ne se déduisent pas du code. **Le tenir à jour à chaque
changement de cap.**

---

## Ce qu'on construit

**L'application des clientes MAbeautyplus**, celle qu'elles ouvrent chez elles
entre deux rendez-vous : recettes, planning des repas, liste de courses, suivi du
poids, badges, messages au centre, notifications… et le **parcours audio de
leur cure**.

Depuis le 11 septembre 2026, ce dépôt absorbe l'application « Mon Parcours »
(`Jobo92800/Applipodcast`) : le parcours audio à déblocage séquentiel y entre,
et remplace les podcasts en accès libre qui existaient ici. À terme, **une
cliente = un compte = une adresse.**

**Interlocuteur : Jonathan, non développeur.** Expliquer en français, sans
jargon, et donner les manipulations pas à pas avec les endroits exacts où
cliquer. Ne jamais supposer qu'une étape technique est évidente.

**Rien ne part sans sa demande explicite** : ni `git push`, ni déploiement
Netlify, ni exécution SQL sur Supabase. On travaille en local, on commit sur la
branche, et on dit « prêt à pousser ».

---

## Les quatre applications MAbeautyplus

| | Rôle | Dépôt | Supabase | Site |
|---|---|---|---|---|
| Ancienne app | legacy, encore en service, ne rien casser | `MABEAUTYPLUS` | Bolt + Firebase | — |
| **V2 thérapeute** | fiches clientes, BioPortrait, contrats, stock, Airtable | `Th-rapeute-Appli-2026` (`~/Desktop/mabeautyplus-v2`, son `CLAUDE.md` fait foi) | `kefvxglmybbbcdcautcm` | pas encore aux thérapeutes |
| **Nutrition (ce dépôt)** | l'app des clientes | `applinutritionjuin20262` | `epokhtkwibgabwvobusl` | applinutrition.netlify.app |
| Mon Parcours | parcours audio, **en service avec de vraies clientes** | `Applipodcast` (`~/Downloads/files (8)/Applipodcast`) | `oiolujqwdcbhvlyqkyyg` | applipodcast.netlify.app → parcours.mabeautyplus.fr |

Le seul lien qui existe : **la V2 crée le compte Mon Parcours** d'une cliente à
la signature du contrat (`PODCAST_API_URL` + `PODCAST_ADMIN_CODE` → action
`creer` de l'API admin), avec la cure choisie par la thérapeute. Une fois la
fusion faite, ce lien pointera ici.

---

## Décisions prises (ne pas les rouvrir sans raison)

| Sujet | Décision |
|---|---|
| Sens de la fusion | **Le parcours entre dans ce dépôt** (React), pas l'inverse. Mon Parcours disparaît en tant qu'app séparée quand la bascule est faite. La V2 reste séparée. |
| Cures | **Deux seulement : 3 mois et 6 mois.** La cure 1 mois n'a jamais servi côté V2, on l'abandonne. Les codes `3_month` / `6_month` de `subscription_tier` restent tels quels. |
| Table des étapes | **On réutilise `podcasts`**, pas de table `etapes` à côté. Elle est plus riche (description, points clés, défis, PDF, boutons) et a déjà son formulaire d'admin. `display_order` joue le rôle du numéro, `access_tiers` celui de la cure. |
| Fichiers audio | **Bucket privé**, adresses signées 2 h, jamais d'adresse permanente. Le bucket `podcast-audio` actuel est public : il sera abandonné. Pas de bouton « télécharger ». |
| Déblocage | **Le serveur décide.** Le navigateur envoie les secondes traversées (bitset), le serveur compte, seuil 90 %. **Avancer compte comme écouté** (décision du 15/09/2026 : souplesse plutôt que contrôle), reculer ne décoche rien. La validation à 90 % ne coupe jamais l'épisode : la célébration attend la fin. |
| Appareils | 4 par cliente ; au-delà, le plus ancien laisse sa place. Jamais de blocage. |
| Base | Tout dans le Supabase nutrition `epokhtkwibgabwvobusl`. Il n'a que **quelques testeuses** : on peut restructurer sans rattrapage de données. |
| Comptes | Supabase Auth email + mot de passe. Créés par le centre (V2 ou onglet Clientes). **L'inscription libre reste possible mais invisible** (décision du 16/09/2026) : `register()` reste dans `AuthContext`, « Allow new users to sign up » reste activé dans Supabase — un futur système d'abonnement remettra le bouton derrière un paiement. Ne pas « corriger ». L'ancien écran d'inscription est dans l'historique (commit `dd64d7b`). |
| Branche | Tout le chantier vit sur la branche **`parcours`**. `main` reste ce qui est en ligne. |
| Vocabulaire | Devant la cliente : « parcours », « étapes », « votre accompagnement ». Le mot « podcast » reste dans le code et l'admin. |

---

## Charte graphique

Celle de l'application thérapeute (V2), reprise à l'identique le 16 septembre
2026 : **teal** (`#3BBFBF`) pour l'interface, **magenta** (`#E8318A`) réservé
aux gestes qui engagent — commencer, valider, ouvrir un accès. Typographie
**Poppins** (chargée dans `index.html`), titres en maigre avec le mot important
en gras. Coins généreux, boutons en pilule, fond blanc lavé d'un halo de teal
(`src/index.css`). Le logo recadré est dans `public/logo.svg`, copié de la V2.

**Comment ça tient sans avoir réécrit trente écrans :** l'application avait
été écrite avec les palettes par défaut de Tailwind. `tailwind.config.js`
**redéfinit ces noms** — `green`, `blue`, `indigo`, `cyan`, `emerald`
deviennent le teal ; `purple`, `pink`, `orange`, `violet` le magenta ; `gray`
l'ardoise ; `yellow` aussi devient teal pâle (Jonathan ne veut pas de jaune).
Un `bg-green-600` écrit en 2025 est donc teal aujourd'hui. `red` reste aux
erreurs et suppressions, adouci vers le rosé ; `amber` aux avertissements.
**Pastel plutôt que plein** : les grandes surfaces (barres d'action, rubriques)
sont en teinte `-100` avec texte `-800`, jamais en `-600` plein — seul le geste
qui engage a droit au magenta plein. Pour un nouvel écran, préférer les vrais noms — `marine`,
`rose`, `ardoise` — comme dans la V2.

---

## Conventions de code

Héritées de ce qui existe — le dépôt a été généré avec Bolt puis repris à la main.

- **Identifiants en anglais** (`loadPodcasts`, `updatePodcastOrder`), **textes,
  commentaires et messages d'erreur en français.**
- React 18 + TypeScript strict, Vite 5, Tailwind 3 avec la palette de marque
  (voir Charte graphique), icônes `lucide-react`.
- Deux contextes et c'est tout : `AuthContext` (session, profil, rôle) et
  `DataContext` (toutes les données, 1 800 lignes — ne pas en créer un troisième
  sans raison, mais ne pas y entasser le parcours non plus : voir Architecture).
- Un composant = un fichier dans `src/components/`, nommé en PascalCase.
- Les types de données vivent dans `src/types/index.ts`, les types Supabase
  générés dans `src/lib/supabase.ts`.
- Les migrations SQL sont dans `supabase/migrations/`, nommées
  `AAAAMMJJHHMMSS_description.sql`. Les fichiers `MIGRATION_*.sql` à la racine
  sont des restes de Bolt, à ne pas prendre pour référence.
- `npm run build` fait `tsc --noEmit` puis `vite build` : **un build qui passe
  est le minimum avant tout commit.**

---

## Architecture

**Le navigateur parle directement à Supabase** avec la clé publique et les
règles RLS. C'est le modèle d'origine, il reste valable pour les recettes, les
repas, le poids, etc.

**Le parcours, lui, exige un serveur** : décider qu'une étape est débloquée,
signer l'adresse d'un fichier privé, compter les secondes écoutées — rien de
tout ça ne peut être confié au navigateur. D'où des fonctions Netlify
(`netlify/functions/`), qui seules détiennent la clé secrète. Il en existe déjà
deux pour les notifications push (`send-push`, `scheduled-push`, logique
partagée dans `netlify/lib/push-core.js`).

Le parcours s'organise ainsi :

```
netlify/lib/parcours-core.js     accès Supabase avec la clé secrète, couverture
                                 d'écoute, appareils, adresses signées
netlify/functions/parcours.js    POST /api/parcours     état du parcours de la cliente
netlify/functions/audio.js       POST /api/audio        adresse signée d'une étape débloquée
netlify/functions/progression.js POST /api/progression  secondes écoutées → validation
netlify/functions/admin-parcours.js  POST /api/admin-parcours   ce que la V2 appelle
src/components/Parcours*.tsx     les écrans cliente
```

L'identification des appels : le navigateur envoie son jeton Supabase
(`Authorization: Bearer`), le serveur le vérifie auprès de l'API Auth. Pas de
session parallèle.

**Dépendance :** les fonctions Netlify appellent l'API REST de Supabase
directement (`fetch`), pas `@supabase/supabase-js` — son client temps réel
exige des WebSockets natifs, absents de l'environnement Node de Netlify.

---

## Le chantier « parcours »

État au 16 septembre 2026 — **phases 0 à 3 faites. Reste la phase 4, la bascule, avec Jonathan.**

| Phase | Contenu | État |
|---|---|---|
| 0 | Branche `parcours`, ce fichier, vérifier que l'app tourne en local | fait — sauf le serveur local, bloqué par une permission macOS (voir Pièges) |
| 1 | Migration SQL : `fichier` et `actif` sur `podcasts` (`duration` sert déjà de durée réelle), tables `progression` / `appareils` / `acces_log`, bucket privé, RLS | **écrite** (`20260911000000_parcours_audio.sql`, syntaxe vérifiée), **à passer par Jonathan** dans l'éditeur SQL avant les tests de la phase 3 |
| 2 | Fonctions Netlify + API admin pour la V2 + banc d'essai porté | **fait** — `parcours-core.js`, 4 fonctions, 4 routes dans `netlify.toml`, 56 contrôles (`npm run test:parcours`). Jamais exécuté contre la vraie base : ça viendra avec la phase 3 |
| 3a | Comptes : inscription libre fermée (`LoginForm`), onglet **Clientes** de l'admin (`ClientesPanel`, via `src/lib/parcoursApi.ts`), l'API admin accepte le jeton d'un profil `role = 'admin'` en plus du code | **fait** — l'inscription libre est volontairement laissée possible côté Supabase (voir Décisions) |
| 3b | Écrans cliente : frise du parcours, lecteur avec comptage, reprise | **fait** — `Parcours.tsx`, `ParcoursLecteur.tsx`, `lib/parcoursEcoute.ts` ; `PodcastList` / `PodcastModal` supprimés ; l'entrée de menu s'appelle « Mon parcours ». Vérifié de bout en bout sur le banc UI (lecture, sauts, validation sans coupure, célébration à la fin, enchaînement) |
| 3c | Dépôt des MP3 dans le bucket privé depuis `PodcastFormModal` | **fait** — adresse d'envoi signée par le serveur, durée lue dans le fichier, plus de champ URL ; « Écouter » (adresse signée 1 h) remplace « Télécharger » dans la liste d'admin ; la cure 1 mois n'est plus proposée. `audio_url` devient facultatif dans la migration |
| 4 | Bascule, **avec Jonathan, étape par étape** | **4a fait** : migration SQL passée sur `epokht…` le 16/09 (32 podcasts, bucket privé créé). **4b prêt** : action `migrer-audio` + bandeau « Rapatrier dans le bucket privé » dans l'admin (copie serveur depuis l'ancien bucket public, un clic, ré-exécutable). Faits le 16/09 : déploiement de branche (`parcours--applinutritonjuin2026.netlify.app`), `ADMIN_CODE` posé, rapatriement des 32 audios, V2 repointée sur la branche avec le relais de transition, charte graphique. **Prêt** : import des clientes de Mon Parcours (voir ci-dessous). **16/09 soir : fusionné dans `main`, en production** (`3d2fa0c`), 39 clientes importées. Restent pour le jour J : V2 `PODCAST_API_URL` → production, relancer l'import, rediriger `parcours.mabeautyplus.fr`, retirer relais + `EXPORT_CODE` + fonction SQL, rendre privé ou vider l'ancien bucket `podcast-audio` |

**Procédure d'import des clientes de Mon Parcours** (une fois, avec Jonathan) :
1. Mon Parcours : passer `supabase/migrations/20260916_export_hachages.sql` dans son
   Supabase (`oioluj…`), poser `EXPORT_CODE` (phrase longue) dans Netlify
   *applipodcast*, déployer le commit qui porte l'action `exporter`.
2. Nutrition : poser `MON_PARCOURS_EXPORT_CODE` (la même phrase) dans Netlify,
   reconstruire la branche.
3. Administration → Clientes → **« Importer depuis Mon Parcours »**. Ré-exécutable.
   Les comptes gardent leur mot de passe (hachage transféré), la progression est
   recopiée par cure et numéro d'étape. Les cures A et les comptes jamais activés
   sont ignorés et listés.
4. Refermer : retirer `EXPORT_CODE` des deux côtés, `drop function export_hachages()`.

Ce qui existe déjà ici et sert de socle : la table `podcasts` et son admin
(`PodcastList`, `PodcastFormModal`, `PodcastModal` — 1 800 lignes), le
`subscription_tier` sur `profiles`, Supabase Auth, la PWA.

Ce qui vient de Mon Parcours : la logique serveur est portée (phase 2). Reste
à porter pour la phase 3 la logique du lecteur d'`index.html` : bitset des
secondes écoutées, envoi toutes les 30 s et à la fermeture (`sendBeacon` avec
le jeton dans le corps), intention de lecture iOS, empreinte d'appareil retenue
dans `localStorage`.

**Contrat de l'API cliente** (les trois routes, `Authorization: Bearer <jeton Supabase>`) :
`POST /api/parcours { appareil }` → `{ cliente, etapes[], total, terminees, disponible, seuil }` ;
`POST /api/audio { numero, appareil }` → `{ url, expireDans, dureeSec }` ;
`POST /api/progression { numero, appareil, couverture, position, duree, acces? }` → `{ taux, terminee }`.
Les étapes verrouillées n'ont que `numero`, `terminee`, `accessible`.

---

## Pièges rencontrés

Tous vérifiés en production sur Mon Parcours. Ne pas les redécouvrir.

- **La clé `sb_secret_…` n'est pas un JWT.** L'API Storage exige l'en-tête
  `apikey` en plus de `Authorization: Bearer`, sinon « Invalid Compact JWS ».
  L'API REST, elle, tolère l'absence. Envoyer toujours les deux.
- **`/storage/v1/object/upload/sign` refuse tout corps de requête.** Le
  remplacement se demande par l'en-tête `x-upsert: true`, corps `{}`. Un
  `{ upsert: true }` dans le corps vaut un 400.
- **iOS ignore `preload`.** Rien n'est chargé avant un geste ; le premier
  `play()` est rejeté. Mémoriser l'intention et relancer sur `canplay`. Et un
  `currentTime = …` (reprise de position) interrompt une lecture en cours : la
  relancer après.
- **Chrome émet `timeupdate` avant `seeked`.** Un marqueur qui se cale sur la
  position à chaque `timeupdate` ne voit donc jamais le saut au moment de
  `seeked`. Détecter un saut par la distance parcourue (`s > dernière + 1`),
  pas par l'événement. Corrigé dans le lecteur React ; à corriger aussi dans
  Mon Parcours.
- **Un effet React dont le nettoyage coupe le son doit avoir `[]` en
  dépendances**, et lire ses callbacks via des refs. Sinon chaque changement
  d'état recrée les callbacks et rejoue le nettoyage — le lecteur se mettait en
  pause tout seul à la validation.
- **Le banc d'essai simule Supabase, il ne le remplace pas.** Il a laissé
  passer les deux bugs Storage ci-dessus parce que son serveur factice ignore
  le corps des requêtes. Toute nouvelle route Storage se vérifie en vrai.
- **`pbcopy` sans `LC_CTYPE=UTF-8` corrompt les accents** dans le presse-papier
  (« R√©int√©grer »). Et `pbpaste` refait la conversion inverse, donc la
  vérification en terminal ne voit rien. Toujours `LC_CTYPE=UTF-8 pbcopy`.
- **Le lanceur de prévisualisation de l'app Claude n'a pas accès au Bureau**
  (« getcwd: Operation not permitted »), même une fois « Claude » autorisé
  dans Fichiers et dossiers : ce sont les processus auxiliaires `claude`
  (huit entrées) qui lancent les serveurs, chacun avec sa propre permission.
  Contournement en place : **un worktree git hors du Bureau**,
  `~/.claude-worktrees/nutrition-parcours`, sur la branche `parcours` (le
  dossier du Bureau reste sur `main`). C'est là qu'on développe et qu'on
  commite ; les commits vont dans le même dépôt.
- Le service worker (`vite-plugin-pwa`, `generateSW`) précache : après un
  changement d'icône ou d'asset statique, vérifier que la version du cache
  bouge, sinon les appareils installés gardent l'ancien.

---

## Commandes

```bash
npm install                 # une fois
npm run dev                 # Vite sur le port 5173 (occupé par la V2 ? → --port 5174)
npm run build               # tsc --noEmit + vite build : le minimum avant un commit
npm run lint
npm run test:parcours       # contrôles des fonctions du parcours sur une base simulée
npm run dev:banc            # le banc en serveur (port 8124) pour faire tourner l'app en local
```

**Voir l'application tourner sans identifiants ni vraie base :** retirer `.env`
(l'app passe en mode démo, compte admin fictif), lancer `npm run dev:banc`
dans un terminal et `npm run dev` dans un autre. Vite envoie `/api` au banc,
qui traite tout appel sans jeton comme la cliente démo (admin, cure 3 mois) et
peuple l'onglet Clientes de deux fiches. Le worktree est dans cet état
(`.env` renommé `.env.hors-service`).

```bash
```

Variables (`.env`, jamais commité) : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
Les fonctions Netlify lisent en plus `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
(déjà là pour les push), `ADMIN_CODE` (posé le 16/09), `SEUIL_DEBLOCAGE` (0.9),
`APPAREILS_MAX` (4).

**E-mails (16/09/2026)** : Supabase Auth envoie par le **SMTP Brevo**
(`smtp-relay.brevo.com`, login = l'e-mail du compte Brevo, clé SMTP « Mot de
passe oublié »), expéditeur `contact@mabeautyplus.fr` — le seul expéditeur
Brevo dont le domaine est authentifié (DKIM + DMARC) ; ne jamais utiliser
l'expéditeur Gmail, il part en indésirables. Le blocage d'IP de Brevo doit
rester **désactivé pour les clés SMTP** (Supabase envoie depuis des adresses
changeantes). Modèles « Reset password » et « Invite user » en français,
Site URL et Redirect URLs sur l'adresse de production, plafond d'envoi à 30/h.
Testé : « Mot de passe oublié » arrive et fonctionne.

**Notifications du parcours (17/09/2026)** : à la validation d'une étape,
`progression.js` envoie « Étape validée 🎉 » avec le titre de la suivante
(`notifierCliente` dans `parcours-core.js`, transport `web-push` de
`push-core.js`) ; `scheduled-push` appelle `rappelsParcours()`
(`netlify/lib/parcours-rappels.js`) tous les jours à 18 h Paris : rappel aux
clientes abonnées, silencieuses depuis 7 jours, **qui ont déjà ouvert leur
parcours ici** (les importées qui écoutent encore sur Mon Parcours ne sont pas
rappelées), au plus une fois par semaine (journal `rappel-parcours`). Le
service worker n'affiche pas un push `tag: parcours` si l'app est visible.
`/?page=podcasts` ouvre directement le parcours. L'invitation à activer se
cache si la permission est refusée ou si la cliente l'a fermée
(`localStorage mbp_rappels_refuses`). Le banc remplace le transport
(`definirTransportPush`) pour vérifier ce qui partirait.

**Relais de transition** — `MON_PARCOURS_API_URL` (`https://applipodcast.netlify.app/api/admin`)
et `MON_PARCOURS_ADMIN_CODE` (le code de Mon Parcours) : tant qu'ils sont
posés, chaque compte créé ici (par la V2 ou l'onglet Clientes) est aussi créé
sur Mon Parcours avec le même mot de passe, et un renvoi d'invitation part des
deux côtés. Mon Parcours est appelé **en premier** : s'il refuse, la
thérapeute voit l'erreur (`relais-refuse`) et rien n'est créé ici. **À retirer
le jour de la bascule** : le relais disparaît de lui-même.
