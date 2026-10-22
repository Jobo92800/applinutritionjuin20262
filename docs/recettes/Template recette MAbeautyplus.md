# Template — créer une recette pour l'application MAbeautyplus Nutrition

> **Comment s'en servir.** Colle ce document entier au début d'une nouvelle
> conversation, puis demande une ou plusieurs recettes. Tout ce qui suit est
> relevé dans le code et dans les 43 recettes déjà en production : les listes
> fermées sont **fermées**, une valeur inventée casse un filtre ou fait
> disparaître un ingrédient de la liste de courses.

---

## 1. Ce qu'est une recette dans l'application

Une ligne de la table `recipes` (Supabase « MB Nutrition »). Elle sert à
quatre écrans :

| Écran | Ce qu'il lit |
|---|---|
| **Recettes** | titre, image, description, difficulté, temps, portions, catégories, préférences |
| **Fiche recette** | tout, plus le sélecteur de **variantes** |
| **Calendrier des repas** | catégories (pour proposer la recette au bon repas) et **nutrition**, additionnée sur la journée |
| **Liste de courses** | les **ingrédients de la version de base**, regroupés par rayon |

---

## 2. Les champs, un par un

### Identité

| Champ | Type | Règle |
|---|---|---|
| `title` | texte | **Majuscules aux mots importants**, sans point final. Ex. « Galette de Quinoa aux Légumes et Feta », « Omelette au Parmesan et Epinards ». 3 à 7 mots. |
| `description` | texte | Facultatif — **42 des 43 recettes en production le laissent vide**. Si tu en écris une : une phrase, 15 à 25 mots, qui dit le bénéfice ou le moment (« Une salade nutritive et colorée parfaite pour un déjeuner équilibré »). Jamais de promesse de résultat. |
| `image` | URL | **Laissé vide dans le template.** C'est Jonathan qui dépose la photo depuis l'admin (elle part dans le bucket `recipe-images`). Ne jamais proposer une URL d'image trouvée ailleurs. |

### Mesures

| Champ | Type | Règle |
|---|---|---|
| `difficulty` | `facile` \| `moyen` \| `difficile` | **Liste fermée, en minuscules.** 42 recettes sur 43 sont en `facile` — c'est la norme. `moyen` seulement si une technique est vraiment requise. |
| `prepTime` | entier | Minutes, **préparation + cuisson**. En production : 10 à 25 min. |
| `servings` | entier | **`1`** pour une recette qui se fait à la portion (40 des 43 en production). Pour une préparation qui se fait en fournée — granola, barres — on met le nombre de portions, les **ingrédients sont pour la fournée** et la **nutrition pour UNE portion**. Voir la règle d'or au §4. |

### Classement

`categories` — **tableau**, liste fermée, au moins une valeur, orthographe exacte :

```
Petit-déjeuner · Déjeuner · Dîner · Collation · Entrée · Plat principal · Dessert · Boisson
```

En pratique une recette porte **2 à 4 catégories** : elle dit à quels repas
elle convient *et* quel rôle elle joue. Combinaisons les plus fréquentes :

- un plat du soir et du midi : `["Déjeuner", "Dîner", "Plat principal"]`
- un petit-déjeuner qui passe aussi en collation : `["Petit-déjeuner", "Collation"]`
- un dessert : `["Dessert", "Collation"]`

`dietaryPreferences` — **tableau**, liste fermée, peut être vide :

```
Végétarien · Végan · Sans gluten · Sans lactose · Sans féculent · Super-aliments · Robot de cuisine · Air Fryer
```

Règles de vérité — on ne coche que ce qui est **vrai pour la version de base** :

- **Sans gluten** : ni blé, ni orge, ni seigle, ni avoine non certifiée, ni sauce soja classique.
- **Sans lactose** : aucun produit laitier. Le beurre et le parmesan comptent.
- **Sans féculent** : ni pâtes, ni riz, ni pommes de terre, ni pain, ni légumineuses, ni quinoa, ni avoine.
- **Végétarien** : pas de viande ni poisson ; œuf et laitage autorisés.
- **Végan** : pas de produit animal du tout, miel compris.
- **Super-aliments** : au moins un parmi graines de chia, curcuma, gingembre, baies de goji, spiruline, graines de lin, cacao cru, matcha.
- **Robot de cuisine** / **Air Fryer** : seulement si la recette est *écrite pour* l'appareil.

