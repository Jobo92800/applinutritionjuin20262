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

## Utilisation

**Côté utilisateur** : Mon compte → Notifications → « Activer les notifications ».
Une notification de confirmation est envoyée immédiatement.

**Côté administrateur** : Administration → onglet **Notifications**.
Le nombre d'appareils abonnés est affiché, avec un aperçu avant envoi.

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
