import { BookOpen, Lightbulb, Target } from 'lucide-react';
import { blocs, segments } from '../lib/texteEpisode';

/*
  Le contenu écrit d'une étape, sous le lecteur : le texte de l'épisode aéré
  en paragraphes courts, les points à retenir numérotés, puis les défis de la
  semaine. Le premier paragraphe sert d'accroche, un peu plus appuyé.
*/

interface Props {
  description?: string;
  pointsCles?: string[];
  defis?: string[];
}

function Ligne({ texte }: { texte: string }) {
  return (
    <>
      {segments(texte).map((s, i) =>
        s.gras ? <strong key={i} className="font-semibold text-gray-900">{s.texte}</strong> : <span key={i}>{s.texte}</span>
      )}
    </>
  );
}

function Titre({ icone: Icone, enfants, couleur }: { icone: typeof BookOpen; enfants: string; couleur: string }) {
  return (
    <h2 className={`flex items-center space-x-2 text-xs font-semibold tracking-widest uppercase ${couleur}`}>
      <Icone className="w-4 h-4" /><span>{enfants}</span>
    </h2>
  );
}

export default function ContenuEpisode({ description, pointsCles, defis }: Props) {
  const contenu = description ? blocs(description) : [];
  let premierParagraphe = true;

  return (
    <div className="mt-6 space-y-4">
      {contenu.length > 0 && (
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <Titre icone={BookOpen} enfants="L'épisode en quelques mots" couleur="text-marine-700" />
          <div className="mt-4 space-y-4 text-[15px] leading-7 text-gray-700">
            {contenu.map((b, i) => {
              if (b.type === 'liste') {
                return (
                  <ul key={i} className="space-y-2 pl-1">
                    {b.elements.map((e, j) => (
                      <li key={j} className="flex items-start space-x-3">
                        <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-marine-400 flex-shrink-0" />
                        <span><Ligne texte={e} /></span>
                      </li>
                    ))}
                  </ul>
                );
              }
              const accroche = premierParagraphe;
              premierParagraphe = false;
              return (
                <p key={i} className={accroche ? 'text-base leading-7 font-medium text-gray-800 border-l-4 border-marine-200 pl-4' : ''}>
                  <Ligne texte={b.texte} />
                </p>
              );
            })}
          </div>
        </section>
      )}

      {pointsCles && pointsCles.length > 0 && (
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <Titre icone={Lightbulb} enfants="À retenir" couleur="text-marine-700" />
          <ol className="mt-4 space-y-3">
            {pointsCles.map((p, i) => (
              <li key={i} className="flex items-start space-x-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-marine-100 text-marine-800 text-sm font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-[15px] leading-7 text-gray-700 pt-0.5"><Ligne texte={p} /></span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {defis && defis.length > 0 && (
        <section className="bg-rose-50 rounded-2xl border border-rose-100 p-6">
          <Titre icone={Target} enfants="Vos défis de la semaine" couleur="text-rose-700" />
          <ul className="mt-4 space-y-3">
            {defis.map((d, i) => (
              <li key={i} className="flex items-start space-x-3 bg-white/70 rounded-xl px-4 py-3">
                <span className="flex-shrink-0 mt-1.5 w-4 h-4 rounded border-2 border-rose-300" />
                <span className="text-[15px] leading-7 text-gray-800"><Ligne texte={d} /></span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