> ⚠️ **« Végétalien » n'existe pas dans l'application** — c'est **`Végan`**.
> Neuf recettes de production le portaient : elles étaient invisibles dans le
> filtre, c'est corrigé. Ne pas reproduire l'erreur.

> ⚠️ **La sauce soja classique contient du blé.** Une recette qui en contient
> n'est pas « Sans gluten » : soit on écrit `Tamari (sauce soja sans gluten)`
> dans les ingrédients, soit on ne coche pas l'étiquette. Même vigilance pour
> le seitan, la bière, le miso non certifié.

### Ingrédients

Un tableau d'objets. **C'est la partie la plus sensible**, parce qu'elle
alimente la liste de courses.

```json
{ "id": "1", "name": "Carotte", "quantity": 60, "unit": "g", "category": "fruits-legumes" }
```

- **`id`** : `"1"`, `"2"`, `"3"`… en texte, dans l'ordre.
- **`name`** : **au singulier, première lettre en majuscule, sans espace avant
  ni après**, précision entre
  parenthèses quand elle change le produit acheté : `Poulet (filet)`,
  `Quinoa (cuit)`, `Epinards (pousses)`, `Epinards (feuilles)`.
  **L'orthographe doit être identique d'une recette à l'autre** : la liste de
  courses additionne sur la clé `nom + unité`. « Huile d'olive » et « huile
  d'olive » feraient deux lignes.
  Noms déjà établis à réutiliser tels quels : `Sel`, `Poivre`, `Huile d'olive`,
  `Carotte`, `Gousse d'ail`, `Jus de citron`, `Avocat`, `Poivron rouge`,
  `Concombre`, `Poulet (filet)`, `Coriandre`, `Oeuf` (sans tréma),
  `Courgette`, `Paprika`, `Flocons d'avoine`, `Graines de chia`, `Miel`,
  `Gingembre`, `Lait végétal non sucré`, `Huile de sésame`,
  `Sauce soja salée`, `Tomate`, `Fruits rouges`, `Curcuma`.
- **`quantity`** : nombre, décimales autorisées (`0.4` pour le sel). Jamais de
  texte, jamais « une pincée » — on écrit `0.4` g.
- **`unit`** : **liste fermée**, au singulier :

  | Unité | Pour quoi |
  |---|---|
  | `g` | tout ce qui se pèse — c'est **87 %** des ingrédients, y compris les huiles et le sel |
  | `ml` | liquides qui se mesurent (sauce soja, jus, lait végétal) |
  | `pièce` | œuf, tranche, galette |
  | `gousse` | ail |
  | `feuille` | laurier, menthe, basilic (**jamais `feuilles`**) |
  | `brin` | thym, romarin, ciboulette |

- **`category`** : **liste fermée de 12 rayons**. Une valeur hors liste fait
  **disparaître l'ingrédient de la liste de courses**, silencieusement.

  ```
  fruits-legumes · boucherie-charcuterie · poisson · produits-laitiers
  epicerie-salee · epicerie-sucree · boisson · surgeles
  boulangerie-patisserie · bio-dietetique · condiments-assaisonnements
  complements-alimentaires
  ```

  Où ranger quoi, d'après l'usage réel :

  | Rayon | Exemples en production |
  |---|---|
  | `fruits-legumes` | carotte, courgette, avocat, gousse d'ail, jus de citron, herbes fraîches |
  | `condiments-assaisonnements` | **sel, poivre, toutes les huiles**, épices, vinaigre, moutarde |
  | `bio-dietetique` | flocons d'avoine, graines de chia, lait végétal, farines spéciales, tofu |
  | `epicerie-salee` | **œufs**, riz, pâtes, quinoa sec, conserves, sauce soja, légumineuses |
  | `epicerie-sucree` | miel, sirop d'érable, chocolat, sucre |
  | `produits-laitiers` | feta, parmesan, yaourt, fromage blanc, beurre |
  | `boucherie-charcuterie` | poulet, bœuf, jambon cru |
  | `poisson` | saumon, cabillaud, crevettes, thon |
  | `surgeles` | épinards surgelés, fruits rouges surgelés |
  | `boulangerie-patisserie` | pain, tortilla, pâte feuilletée |
  | `boisson` | eau de coco, thé, café |
  | `complements-alimentaires` | protéine en poudre, spiruline, compléments STARVAC |

  > ⚠️ **`autres` et `légumes` n'existent pas.** Cinq recettes les utilisaient :
  > leurs ingrédients ne remontaient dans aucune liste de courses, c'est
  > corrigé. À ne jamais écrire.

