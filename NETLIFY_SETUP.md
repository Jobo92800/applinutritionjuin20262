# Configuration Netlify - MAbeautyplus Nutrition

## Variables d'environnement requises

Pour que votre application fonctionne correctement sur Netlify, vous devez configurer les variables d'environnement suivantes:

### 1. Accéder aux paramètres Netlify

1. Connectez-vous à votre dashboard Netlify: https://app.netlify.com
2. Sélectionnez votre site: `lucent-raindrop-9eee05` (ou `applinutrition`)
3. Allez dans **Site settings** > **Build & deploy** > **Environment**
4. Cliquez sur **"Add environment variable"**

### 2. Ajouter les variables

Ajoutez ces deux variables d'environnement:

**Variable 1:**
- **Key:** `VITE_SUPABASE_URL`
- **Value:** `https://epokhtkwibgabwvobusl.supabase.co`

**Variable 2:**
- **Key:** `VITE_SUPABASE_ANON_KEY`
- **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwb2todGt3aWJnYWJ3dm9idXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0ODEwMzAsImV4cCI6MjA2NTA1NzAzMH0.uVavLEF-sfl1QYvspfsQ6F3ciZZg6b9ORi-E6t5Xf84`

### 3. Redéployer le site

Après avoir ajouté les variables:

1. Allez dans **Deploys**
2. Cliquez sur **"Trigger deploy"**
3. Sélectionnez **"Clear cache and deploy site"**

Le déploiement prendra environ 2-3 minutes.

## Fichiers de configuration créés

Les fichiers suivants ont été créés pour assurer le bon fonctionnement sur Netlify:

### `netlify.toml`
- Configuration du build (commande: `npm run build`)
- Dossier de publication: `dist`
- Redirections pour le routing React (SPA)
- Headers de sécurité

### `public/_redirects`
- Redirection de toutes les routes vers `index.html`
- Permet le routing côté client de React

## Mode démo

Votre application inclut un mode démo qui fonctionne même sans connexion à Supabase:

**Identifiants admin:**
- Email: `admin@nutrition.com`
- Mot de passe: `admin123`

**Identifiants utilisateur:**
- Email: `user@nutrition.com`
- Mot de passe: `user123`

## Vérification post-déploiement

Après le déploiement, vérifiez:

1. ✅ La page de login s'affiche correctement
2. ✅ Vous pouvez vous connecter avec les identifiants demo
3. ✅ La navigation entre les pages fonctionne
4. ✅ Pas d'erreurs dans la console du navigateur (F12)

## Résolution de problèmes

### Écran blanc après déploiement

1. Vérifiez que les variables d'environnement sont bien configurées
2. Ouvrez la console du navigateur (F12) et cherchez des erreurs
3. Vérifiez les logs de build sur Netlify

### Erreur 404 sur les routes

- Le fichier `netlify.toml` gère automatiquement les redirections
- Si le problème persiste, vérifiez que le fichier est bien présent à la racine du projet

### Build échoue sur Netlify

- Vérifiez que Node.js version 18 est utilisée (configuré dans `netlify.toml`)
- Assurez-vous que toutes les dépendances sont dans `package.json`
- Consultez les logs de build pour voir l'erreur exacte

## Support

Si vous rencontrez des problèmes:
1. Vérifiez les logs de build sur Netlify
2. Consultez la console du navigateur (F12)
3. Vérifiez que les variables d'environnement sont correctement définies
