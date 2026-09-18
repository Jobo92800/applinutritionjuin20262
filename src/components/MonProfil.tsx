import { useEffect, useState } from 'react';
import { Fingerprint, FileText, Loader2, Ruler, Activity, Sparkles, Leaf } from 'lucide-react';
import { profilApi, ProfilCliente, BilanProfil, Jauge, AxeDecrit, Mensuration } from '../lib/profilApi';
import { ParcoursApiError } from '../lib/parcoursApi';

/*
  « Mon profil » : le BioPortrait établi au centre, tel que la cliente l'a
  reçu — le profil et le terrain dominants avec leurs mots, les dix jauges,
  les mesures InBody, le PDF. Plusieurs bilans se choisissent par leur date,
  le plus récent d'abord ; les mensurations, quand le centre en relève,
  se lisent d'une date à l'autre.
*/

const SEUIL_PAR_DEFAUT = 60;

const dateLongue = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const dateCourte = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const dateChiffres = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });

const MESURES: { cle: string; nom: string }[] = [
  { cle: 'poitrine', nom: 'Poitrine' },
  { cle: 'sous_poitrine', nom: 'Sous-poitrine' },
  { cle: 'taille', nom: 'Taille' },
  { cle: 'ventre', nom: 'Ventre' },
  { cle: 'hanches', nom: 'Hanches' },
  { cle: 'bras_droit', nom: 'Bras droit' },
  { cle: 'bras_gauche', nom: 'Bras gauche' },
  { cle: 'cuisse_droite', nom: 'Cuisse droite' },
  { cle: 'cuisse_gauche', nom: 'Cuisse gauche' },
  { cle: 'mollet_droit', nom: 'Mollet droit' },
  { cle: 'mollet_gauche', nom: 'Mollet gauche' },
];