### Étapes

`steps` — tableau de chaînes, **4 à 6 étapes**, dans l'ordre.

- Chaque étape commence par un **verbe à l'impératif pluriel** : « Préparez… »,
  « Faites cuire… », « Mélangez… », « Servez… ».
- 1 à 3 phrases, 20 à 60 mots. On peut mettre un retour à la ligne (`\n`)
  à l'intérieur d'une étape pour séparer deux gestes.
- La première étape est la **mise en place** (« Préparez les ingrédients : … »),
  la dernière le **service** (« Servez chaud avec… »).
- Les quantités ne se répètent pas dans les étapes — elles sont dans la liste
  d'ingrédients. On y met les **temps** et les **repères visuels** :
  « 3 à 4 minutes de chaque côté jusqu'à ce qu'elles soient bien dorées ».
- Pas de numérotation dans le texte : l'application numérote.

### Nutrition

`nutrition` — les quatre valeurs, **pour une portion**, en nombres entiers :

```json
{ "calories": 380, "protein": 26, "carbs": 13, "fat": 25 }
```

`protein`, `carbs`, `fat` en grammes, `calories` en kcal.

**Contrôle de cohérence obligatoire** — les calories doivent correspondre aux
macros à ±5 % près :

```
calories ≈ (protein × 4) + (carbs × 4) + (fat × 9)
```

*Exemple ci-dessus : (26×4) + (13×4) + (25×9) = 104 + 52 + 225 = 381 ≈ 380 ✓*

Si ça ne tombe pas juste, c'est qu'une quantité ou une macro est fausse : on
corrige, on ne force pas le chiffre.

### Variantes

`variants` — tableau. **36 recettes sur 43 en ont, et toujours la même paire.**
C'est la convention de la maison :

| `name` | Visée | Comment on l'obtient |
|---|---|---|
| `Calories : faibles` | ~ −15 % | on baisse les matières grasses et la portion de féculent / protéine |
| `Calories : élevées` | ~ +20 % | on monte la protéine, les bonnes graisses, le féculent |

La version de base reste au milieu et s'appelle **« Version originale »** à
l'écran (l'application l'ajoute d'elle-même, il ne faut pas la créer en
variante). Les trois versions sont triées par calories croissantes dans la
fiche.

Chaque variante porte :

```json
{
  "id": "v1",
  "name": "Calories : faibles",
  "targetCalories": 370,
  "ingredients": [ … la liste COMPLÈTE, mêmes noms, quantités modifiées … ],
  "nutrition": { "calories": 370, "protein": 35, "carbs": 22, "fat": 16 },
  "adjustments": ""
}
```

- **`ingredients` est la liste entière**, pas seulement ce qui change : la
  fiche affiche la variante à la place de la base. Mêmes `id`, mêmes `name`,
  mêmes `unit`, mêmes `category` — **seules les `quantity` bougent**, et un
  ingrédient peut être retiré.
- **`targetCalories`** : recopier **exactement** `nutrition.calories` de la
  variante. (Sept variantes de production ne le faisaient pas, dont un `28`
  au lieu de `280`.)
- **`adjustments`** : laissé vide en production. Si tu l'utilises : une phrase
  courte, « Moins d'huile, portion de quinoa réduite ».
- La règle des ±5 % s'applique à **chaque** variante.

> 📌 **La liste de courses ne lit que la version de base**, jamais les
> variantes. C'est voulu : on fait ses courses sur la recette, on ajuste dans
> l'assiette.

---

## 3. La fiche à produire

Pour **chaque** recette, rendre exactement ce bloc — c'est ce que Jonathan
recopie dans le formulaire d'administration, champ par champ :

```json
{
  "title": "",
  "description": "",
  "difficulty": "facile",
  "prepTime": 0,
  "servings": 1,
  "categories": [],
  "dietaryPreferences": [],
  "ingredients": [
    { "id": "1", "name": "", "quantity": 0, "unit": "g", "category": "" }
  ],
  "steps": [
    ""
  ],
  "nutrition": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0 },
  "variants": [
    {
      "id": "v1",
      "name": "Calories : faibles",
      "targetCalories": 0,
      "ingredients": [],
      "nutrition": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0 },
      "adjustments": ""
    },
    {
      "id": "v2",
      "name": "Calories : élevées",
      "targetCalories": 0,
      "ingredients": [],
      "nutrition": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0 },
      "adjustments": ""
    }
  ]
}
```

