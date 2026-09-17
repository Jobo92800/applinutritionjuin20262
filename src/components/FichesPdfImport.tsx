import { useState, useEffect, useCallback } from 'react';
import { FileText, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { adminParcoursApi, Cure } from '../lib/parcoursApi';

/*
  Dépôt groupé des fiches récapitulatives PDF, une par cure et par étape.

  Les fichiers sont reconnus à leur nom : MAB_Cure3mois_S01_Phase-dattaque.pdf
  → cure 3 mois, étape 2 (S00 est l'introduction, donc l'étape 1). On montre
  la correspondance avant d'envoyer, et ce qui n'a pas d'épisode est signalé
  plutôt que déposé au hasard.
*/

const CURE_DU_CODE: Record<string, Cure> = { '3': '3_month', '6': '6_month' };
const CODE_PARCOURS: Record<Cure, string> = { '3_month': 'B', '6_month': 'C' };
const NOM_CURE: Record<Cure, string> = { '3_month': 'Cure 3 mois', '6_month': 'Cure 6 mois' };

interface Etape { id: string; parcours_code: string; numero: number; titre: string; fiche: boolean }
interface Ligne { fichier: File; cure?: Cure; numero?: number; etape?: Etape; raison?: string; etat: 'attente' | 'envoi' | 'ok' | 'erreur' }

function reconnaitre(fichier: File, etapes: Etape[]): Ligne {
  const m = /^MAB_Cure(3|6)mois_S(\d{1,2})_/i.exec(fichier.name);
  if (!m) return { fichier, etat: 'attente', raison: 'nom non reconnu (attendu : MAB_Cure3mois_S01_…)' };
  if (!/\.pdf$/i.test(fichier.name)) return { fichier, etat: 'attente', raison: "ce n'est pas un PDF" };
  const cure = CURE_DU_CODE[m[1]];
  const numero = Number(m[2]) + 1;
  const etape = etapes.find((e) => e.parcours_code === CODE_PARCOURS[cure] && e.numero === numero);
  if (!etape) return { fichier, cure, numero, etat: 'attente', raison: `aucun épisode n° ${numero} en ${NOM_CURE[cure]}` };
  return { fichier, cure, numero, etape, etat: 'attente' };
}

export default function FichesPdfImport() {
  const [etapes, setEtapes] = useState<Etape[]>([]);
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [bilan, setBilan] = useState('');

  const charger = useCallback(async () => {
    try { setEtapes((await adminParcoursApi.etapesAdmin()).etapes); } catch { /* la liste restera vide */ }
  }, []);
  useEffect(() => { charger(); }, [charger]);

  const total = etapes.length;
  const avecFiche = etapes.filter((e) => e.fiche).length;

  const choisir = (fichiers: FileList | null) => {
    if (!fichiers) return;
    setBilan('');
    setLignes(Array.from(fichiers).map((f) => reconnaitre(f, etapes)).sort((a, b) => a.fichier.name.localeCompare(b.fichier.name)));
  };

  const deposer = async () => {
    setEnvoi(true);
    let ok = 0, ko = 0;
    const suivantes = [...lignes];
    for (let i = 0; i < suivantes.length; i++) {
      const l = suivantes[i];
      if (!l.etape || !l.cure) continue;
      suivantes[i] = { ...l, etat: 'envoi' }; setLignes([...suivantes]);
      try {
        const nom = l.fichier.name.replace(/[^A-Za-z0-9._-]/g, '-');
        const { url, chemin } = await adminParcoursApi.urlEnvoi(`fiches/${nom}`);
        const r = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: l.fichier });
        if (!r.ok) throw new Error(`envoi refusé : ${r.status}`);
        await adminParcoursApi.ficheMaj(l.etape.id, l.cure, chemin);
        suivantes[i] = { ...l, etat: 'ok' }; ok++;
      } catch (e) {
        suivantes[i] = { ...l, etat: 'erreur', raison: e instanceof Error ? e.message : 'erreur' }; ko++;
      }
      setLignes([...suivantes]);
    }
    setEnvoi(false);
    setBilan(`${ok} fiche${ok > 1 ? 's' : ''} déposée${ok > 1 ? 's' : ''}${ko ? `, ${ko} en échec` : ''}.`);
    await charger();
  };

  const pretes = lignes.filter((l) => l.etape && l.etat === 'attente').length;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-800 flex items-center space-x-2">
            <FileText className="w-4 h-4" /><span>Fiches récap PDF</span>
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {total ? `${avecFiche} / ${total} étapes ont leur fiche.` : ''} Une fiche par cure et par étape ; le nom du fichier fait le lien
            (<code className="text-xs">MAB_Cure3mois_S01_….pdf</code>).
          </p>
        </div>
        <label className="cursor-pointer bg-marine-100 text-marine-800 hover:bg-marine-200 px-4 py-2 rounded-full text-sm font-medium flex items-center space-x-2 whitespace-nowrap">
          <Upload className="w-4 h-4" /><span>Choisir les fichiers</span>
          <input type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={(e) => { choisir(e.target.files); e.target.value = ''; }} />
        </label>
      </div>

      {bilan && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm flex items-center space-x-2">
          <CheckCircle className="w-4 h-4" /><span>{bilan}</span>
        </div>
      )}

      {lignes.length > 0 && (
        <>
          <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden text-sm">
            {lignes.map((l) => (
              <div key={l.fichier.name} className={`px-3 py-2 flex items-center gap-3 ${l.etape ? '' : 'bg-amber-50'}`}>
                <span className="flex-shrink-0 w-5">
                  {l.etat === 'ok' ? <CheckCircle className="w-4 h-4 text-green-600" />
                    : l.etat === 'envoi' ? <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                    : l.etat === 'erreur' || !l.etape ? <AlertCircle className="w-4 h-4 text-amber-600" />
                    : <FileText className="w-4 h-4 text-gray-400" />}
                </span>
                <span className="font-mono text-xs text-gray-600 truncate flex-1">{l.fichier.name}</span>
                <span className="text-gray-700 truncate flex-1">
                  {l.etape && l.cure
                    ? <>{NOM_CURE[l.cure]} · étape {l.numero} — {l.etape.titre}{l.etape.fiche ? <span className="text-gray-400"> (remplace)</span> : ''}</>
                    : <span className="text-amber-700">{l.raison}</span>}
                </span>
              </div>
            ))}
          </div>
          {pretes > 0 && (
            <div className="flex justify-end">
              <button onClick={deposer} disabled={envoi}
                className="bg-rose-500 text-white px-5 py-2 rounded-full hover:bg-rose-600 disabled:opacity-50 text-sm font-medium flex items-center space-x-2">
                {envoi && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Déposer {pretes} fiche{pretes > 1 ? 's' : ''}</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
