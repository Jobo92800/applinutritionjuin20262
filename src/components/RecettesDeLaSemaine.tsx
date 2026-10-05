import { useMemo, useState } from 'react';
import { UtensilsCrossed, Clock, ChefHat, ArrowRight } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { SemaineParcours, respecteLaConsigne } from '../lib/semaineParcours';
import { Recipe } from '../types';
import RecipeModal from './RecipeModal';

/*
  « Les recettes de votre semaine », sous le lecteur du parcours.

  L'épisode donne une consigne — « cette semaine, pas de féculents le midi ni
  le soir » — et cette carte montre tout de suite trois recettes qui la
  respectent, plus un passage vers la liste complète déjà filtrée. C'est le
  seul endroit où la méthode et la cuisine se rejoignent.

  Si l'étape ne porte pas de consigne, ou si aucune recette n'y répond, la
  carte ne s'affiche pas du tout : on ne montre jamais une sélection vide.
*/

const COMBIEN = 3;

interface Props {
  semaine: SemaineParcours;
  onVoirToutes: () => void;
}

export default function RecettesDeLaSemaine({ semaine, onVoirToutes }: Props) {
  const { recipes } = useData();
  const [ouverte, setOuverte] = useState<Recipe | null>(null);

  const { selection, total } = useMemo(() => {
    const conformes = recipes.filter((r) => respecteLaConsigne(r, semaine.filtres));
    return { selection: conformes.slice(0, COMBIEN), total: conformes.length };
  }, [recipes, semaine.filtres]);

  if (!selection.length) return null;

  return (
    <>
      <section className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="surtitre flex items-center space-x-2">
          <UtensilsCrossed className="w-4 h-4" /><span>Les recettes de votre semaine</span>
        </h2>
        <p className="mt-3 text-[15px] leading-7 text-gray-700">{semaine.consigne}</p>

        <div className="mt-4 space-y-2">
          {selection.map((r) => (
            <button key={r.id} type="button" onClick={() => setOuverte(r)}
              className="w-full flex items-center gap-4 text-left rounded-xl border border-gray-200 p-3 hover:border-marine-250 hover:bg-marine-50 transition-colors">
              {r.image
                ? <img src={r.image} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                : <span className="w-16 h-16 rounded-lg bg-marine-100 flex items-center justify-center flex-shrink-0">
                    <ChefHat className="w-6 h-6 text-marine-700" />
                  </span>}
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-gray-800 truncate">{r.title}</span>
                <span className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{r.prepTime} min</span>
                  {!!r.nutrition?.calories && <span>{r.nutrition.calories} kcal</span>}
                </span>
              </span>
            </button>
          ))}
        </div>

        <button type="button" onClick={onVoirToutes}
          className="mt-4 w-full flex items-center justify-center space-x-2 rounded-full border border-marine-500 bg-white py-3 font-semibold text-mab-aqua-texte hover:bg-marine-100 transition-colors">
          <span>{total > COMBIEN ? `Voir les ${total} recettes de la semaine` : 'Voir toutes les recettes'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>

      {ouverte && <RecipeModal recipe={ouverte} isOpen onClose={() => setOuverte(null)} />}
    </>
  );
}