Et, **sous le JSON**, le contrôle en clair :

```
Contrôle macros
  base      : (P×4) + (G×4) + (L×9) = …  vs  … kcal annoncées   → écart … %
  faibles   : …                                                 → écart … %
  élevées   : …                                                 → écart … %
Photo : à déposer depuis l'admin.
```

---

## 4. Les six règles d'or

1. **La nutrition est TOUJOURS pour une portion.** Le calendrier additionne
   les calories des repas de la journée **sans jamais diviser par les
   portions** : une recette pour 4 dont la nutrition serait le total ferait
   exploser le compteur du jour de la cliente.
   - Recette à la portion (le cas normal) : `servings: 1`, ingrédients et
     nutrition pour une personne.
   - Préparation en fournée (granola, barres, soupe en bocal) : `servings`
     = le nombre de portions, **ingrédients pour la fournée**, **nutrition
     pour une portion**, et une étape qui le dit (« Comptez 6 portions, elles
     se gardent une semaine »).
2. **Les listes fermées sont fermées.** Catégorie, préférence, unité, rayon :
   toute valeur hors liste casse un filtre ou perd un ingrédient.
3. **Les noms d'ingrédients sont un vocabulaire partagé.** Réutiliser
   l'orthographe exacte déjà en base, sinon la liste de courses fait doublon.
4. **Les macros doivent tomber juste** (±5 %), sur la base comme sur chaque
   variante.
5. **Deux variantes, nommées « Calories : faibles » et « Calories : élevées »**,
   chacune avec sa liste d'ingrédients complète.
6. **Le ton MAbeautyplus** : on décrit un geste et un repère, jamais un
   résultat. Pas de « recette minceur », pas de « brûle-graisses », pas de
   « -3 kg ». On dit « rééducation alimentaire », jamais « rééquilibrage ».

---

## 5. Exemple complet et conforme

Recette réelle de production, reconstituée au format attendu.

```json
{
  "title": "Omelette au Parmesan et Epinards",
  "description": "",
  "difficulty": "facile",
  "prepTime": 10,
  "servings": 1,
  "categories": ["Petit-déjeuner", "Déjeuner", "Dîner"],
  "dietaryPreferences": ["Sans gluten", "Sans féculent"],
  "ingredients": [
    { "id": "1", "name": "Oeuf", "quantity": 2, "unit": "pièce", "category": "epicerie-salee" },
    { "id": "2", "name": "Flocons d'avoine", "quantity": 20, "unit": "g", "category": "bio-dietetique" },
    { "id": "3", "name": "Jambon cru", "quantity": 20, "unit": "g", "category": "boucherie-charcuterie" },
    { "id": "4", "name": "Parmesan", "quantity": 5, "unit": "g", "category": "produits-laitiers" },
    { "id": "5", "name": "Huile d'olive", "quantity": 5, "unit": "g", "category": "condiments-assaisonnements" },
    { "id": "6", "name": "Epinards (feuilles)", "quantity": 30, "unit": "g", "category": "surgeles" },
    { "id": "7", "name": "Sel", "quantity": 0.3, "unit": "g", "category": "condiments-assaisonnements" },
    { "id": "8", "name": "Poivre", "quantity": 0.2, "unit": "g", "category": "condiments-assaisonnements" }
  ],
  "steps": [
    "Préparez les ingrédients : si vous utilisez des épinards surgelés, laissez-les décongeler et pressez-les pour retirer l'excès d'eau.\nCoupez la tranche de jambon cru en lanières.",
    "Dans un bol, cassez les œufs. Ajoutez les flocons d'avoine, le parmesan, une pincée de sel et de poivre, puis battez le tout avec une fourchette.",
    "Faites chauffer l'huile d'olive dans une poêle antiadhésive à feu moyen.\nAjoutez les épinards et faites-les revenir 1 à 2 minutes jusqu'à ce qu'ils ramollissent.",
    "Répartissez les épinards dans la poêle, ajoutez le jambon cru, puis versez les œufs battus par-dessus. Laissez cuire quelques minutes, retournez, et laissez cuire à nouveau.",
    "Servez chaud, avec une poignée de roquette si vous voulez de la fraîcheur."
  ],
  "nutrition": { "calories": 380, "protein": 26, "carbs": 13, "fat": 25 },
  "variants": [
    {
      "id": "v1",
      "name": "Calories : faibles",
      "targetCalories": 310,
      "ingredients": [
        { "id": "1", "name": "Oeuf", "quantity": 2, "unit": "pièce", "category": "epicerie-salee" },
        { "id": "2", "name": "Flocons d'avoine", "quantity": 10, "unit": "g", "category": "bio-dietetique" },
        { "id": "3", "name": "Jambon cru", "quantity": 15, "unit": "g", "category": "boucherie-charcuterie" },
        { "id": "4", "name": "Parmesan", "quantity": 5, "unit": "g", "category": "produits-laitiers" },
        { "id": "5", "name": "Huile d'olive", "quantity": 3, "unit": "g", "category": "condiments-assaisonnements" },
        { "id": "6", "name": "Epinards (feuilles)", "quantity": 40, "unit": "g", "category": "surgeles" },
        { "id": "7", "name": "Sel", "quantity": 0.3, "unit": "g", "category": "condiments-assaisonnements" },
        { "id": "8", "name": "Poivre", "quantity": 0.2, "unit": "g", "category": "condiments-assaisonnements" }
      ],
      "nutrition": { "calories": 310, "protein": 24, "carbs": 8, "fat": 20 },
      "adjustments": ""
    },
    {
      "id": "v2",
      "name": "Calories : élevées",
      "targetCalories": 470,
      "ingredients": [
        { "id": "1", "name": "Oeuf", "quantity": 3, "unit": "pièce", "category": "epicerie-salee" },
        { "id": "2", "name": "Flocons d'avoine", "quantity": 25, "unit": "g", "category": "bio-dietetique" },
        { "id": "3", "name": "Jambon cru", "quantity": 30, "unit": "g", "category": "boucherie-charcuterie" },
        { "id": "4", "name": "Parmesan", "quantity": 10, "unit": "g", "category": "produits-laitiers" },
        { "id": "5", "name": "Huile d'olive", "quantity": 7, "unit": "g", "category": "condiments-assaisonnements" },
        { "id": "6", "name": "Epinards (feuilles)", "quantity": 30, "unit": "g", "category": "surgeles" },
        { "id": "7", "name": "Sel", "quantity": 0.3, "unit": "g", "category": "condiments-assaisonnements" },
        { "id": "8", "name": "Poivre", "quantity": 0.2, "unit": "g", "category": "condiments-assaisonnements" }
      ],
      "nutrition": { "calories": 470, "protein": 34, "carbs": 16, "fat": 30 },
      "adjustments": ""
    }
  ]
}
```

