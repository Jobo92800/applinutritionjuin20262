# Recettes — ce qui reste à décider

Audit complet des 43 recettes en ligne (5 octobre 2026). Ce qui était faux
sans discussion est dans `Correction recettes.sql`. **Ce document-ci ne
contient que ce qui demande ton avis** : des valeurs nutritionnelles à
retoucher, et une étiquette qui touche à un allergène. Je n'ai rien changé
de tout ça.

Trois sujets, par ordre d'importance.

---

## 1. « Sans gluten » sur 5 recettes à la sauce soja — à traiter en premier

La **sauce soja classique contient du blé**. Cinq recettes la listent et sont
pourtant étiquetées « Sans gluten » : une cliente cœliaque qui filtre sur
cette étiquette tombe dessus.

| Recette | Quantité de sauce soja |
|---|---|
| Bibimbap au Tofu et Légumes Marinés | 10 ml |
| Bulgogi de Bœuf aux Légumes | 15 ml |
| Pad Thaï Poulet et Légumes | 15 ml |
| Tartare de Thon aux Légumes Croquants | 10 ml |
| Wok de Crevettes au Lait de Coco et Légumes | 15 ml |

**Deux façons de régler ça — à toi de choisir :**

### Option A — tu utilises du tamari (recommandée)

Le tamari est une sauce soja sans blé. Si c'est ce que tu veux que les
clientes achètent, on le dit dans le nom de l'ingrédient et les recettes
restent sans gluten.

```sql
-- Option A : l'ingrédient devient explicitement sans gluten.
update recipes r set
  ingredients = (
    select jsonb_agg(
      case when e->>'name' = 'Sauce soja salée'
           then e || '{"name":"Tamari (sauce soja sans gluten)"}'::jsonb
           else e end order by ord)
    from jsonb_array_elements(r.ingredients) with ordinality t(e, ord)),
  variants = coalesce((
    select jsonb_agg(v || jsonb_build_object('ingredients', (
      select jsonb_agg(
        case when vi->>'name' = 'Sauce soja salée'
             then vi || '{"name":"Tamari (sauce soja sans gluten)"}'::jsonb
             else vi end order by vord)
      from jsonb_array_elements(v->'ingredients') with ordinality tv(vi, vord)))
      order by vrang)
    from jsonb_array_elements(r.variants) with ordinality tvv(v, vrang)), '[]'::jsonb)
 where exists (select 1 from jsonb_array_elements(r.ingredients) e
                where e->>'name' = 'Sauce soja salée');
```

> Pense à remplacer aussi la sauce soja par du tamari dans les étapes si elle
> y est nommée, depuis l'admin.

### Option B — c'est bien de la sauce soja classique

Alors l'étiquette est fausse et il faut la retirer. Les cinq recettes
sortiront du filtre « Sans gluten », ce qui est le résultat correct.

```sql
-- Option B : on retire l'étiquette qui ne dit pas la vérité.
update recipes
   set dietary_preferences = array_remove(dietary_preferences, 'Sans gluten')
 where title in (
   'Bibimbap au Tofu et Légumes Marinés',
   'Bulgogi de Bœuf aux Légumes',
   'Pad Thaï Poulet et Légumes',
   'Tartare de Thon aux Légumes Croquants',
   'Wok de Crevettes au Lait de Coco et Légumes');
```

**Ne lance qu'une seule des deux.**

---

## 2. Vingt-deux valeurs nutritionnelles qui ne tombent pas juste

Rappel du contrôle : `calories ≈ (protéines × 4) + (glucides × 4) + (lipides × 9)`.
Au-delà de 5 % d'écart, un chiffre est faux — reste à savoir lequel.

Je ne les ai **pas** corrigées : ce sont tes chiffres, les clientes s'en
servent pour composer leur journée, et deviner à ta place serait pire que de
te les signaler.

### Les cinq à reprendre en priorité

