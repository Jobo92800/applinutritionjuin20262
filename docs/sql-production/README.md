# Scripts SQL passés en production

Corrections ponctuelles des **données** de Supabase « MB Nutrition »
(`epokhtkwibgabwvobusl`) — à ne pas confondre avec `supabase/migrations/`,
qui décrit la **structure** des tables et que l'application applique seule.

Chacun s'exécute depuis l'éditeur SQL du projet : coller le fichier entier,
puis Run. Tous sont en transaction (une erreur n'écrit rien), tous sont
rejouables, et tous se terminent par un tableau avant/après où la colonne
« après » doit afficher 0 partout.

| # | Script | Ce qu'il fait | Passé le |
|---|--------|---------------|----------|
| 1 | Migration recettes de la semaine | Ajoute `podcasts.consigne` et `podcasts.filtres` : l'étape du parcours peut porter une consigne alimentaire et un filtre de recettes. | oct. 2026 |
| 2 | Consignes de la semaine | Remplit ces consignes pour les étapes existantes. | oct. 2026 |
| — | Correction recettes | 34 noms d'ingrédient avec une espace en trop (qui dédoublaient les lignes de courses), 6 noms de variante, 7 `targetCalories` faux, le Bibimbap à 178 g de glucides au lieu de 17, et la recette de test `sfdgsdfg` visible par les clientes. | 21 oct. 2026 |
| 3 | Sauce soja vers tamari | Cinq recettes annonçaient « Sans gluten » en contenant de la sauce soja, qui est brassée avec du blé. Passe l'ingrédient au tamari et réécrit les étapes. | 22 oct. 2026 |

## Ce qui reste en suspens

Les 22 incohérences de valeurs nutritionnelles (plus de 5 % d'écart entre les
macros annoncées et le calcul) sont décrites dans
`../recettes/Recettes - ce qui reste a decider.md`. Elles demandent un arbitrage
recette par recette : aucun script ne peut deviner laquelle des deux valeurs
est la bonne.