```
Contrôle macros
  base      : (26×4)+(13×4)+(25×9) = 381  vs  380 kcal   → écart 0,3 %
  faibles   : (24×4)+(8×4)+(20×9)  = 308  vs  310 kcal   → écart 0,6 %
  élevées   : (34×4)+(16×4)+(30×9) = 470  vs  470 kcal   → écart 0,0 %
Photo : à déposer depuis l'admin.
```

---

## 6. Où ça atterrit, concrètement

**Administration → Recettes → Nouvelle recette.** Les champs du formulaire
sont, dans l'ordre : titre · description · image (bouton « Télécharger une
image ») · difficulté · temps de préparation · portions · catégories (cases) ·
préférences alimentaires (cases) · ingrédients (nom / quantité / unité /
rayon, une ligne par ingrédient) · étapes · valeurs nutritionnelles ·
variantes (bouton « Ajouter une variante »).

La recette apparaît tout de suite dans **Recettes** pour toutes les clientes,
et devient plaçable dans le **Calendrier des repas**.

---

## 7. Ce qu'il ne faut pas faire

- ❌ Inventer un rayon (`autres`, `légumes`, `épices`) — l'ingrédient disparaît des courses.
- ❌ Écrire `Végétalien` au lieu de `Végan`, ou `feuilles` au lieu de `feuille`.
- ❌ Mettre la nutrition de la fournée entière : elle est toujours pour **une** portion.
- ❌ Oublier l'espace : `"Calories : faibles "` et `"Roquette "` font des doublons dans la liste de courses.
- ❌ Laisser `targetCalories` différent des calories de la variante.
- ❌ Proposer une URL d'image : la photo se dépose depuis l'admin.
- ❌ Créer une variante « Version originale » : l'application l'ajoute seule.
- ❌ Ne donner que les ingrédients qui changent dans une variante.
- ❌ Annoncer un résultat (« recette minceur », « détox qui fait perdre »).
- ❌ Écrire « rééquilibrage alimentaire » — on dit **rééducation alimentaire**.
