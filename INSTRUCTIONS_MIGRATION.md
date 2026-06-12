# Instructions pour appliquer la migration des podcasts

## ⚠️ Problème actuel

L'application essaie d'utiliser un nouveau champ `week_challenges` mais cette colonne n'existe pas encore dans votre base de données Supabase.

**Erreur:** "Erreur lors de la sauvegarde du podcast"

## Solution : Exécuter la migration manuellement

### Étapes à suivre :

1. **Ouvrez le SQL Editor de Supabase**
   - Allez sur : https://supabase.com/dashboard/project/epokhtkwibgabwvobusl/sql/new
   - Ou connectez-vous à https://supabase.com/dashboard et sélectionnez votre projet

2. **Copiez le contenu du fichier `MIGRATION_TO_RUN.sql`**
   - Le fichier se trouve à la racine du projet
   - Copiez **TOUT** son contenu (lignes 1 à 35)

3. **Collez et exécutez le script**
   - Collez le contenu dans le SQL Editor
   - Cliquez sur le bouton **"Run"** (en bas à droite) ou appuyez sur Ctrl+Enter (Windows) / Cmd+Enter (Mac)

4. **Vérifiez le résultat**
   - Vous devriez voir : **NOTICE: Colonne week_challenges ajoutée avec succès**
   - Un tableau s'affichera montrant la structure de la table `podcasts`
   - Vérifiez que la colonne `week_challenges` est présente avec le type `ARRAY`

5. **Testez l'application**
   - Rechargez complètement votre application (Ctrl+F5 / Cmd+Shift+R)
   - Retournez dans l'administration des podcasts
   - Essayez de créer ou modifier un podcast
   - Vous devriez maintenant pouvoir ajouter des "Défis de la semaine" sans erreur

## Ce que fait la migration

Cette migration ajoute une nouvelle colonne `week_challenges` à la table `podcasts`:

- **Nom**: `week_challenges`
- **Type**: `text[]` (tableau de texte)
- **Nullable**: Oui (optionnel)
- **Valeur par défaut**: NULL

Cette colonne permet de stocker une liste de défis hebdomadaires associés à chaque podcast.

## Avantages

✅ **Aucun impact sur les données existantes** : Les podcasts déjà créés ne sont pas affectés

✅ **Optionnel** : Vous n'êtes pas obligé d'ajouter des défis pour chaque podcast

✅ **Flexible** : Vous pouvez ajouter autant de défis que vous voulez

## En cas de problème

### Erreur : "column week_challenges already exists"

**Cause** : La colonne a déjà été créée

**Solution** : Ignorez cette erreur, la migration est déjà appliquée. Testez directement l'application.

### Erreur persiste après la migration

**Solutions** :
1. Videz le cache de votre navigateur (Ctrl+Shift+Delete)
2. Rechargez la page avec Ctrl+F5 (Windows) ou Cmd+Shift+R (Mac)
3. Déconnectez-vous et reconnectez-vous à l'application
4. Vérifiez que vous êtes bien sur le bon projet Supabase (`epokhtkwibgabwvobusl`)

### Vérification manuelle

Pour vérifier que la colonne existe, exécutez cette requête dans le SQL Editor :

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'podcasts' AND column_name = 'week_challenges';
```

**Résultat attendu** :
- column_name: `week_challenges`
- data_type: `ARRAY`
- is_nullable: `YES`

## Support

Si vous rencontrez toujours des problèmes après avoir suivi ces étapes, partagez-moi :
1. Le message d'erreur complet
2. Le résultat de la requête de vérification ci-dessus
3. Une capture d'écran de l'erreur

## Liens utiles

- Dashboard Supabase : https://supabase.com/dashboard
- SQL Editor direct : https://supabase.com/dashboard/project/epokhtkwibgabwvobusl/sql
- Documentation Supabase : https://supabase.com/docs