export default function MonProfil() {
  const [etat, setEtat] = useState<ProfilCliente | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [bilanChoisi, setBilanChoisi] = useState<string | null>(null);

  useEffect(() => {
    profilApi.etat()
      .then(setEtat)
      .catch((e) => setErreur(e instanceof ParcoursApiError && e.code === 'profil-indisponible'
        ? "Votre profil n'est pas joignable pour le moment. Réessayez un peu plus tard."
        : e instanceof ParcoursApiError && e.statut === 401
          ? 'Votre session a expiré. Reconnectez-vous.'
          : "Impossible d'afficher votre profil pour le moment."));
  }, []);

  if (erreur) {
    return <div className="max-w-2xl mx-auto bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-5 text-sm">{erreur}</div>;
  }
  if (!etat) {
    return (
      <div className="max-w-2xl mx-auto flex items-center justify-center py-16 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement de votre profil…
      </div>
    );
  }

  const bilan = etat.bilans.find((b) => b.id === bilanChoisi) ?? etat.bilans[0] ?? null;
  const seuil = etat.seuil ?? SEUIL_PAR_DEFAUT;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase text-green-600">
          {etat.cliente ? `Bonjour ${etat.cliente.prenom}` : 'Mon profil'}
        </p>
        <h1 className="text-2xl font-bold text-gray-800 mt-1">Votre BioPortrait</h1>
        <p className="text-sm text-gray-500 mt-1">Le bilan établi avec votre thérapeute, et ce qu'il dit de vous.</p>
      </div>

      {!bilan ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <Fingerprint className="w-10 h-10 text-marine-300 mx-auto mb-3" />
          <p className="font-medium text-gray-800">Votre BioPortrait apparaîtra ici après votre bilan au centre.</p>
          <p className="text-sm text-gray-500 mt-2">
            {etat.cliente
              ? "Votre fiche existe, mais aucun bilan n'y est encore enregistré."
              : "Votre compte n'est pas encore relié à une fiche du centre : parlez-en à votre thérapeute."}
          </p>
        </div>
      ) : (
        <>
          {etat.bilans.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {etat.bilans.map((b, rang) => {
                const actif = b.id === bilan.id;
                return (
                  <button key={b.id} type="button" onClick={() => setBilanChoisi(b.id)} aria-pressed={actif}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      actif ? 'border-marine-600 bg-marine-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-marine-400'}`}>
                    {dateCourte(b.date)}{rang === 0 && <span className="ml-1.5 opacity-70">· le dernier</span>}
                  </button>
                );
              })}
            </div>
          )}

          <Synthese bilan={bilan} />
          <CarteAxe etiquette="Votre profil comportemental" axe={bilan.profil} accent="marine" icone={Sparkles} />
          <CarteAxe etiquette="Votre terrain physiologique" axe={bilan.terrain} accent="rose" icone={Leaf} />

          {bilan.aussiPresents.length > 0 && (
            <p className="text-sm text-gray-600 px-1">
              <span className="font-semibold text-gray-700">Aussi présent chez vous : </span>
              {bilan.aussiPresents.map((a) => `${a.nom} ${a.pourcentage} %`).join(' · ')}
            </p>
          )}

          {bilan.inbody.length > 0 && (
            <section className="bg-white rounded-2xl border border-gray-200 p-6">
              <Titre icone={Activity} texte="Votre analyse de composition corporelle" />
              <dl className="mt-4 divide-y divide-gray-100">
                {bilan.inbody.map((m) => (
                  <div key={m.libelle} className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-sm text-gray-500">{m.libelle}</dt>
                    <dd className="text-sm font-semibold text-gray-800 text-right">{m.valeur}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Colonne titre="Profil comportemental" jauges={bilan.jauges.profils} accent="bg-marine-600" seuil={seuil} />
            <Colonne titre="Terrain physiologique" jauges={bilan.jauges.terrains} accent="bg-rose-500" seuil={seuil} />
          </div>

          {bilan.complement && (
            <section className="bg-marine-50 rounded-2xl border border-marine-100 p-6">
              <Titre icone={Leaf} texte="Le complément orienté par votre terrain" />
              <p className="mt-3 font-semibold text-gray-800">{bilan.complement.nom}</p>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">{bilan.complement.raison}</p>
            </section>
          )}

          {bilan.texteLibre && (
            <section className="bg-white rounded-2xl border border-gray-200 p-6">
              <Titre icone={Fingerprint} texte="Ce que vous vouliez transformer en priorité" />
              <p className="mt-3 text-sm italic text-gray-700 leading-relaxed">« {bilan.texteLibre} »</p>
            </section>
          )}
        </>
      )}

      {etat.mensurations.length > 0 && <Mensurations lignes={etat.mensurations} />}
    </div>
  );
}

function Titre({ icone: Icone, texte }: { icone: typeof Fingerprint; texte: string }) {
  return (
    <h2 className="flex items-center space-x-2 text-xs font-semibold tracking-widest uppercase text-marine-700">
      <Icone className="w-4 h-4" /><span>{texte}</span>
    </h2>
  );
}

function Synthese({ bilan }: { bilan: BilanProfil }) {
  const [ouverture, setOuverture] = useState<'repos' | 'encours' | 'erreur'>('repos');

  /*
    Safari n'ouvre un onglet que dans le geste de la cliente, pas après un
    appel réseau : on l'ouvre tout de suite, vide, puis on y met le PDF. Là
    où aucune fenêtre ne s'ouvre (application installée sur l'écran d'accueil),
    on propose le fichier au téléchargement.
  */
  const ouvrirPdf = async () => {
    setOuverture('encours');
    const fenetre = window.open('', '_blank');
    try {
      const url = await profilApi.document(bilan.id);
      if (fenetre) {
        fenetre.location.href = url;
      } else {
        const a = document.createElement('a');
        a.href = url; a.download = `BioPortrait_${bilan.date}.pdf`;
        document.body.appendChild(a); a.click(); a.remove();
      }
      setOuverture('repos');
    } catch {
      fenetre?.close();
      setOuverture('erreur');
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-6 text-center shadow-carte">
      <p className="text-xs font-semibold tracking-widest uppercase text-gray-400">Bilan du {dateLongue(bilan.date)}</p>
      <p className="mt-3 flex flex-wrap items-center justify-center gap-3 text-2xl font-bold">
        <span className="text-marine-700">{bilan.profil.nom}</span>
        <span className="text-gray-300">×</span>
        <span className="text-rose-600">{bilan.terrain.nom}</span>
      </p>
      <p className="mt-4 text-[15px] leading-7 text-gray-700">{bilan.synthese}</p>

      {bilan.document && (
        <button type="button" onClick={ouvrirPdf} disabled={ouverture === 'encours'}
          className="mt-5 w-full flex items-center justify-center space-x-2 bg-marine-600 text-white py-3 rounded-full font-semibold hover:bg-marine-700 hover:-translate-y-px transition-all shadow-carte disabled:opacity-60">
          {ouverture === 'encours' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
          <span>Ouvrir mon BioPortrait (PDF)</span>
        </button>
      )}
      {ouverture === 'erreur' && <p className="mt-2 text-xs text-rose-700">Le document n'a pas pu être ouvert. Réessayez plus tard.</p>}
    </section>
  );
}

function CarteAxe({ etiquette, axe, accent, icone: Icone }: { etiquette: string; axe: AxeDecrit; accent: 'marine' | 'rose'; icone: typeof Sparkles }) {
  const couleur = accent === 'marine' ? 'text-marine-700' : 'text-rose-700';
  const bordure = accent === 'marine' ? 'border-marine-200' : 'border-rose-200';
  return (
    <section className={`bg-white rounded-2xl border border-gray-200 border-l-4 ${bordure} p-6`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`flex items-center space-x-2 text-xs font-semibold tracking-widest uppercase ${couleur}`}>
            <Icone className="w-4 h-4" /><span>{etiquette}</span>
          </p>
          <h2 className="text-xl font-bold text-gray-800 mt-2">{axe.nom}</h2>
          {axe.signature && <p className="text-sm italic text-gray-500 mt-1">{axe.signature}</p>}
        </div>
        <span className={`text-2xl font-bold ${couleur} flex-shrink-0`}>{axe.pourcentage} %</span>
      </div>
      {axe.texte && <p className="mt-4 text-[15px] leading-7 text-gray-700">{axe.texte}</p>}
      {axe.impacts.length > 0 && (
        <ul className="mt-4 space-y-2">
          {axe.impacts.map((i, n) => (
            <li key={n} className="flex items-start space-x-3 text-sm text-gray-700">
              <span className={`mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 ${accent === 'marine' ? 'bg-marine-400' : 'bg-rose-400'}`} />
              <span>{i}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Colonne({ titre, jauges, accent, seuil }: { titre: string; jauges: Jauge[]; accent: string; seuil: number }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-800 mb-4">{titre}</h2>
      <div className="space-y-3">
        {jauges.map((j) => (
          <div key={j.code}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className={`text-sm ${j.dominant ? 'font-bold text-gray-900' : j.present ? 'font-medium text-gray-700' : 'text-gray-400'}`}>{j.nom}</span>
              <span className={`text-sm ${j.dominant ? 'font-bold text-gray-900' : 'text-gray-500'}`}>{j.pourcentage} %</span>
            </div>
            <div className="relative h-1.5 overflow-hidden rounded-full bg-gray-200">
              <div className={`h-full rounded-full ${j.dominant ? accent : j.present ? 'bg-gray-400' : 'bg-gray-300'}`} style={{ width: `${j.pourcentage}%` }} />
              <span className="absolute top-0 h-full w-px bg-gray-400/70" style={{ left: `${seuil}%` }} aria-hidden />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/*
  Les mensurations, une colonne par date. Seules les mesures relevées au
  moins une fois apparaissent, et la dernière colonne dit l'écart avec la
  première : c'est ce que la cliente veut lire.
*/
function Mensurations({ lignes }: { lignes: Mensuration[] }) {
  const mesures = MESURES.filter((m) => lignes.some((l) => l[m.cle] != null));
  if (!mesures.length) return null;
  const premiere = lignes[0], derniere = lignes[lignes.length - 1];
  const nombre = (v: unknown) => (v == null || v === '' ? null : Number(v));
  // Au-delà de quatre relevés, on montre le premier et les trois derniers : l'écart reste calculé sur tout.
  const colonnes = lignes.length > 4 ? [premiere, ...lignes.slice(-3)] : lignes;

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-6">
      <Titre icone={Ruler} texte="Vos mensurations" />
      <p className="text-sm text-gray-500 mt-1">Relevées au centre, en centimètres.</p>
      <div className="mt-4 -mx-2 overflow-x-auto">
        <table className="min-w-full text-xs sm:text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className="px-2 py-2 font-medium">Mesure</th>
              {colonnes.map((l) => <th key={l.date} className="px-2 py-2 font-medium whitespace-nowrap text-right">{dateChiffres(l.date)}</th>)}
              {lignes.length > 1 && <th className="px-2 py-2 font-medium text-right whitespace-nowrap">Écart</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {mesures.map((m) => {
              const a = nombre(premiere[m.cle]), b = nombre(derniere[m.cle]);
              const ecart = a != null && b != null ? Math.round((b - a) * 10) / 10 : null;
              return (
                <tr key={m.cle}>
                  <td className="px-2 py-2 text-gray-700 whitespace-nowrap">{m.nom}</td>
                  {colonnes.map((l) => {
                    const v = nombre(l[m.cle]);
                    return <td key={l.date} className="px-2 py-2 text-right text-gray-800">{v != null ? v : '—'}</td>;
                  })}
                  {lignes.length > 1 && (
                    <td className={`px-2 py-2 text-right font-semibold ${ecart == null ? 'text-gray-400' : ecart < 0 ? 'text-marine-700' : ecart > 0 ? 'text-rose-600' : 'text-gray-500'}`}>
                      {ecart == null ? '—' : ecart > 0 ? `+${ecart}` : ecart === 0 ? '=' : ecart}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
