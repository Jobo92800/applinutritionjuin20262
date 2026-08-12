# Notifications push — mise en service (2 étapes)

Les notifications sont désormais **100 % internes** : plus aucun service tiers.
Le circuit est le suivant :

```
App (navigateur)  →  Netlify (fonction send-push)  →  Navigateurs des utilisateurs
                          ↕
                    Supabase (table push_subscriptions)
```

Deux réglages manuels sont nécessaires **une seule fois**.

---

## Étape 1 — Créer la table des abonnés (Supabase)

1. Ouvrir le SQL Editor :
   https://supabase.com/dashboard/project/epokhtkwibgabwvobusl/sql/new
2. Copier **tout** le contenu du fichier `MIGRATION_NOTIFICATIONS.sql` (à la racine du projet).
3. Coller dans l'éditeur, puis cliquer sur **Run** (ou Cmd+Enter).
4. Résultat attendu : « Success. No rows returned ».

Cela crée la table `push_subscriptions` et ses règles de sécurité :
- chaque utilisateur ne gère que ses propres abonnements ;
- seuls les comptes `admin` peuvent lire tous les abonnements (pour l'envoi groupé).

---

## Étape 2 — Ajouter la clé privée sur Netlify

La clé privée VAPID signe les envois : elle ne doit **jamais** figurer dans le code.

1. Aller sur Netlify → le site `applinutritonjuin2026`
2. **Site configuration → Environment variables → Add a variable**
3. Créer :
   - **Key** : `VAPID_PRIVATE_KEY`
   - **Value** : la clé privée (fournie séparément, elle est aussi dans le fichier
     `.env` local, qui n'est pas envoyé sur GitHub)
   - Scopes : laisser tout coché
4. Enregistrer, puis **redéployer** le site
   (Deploys → Trigger deploy → Deploy site), pour que la fonction voie la variable.

> La clé **publique** correspondante est déjà dans le code (`src/lib/webpush.ts`
> et `netlify/functions/send-push.js`) : elle est publique par nature.

---

## Étape 3 — Notifications programmées (optionnel)

Pour les envois automatiques récurrents (ex. « rappel de pesée tous les lundis »).

**3a. Créer la table** : dans le SQL Editor Supabase, exécuter le contenu de
`MIGRATION_NOTIFICATIONS_PROGRAMMEES.sql`.

**3b. Ajouter la clé de service sur Netlify** : la tâche planifiée s'exécute sans
session utilisateur, elle a donc besoin d'un accès de service.

1. Supabase → **Settings → API → Project API keys** → copier la clé **`service_role`**
2. Netlify → Environment variables → ajouter :
   - **Key** : `SUPABASE_SERVICE_ROLE_KEY`
   - **Value** : la clé `service_role`
3. Redéployer le site.

> ⚠️ La clé `service_role` contourne toutes les règles de sécurité de la base.
> Elle ne doit exister **que** dans les variables Netlify (côté serveur), jamais
> dans le code ni dans le navigateur.

La fonction `scheduled-push` s'exécute **toutes les heures**. Elle envoie les
messages dont l'heure et le jour correspondent (heure de Paris, changement
d'heure géré), et ne les envoie qu'une fois par jour.

---

## Utilisation

**Côté utilisateur** : Mon compte → Notifications → « Activer les notifications ».
Une notification de confirmation est envoyée immédiatement.

**Côté administrateur** : Administration → onglet **Notifications**.
- Envoi immédiat : nombre d'abonnés, aperçu, confirmation avant envoi.
- **Messages programmés** : créer, mettre en pause ou supprimer des envois
  automatiques (chaque jour ou un jour précis, à une heure donnée).

---

## Rappel important : iPhone

Apple impose que l'application soit **installée sur l'écran d'accueil** pour
recevoir des notifications. Un utilisateur qui ouvre seulement le site dans
Safari verra un message le lui expliquant.

Ordre à communiquer aux utilisatrices :
**1.** installer l'application → **2.** activer les notifications.

---

## Dépannage

| Symptôme | Cause probable |
|---|---|
| « La clé VAPID_PRIVATE_KEY n'est pas configurée » | Étape 2 non faite, ou site non redéployé après l'ajout |
| « Lecture des abonnés impossible » | Étape 1 non faite (table absente) |
| « Aucun abonné à notifier » | Personne n'a encore activé les notifications |
| Rien ne se passe sur iPhone | Application non installée sur l'écran d'accueil |
| Les messages programmés ne partent pas | Étape 3 non faite (table ou `SUPABASE_SERVICE_ROLE_KEY` manquante) — voir les logs de `scheduled-push` dans Netlify → Functions |