| Écart | Recette | Ce que je vois |
|---|---|---|
| **32 %** | Smoothie détox Epinards Pomme | Annoncé 90 kcal, les macros en donnent 61. En recomptant les ingrédients (100 g épinards, 75 g pomme, 50 g concombre, 75 ml eau de coco…) on tombe vers **90 kcal** : ce sont les **macros** qui sont sous-estimées, pas les calories. Glucides plutôt **17 g** que 11,5, protéines **2,5** plutôt que 1,5. |
| **20 %** | Soupe Thaï au Poulet → « Calories : faibles » | La variante porte **exactement les mêmes macros que la recette de base** (P32 G18 L37) avec 445 kcal au lieu de 570. Les macros n'ont pas été mises à jour quand la variante a été créée. |
| **17 %** | Pad Thaï Poulet et Légumes → « Calories : élevées » | Même chose : macros identiques à la base (P40 G27 L21) pour 550 kcal au lieu de 460. |
| **13 %** | Smoothie aux Fruits Rouges | Annoncé 140, macros à 122. Au vu des ingrédients (100 g fruits rouges, 60 g banane, 100 ml lait végétal, 5 g chia), **140 semble juste** : ce sont les glucides qui manquent, plutôt **22 g** que 19. |
| **11 %** | Granola maison → « Calories : faibles » | Annoncé 250, macros à 222. |

### Les dix-sept autres, entre 5 et 8 %

Ce sont des arrondis un peu larges, pas des erreurs de saisie. À reprendre
quand tu passeras sur ces recettes, sans urgence.

| Écart | Recette | Version |
|---|---|---|
| 7,9 % | Salade Détox aux Légumes Croquants | « Calories : moyennes » |
| 7,6 % | Muesli aux Flocons d'avoine | « Calories : élevées » |
| 7,1 % | Assiette Fraîcheur au Saumon Fumé et Crudités | « Calories : faibles » |
| 6,8 % | Salade Détox aux Légumes Croquants | la recette |
| 6,7 % | Porridge à l'Ananas | « Calories : élevées » |
| 6,7 % | Tartare de Thon aux Légumes Croquants | « Calories : élevées » |
| 6,5 % | Soupe Thaï au Poulet | la recette |
| 6,3 % | Tartare de Thon aux Légumes Croquants | la recette |
| 6,2 % | Soupe Thaï au Poulet | « Calories : élevées » |
| 5,9 % | Wok de Crevettes au Lait de Coco et Légumes | la recette |
| 5,5 % | Salade Détox aux Légumes Croquants | « Calories : élevées » |
| 5,5 % | Toast Avocat et Œuf mi-cuit | « Calories : faibles » |
| 5,4 % | Soupe Curry Coco et Haricots Blancs | la recette |
| 5,2 % | Porridge à l'Ananas | la recette **et** « Calories : faibles » |
| 5,2 % | Salade Tiède de Lentilles et Poulet | la recette |
| 5,2 % | Tartare de Thon aux Légumes Croquants | « Calories : faibles » |

> **Le réflexe pour l'avenir** : à chaque nouvelle recette, poser
> `(P×4) + (G×4) + (L×9)` et vérifier que ça tombe à 5 % des calories
> annoncées. C'est dans le template de recette, et je le ferai
> systématiquement pour celles que je te prépare.

---

## 3. Deux points que j'ai regardés et volontairement **pas** touchés

### « Sans lactose » avec du parmesan ou du comté — c'est juste

Quatre recettes sont dans ce cas (Omelette au Parmesan, Mini Gaufres,
Salade Tiède de Lentilles, Enchiladas au Poulet). Un parmesan affiné 24 mois
et un comté vieux contiennent **moins de 0,1 g de lactose aux 100 g** : ils
sont considérés sans lactose en pratique diététique. L'étiquette est
défendable, je l'ai laissée.

Si tu préfères être prudent parce que certaines clientes évitent **tout**
produit laitier, et pas seulement le lactose, dis-le-moi : on retire
l'étiquette sur ces quatre recettes.

### Les recettes en grande quantité — elles sont cohérentes

Deux recettes ont plusieurs portions, et c'est **normal** :

| Recette | Portions | Nutrition annoncée | Vérification |
|---|---|---|---|
| Granola maison | 6 | 450 kcal | les ingrédients font ~2 870 kcal au total, soit ~478 par portion ✓ |
| Barres de Céréales Protéinées Maison | 6 | 270 kcal | ~1 770 kcal au total, soit ~295 par portion ✓ |

La règle qui compte est respectée : **les ingrédients sont pour la fournée,
la nutrition est pour une portion**. Le calendrier des repas additionne la
nutrition sans diviser par les portions — il compte donc bien une portion.
Rien à changer.

*(La seule recette à `servings: 4` était la recette de test, supprimée par le
script.)*

---

## 4. Un détail cosmétique, sans effet

Trois recettes ont deux ingrédients portant le même identifiant interne
(Pad Thaï, Tartare de Thon, Filet de Saumon). Ça ne gêne rien : l'application
n'utilise jamais cet identifiant, elle affiche les ingrédients dans l'ordre.
Je n'y ai pas touché pour ne pas prendre de risque sur un point sans
conséquence.
