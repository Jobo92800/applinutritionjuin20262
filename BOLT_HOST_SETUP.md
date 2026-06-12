# Configuration Bolt.host - MAbeautyplus Nutrition

## Problème identifié

Votre application fonctionne correctement sur Netlify mais reste en **mode démo** sur Bolt.host car les variables d'environnement ne sont pas configurées sur cette plateforme.

## Diagnostic

L'application détecte automatiquement l'absence des variables d'environnement Supabase et active le mode démo dans `src/lib/supabase.ts`:

```typescript
if (supabaseUrl && supabaseAnonKey) {
  console.log('Supabase configured: YES - Using production database');
} else {
  console.warn('Supabase NOT configured - Running in DEMO mode');
}
```

## Solution : Configuration des variables d'environnement sur Bolt.host

### Option 1 : Configuration via l'interface Bolt.host (Recommandé)

Si Bolt.host dispose d'une interface web pour gérer les déploiements:

1. **Accédez à votre projet sur Bolt.host**
   - URL du projet: https://appli-nutrtion-good-fi1o.bolt.host

2. **Localisez les paramètres du projet**
   - Cherchez une section "Settings", "Environment Variables", "Build Settings" ou similaire
   - Cela peut être dans un menu "Deploy Settings" ou "Configuration"

3. **Ajoutez les variables d'environnement suivantes:**

   **Variable 1:**
   - **Nom:** `VITE_SUPABASE_URL`
   - **Valeur:** `https://epokhtkwibgabwvobusl.supabase.co`

   **Variable 2:**
   - **Nom:** `VITE_SUPABASE_ANON_KEY`
   - **Valeur:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwb2todGt3aWJnYWJ3dm9idXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0ODEwMzAsImV4cCI6MjA2NTA1NzAzMH0.uVavLEF-sfl1QYvspfsQ6F3ciZZg6b9ORi-E6t5Xf84`

4. **Redéployez l'application**
   - Cherchez un bouton "Redeploy", "Deploy" ou "Rebuild"
   - Cliquez sur "Clear cache and deploy" si l'option existe

5. **Vérifiez le déploiement**
   - Ouvrez https://appli-nutrtion-good-fi1o.bolt.host
   - Ouvrez la console du navigateur (F12)
   - Vous devriez voir: `Supabase configured: YES - Using production database`

### Option 2 : Configuration via CLI Bolt (Si disponible)

Si vous déployez via le CLI de Claude Code (Bolt):

1. **Vérifiez la documentation du CLI Bolt**
   ```bash
   bolt --help
   # ou
   bolt env --help
   ```

2. **Ajoutez les variables d'environnement**
   ```bash
   bolt env:set VITE_SUPABASE_URL=https://epokhtkwibgabwvobusl.supabase.co
   bolt env:set VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwb2todGt3aWJnYWJ3dm9idXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0ODEwMzAsImV4cCI6MjA2NTA1NzAzMH0.uVavLEF-sfl1QYvspfsQ6F3ciZZg6b9ORi-E6t5Xf84
   ```

3. **Redéployez**
   ```bash
   bolt deploy
   ```

### Option 3 : Fichier de configuration Bolt (Alternative)

Si Bolt.host utilise un fichier de configuration spécifique (comme `.bolt.config.js` ou similaire), créez-le:

```javascript
// .bolt.config.js
export default {
  env: {
    VITE_SUPABASE_URL: 'https://epokhtkwibgabwvobusl.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwb2todGt3aWJnYWJ3dm9idXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0ODEwMzAsImV4cCI6MjA2NTA1NzAzMH0.uVavLEF-sfl1QYvspfsQ6F3ciZZg6b9ORi-E6t5Xf84'
  }
}
```

## Vérification post-configuration

Après avoir configuré les variables d'environnement et redéployé:

### 1. Ouvrez la console du navigateur

1. Accédez à https://appli-nutrtion-good-fi1o.bolt.host
2. Appuyez sur F12 pour ouvrir les outils de développement
3. Allez dans l'onglet "Console"

### 2. Vérifiez les logs

Vous devriez voir ces messages dans la console:

```
=== SUPABASE CONFIGURATION ===
Environment: production
VITE_SUPABASE_URL present: true
VITE_SUPABASE_ANON_KEY present: true
Supabase URL: https://epokhtkwibgabwvobusl.supabase.co
Supabase configured: YES - Using production database
Supabase client created successfully
```

### 3. Testez la connexion

1. Essayez de vous connecter avec un compte réel de votre base Supabase
2. Vérifiez que les données (recettes, podcasts) sont chargées depuis la base de données
3. Testez la création/modification de contenu

## Mode démo vs Mode production

### Mode démo (état actuel sur Bolt.host)

- Utilisateurs fictifs: `admin@nutrition.com` / `admin123`
- Données stockées uniquement dans le localStorage
- Aucune persistance entre les sessions/appareils
- Idéal pour les démonstrations et tests

### Mode production (après configuration)

- Connexion à votre base de données Supabase
- Authentification réelle des utilisateurs
- Données persistantes et synchronisées
- Accès multi-appareils

## Comparaison avec Netlify

**Sur Netlify** (fonctionne correctement):
- Variables d'environnement configurées dans: Site Settings > Build & deploy > Environment
- Les variables sont injectées automatiquement lors du build
- Le fichier `.env` local n'est pas utilisé en production

**Sur Bolt.host** (nécessite configuration):
- Les variables d'environnement doivent être configurées via l'interface ou le CLI
- Le fichier `.env` local n'est pas déployé (et ne devrait jamais l'être pour des raisons de sécurité)

## Dépannage

### Problème : Toujours en mode démo après configuration

**Solution 1 : Vider le cache**
1. Dans les paramètres de déploiement Bolt.host
2. Cherchez "Clear cache" ou "Clean build"
3. Redéployez avec un cache vide

**Solution 2 : Vérifier les logs de build**
1. Accédez aux logs de déploiement sur Bolt.host
2. Cherchez les messages liés aux variables d'environnement
3. Vérifiez qu'elles sont bien chargées pendant le build

**Solution 3 : Forcer un nouveau build**
1. Faites une petite modification dans le code (ajoutez un commentaire)
2. Commitez et poussez le changement
3. Déclenchez un nouveau déploiement

### Problème : Variables non reconnues

Vérifiez que:
- Les noms des variables commencent bien par `VITE_` (requis pour Vite)
- Il n'y a pas d'espaces avant ou après les valeurs
- Les variables sont définies au niveau du projet, pas au niveau du compte

### Problème : Erreur de connexion à Supabase

1. Vérifiez que votre URL Supabase est correcte
2. Vérifiez que votre clé ANON est valide
3. Testez la connexion depuis Netlify (qui fonctionne) pour confirmer que les identifiants sont bons

## Support et ressources

### Documentation Bolt.host
- Cherchez "environment variables" dans leur documentation
- Consultez les guides de déploiement spécifiques à Vite/React

### Documentation Vite
- [Variables d'environnement Vite](https://vitejs.dev/guide/env-and-mode.html)
- Les variables doivent commencer par `VITE_` pour être exposées au client

### Documentation Supabase
- [Configuration du client JavaScript](https://supabase.com/docs/reference/javascript/initializing)
- Vérifiez que votre projet Supabase est actif

## Notes importantes

1. **Sécurité**: La clé ANON de Supabase est sûre à exposer côté client car elle est protégée par les Row Level Security (RLS) policies
2. **Fichier .env**: Ne commitez JAMAIS le fichier `.env` dans Git (il est déjà dans `.gitignore`)
3. **Variables d'environnement**: Elles doivent être configurées sur chaque plateforme de déploiement séparément

## Prochaines étapes

1. Configurez les variables d'environnement sur Bolt.host
2. Redéployez l'application
3. Vérifiez dans la console que Supabase est bien configuré
4. Testez la connexion avec un compte réel
5. Si le problème persiste, consultez les logs de build de Bolt.host

---

**Comparaison des URLs:**
- ✅ Netlify (fonctionne): https://applinutrition.netlify.app
- ⚠️ Bolt.host (mode démo): https://appli-nutrtion-good-fi1o.bolt.host

Une fois les variables configurées, les deux URLs devraient fonctionner de manière identique avec votre base de données Supabase.
