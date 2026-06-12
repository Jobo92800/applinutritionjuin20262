# Guide de Dépannage - Application Nutrition

## Problème: Données Manquantes en Production

### Symptômes
- Les recettes, podcasts et comptes créés n'apparaissent pas
- L'application fonctionne dans l'outil de création mais pas sur le lien direct
- Les utilisateurs ne peuvent pas se connecter avec leurs comptes

### Causes Possibles

#### 1. Variables d'Environnement Manquantes (CAUSE LA PLUS FRÉQUENTE)

L'application nécessite deux variables d'environnement critiques:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Comment vérifier:**
1. Ouvrez la console du navigateur (F12)
2. Recherchez les messages suivants:
   - `=== SUPABASE CONFIGURATION ===`
   - Si vous voyez "Supabase NOT configured - Running in DEMO mode", les variables manquent
   - Si vous voyez "Supabase configured: YES", la configuration est correcte

**Solution pour Netlify:**
1. Connectez-vous à Netlify Dashboard
2. Allez dans Site Settings > Environment Variables
3. Ajoutez les variables suivantes:
   ```
   VITE_SUPABASE_URL=https://epokhtkwibgabwvobusl.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwb2todGt3aWJnYWJ3dm9idXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0ODEwMzAsImV4cCI6MjA2NTA1NzAzMH0.uVavLEF-sfl1QYvspfsQ6F3ciZZg6b9ORi-E6t5Xf84
   ```
4. Redéployez le site

#### 2. Problèmes de Base de Données Supabase

**Vérifications:**
1. Connectez-vous à Supabase Dashboard
2. Vérifiez que le projet existe et est actif
3. Vérifiez que les tables contiennent des données:
   - recipes
   - podcasts
   - profiles
   - etc.

**Vérifier les politiques RLS (Row Level Security):**
1. Dans Supabase Dashboard, allez dans Authentication > Policies
2. Assurez-vous que les politiques permettent:
   - La lecture publique des recettes et podcasts (SELECT pour authenticated)
   - L'accès authentifié pour les profils utilisateurs

#### 3. Problèmes de Cache

**Solution:**
1. Videz le cache du navigateur
2. Supprimez les données localStorage:
   ```javascript
   // Dans la console du navigateur
   localStorage.clear();
   ```
3. Rechargez la page (Ctrl+F5 ou Cmd+Shift+R)

### Messages de Débogage

Les nouveaux logs vous aideront à identifier le problème:

```
[DataContext] Loading recipes from Supabase...
[DataContext] Recipes loaded successfully: X recipes
[DataContext] Recipes state updated successfully

[AuthContext] Fetching user profile for: user-id
[AuthContext] Profile found: {...}
[AuthContext] User state updated successfully
```

Si vous voyez des erreurs, notez:
- Le code d'erreur
- Le message d'erreur complet
- Les détails de l'erreur

### Modes de Fonctionnement

L'application a deux modes:

1. **Mode Production** (avec Supabase):
   - Toutes les données proviennent de la base Supabase
   - Persistance complète des données
   - Authentification réelle

2. **Mode Démo** (sans Supabase):
   - Données fictives en mémoire
   - Pas de persistance entre les sessions
   - Utilisé uniquement pour les démonstrations

### Vérification Rapide

Pour vérifier rapidement quel mode est actif:

1. Ouvrez la console du navigateur (F12)
2. Tapez:
   ```javascript
   localStorage.getItem('supabase_user_profile')
   ```
3. Si vous voyez `null`, vous êtes probablement en mode démo
4. Si vous voyez un objet JSON, vous êtes en mode production

### Contact Support

Si le problème persiste après avoir suivi ces étapes:
1. Capturez une capture d'écran de la console du navigateur
2. Notez les messages d'erreur exacts
3. Indiquez quelle étape a été suivie
