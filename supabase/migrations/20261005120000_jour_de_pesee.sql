/*
  Le jour de pesée.

  L'introduction du parcours le dit à chaque cliente : « choisissez un jour
  fixe hebdomadaire pour vous peser, le matin à jeun ». L'application ne le
  lui demandait jamais et ne le lui rappelait jamais — c'était le seul rituel
  de la méthode que rien ne soutenait.

  `jour_pesee` : 1 = lundi … 7 = dimanche (norme ISO), NULL = pas de rappel.
  Rien n'est écrit ici : c'est la cliente qui choisit, depuis son compte.
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS jour_pesee smallint
    CHECK (jour_pesee IS NULL OR jour_pesee BETWEEN 1 AND 7);

COMMENT ON COLUMN profiles.jour_pesee IS
  'Jour de pesée choisi par la cliente, 1 = lundi … 7 = dimanche (ISO). '
  'NULL = elle n''en veut pas, et ne reçoit aucun rappel.';

-- Le rappel du matin lit cette colonne pour toutes les clientes à la fois.
CREATE INDEX IF NOT EXISTS profiles_jour_pesee_idx
  ON profiles (jour_pesee) WHERE jour_pesee IS NOT NULL;
