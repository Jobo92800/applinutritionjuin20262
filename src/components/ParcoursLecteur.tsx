import { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, RotateCw, Headphones, Lock, FileText, ExternalLink, PartyPopper } from 'lucide-react';
import { parcoursApi, EtapeParcours, ParcoursApiError } from '../lib/parcoursApi';
import { supabase } from '../lib/supabase';
import { empaqueter, depaqueter, tauxLocal, mmss } from '../lib/parcoursEcoute';

/*
  Le lecteur d'une étape. Porté de « Mon Parcours » (index.html), avec ses
  règles :
  - le navigateur coche les secondes traversées, envoie le bitset toutes les
    30 s, à la pause, à la fin et à la fermeture de la page ; le serveur décide ;
  - avancer compte comme écouté, reculer ne décoche rien ;
  - la validation à 90 % ne coupe jamais l'épisode : on la signale, la
    célébration attend la fin ;
  - iOS ignore preload : on retient l'intention de lecture et on relance sur
    canplay, pour qu'un seul appui suffise.
*/

const SAUVEGARDE_MS = 30000;

interface Props {
  etape: EtapeParcours;
  appareil: string;
  seuil: number;
  total: number;
  onRetour: () => void;
  /** L'étape vient d'être validée et l'épisode est fini : le parent rafraîchit. */
  onSuivante: () => void;
}

export default function ParcoursLecteur({ etape, appareil, seuil, total, onRetour, onSuivante }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const couv = useRef<Uint8Array | null>(null);
  const dureeEp = useRef(0);
  const derniereSeconde = useRef(0);
  const sale = useRef(false);
  const envoiEnCours = useRef(false);
  const intentionLecture = useRef(false);
  const celebrationEnAttente = useRef(false);
  const jetonAcces = useRef<string | null>(null);

  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [enLecture, setEnLecture] = useState(false);
  const [temps, setTemps] = useState(0);
  const [duree, setDuree] = useState(etape.dureeSec || 0);
  const [taux, setTaux] = useState(etape.taux || 0);
  const [validee, setValidee] = useState(etape.terminee);
  const [celebration, setCelebration] = useState(false);
  const [fichePdf, setFichePdf] = useState<string | null>(null);

  const numero = etape.numero;

  /* ------------------------------------------------------------ envoi --- */
  const envoyer = useCallback(async (): Promise<void> => {
    const audio = audioRef.current;
    if (!couv.current || !audio || envoiEnCours.current || celebration) return;
    envoiEnCours.current = true;
    try {
      const rep = await parcoursApi.progression({
        numero, appareil,
        couverture: empaqueter(couv.current),
        position: Math.floor(audio.currentTime),
        duree: dureeEp.current,
      });
      sale.current = false;
      if (rep.terminee && !validee) {
        // Validée à 90 % : on le dit, et on laisse l'épisode se terminer.
        setValidee(true);
        if (audio.ended) setCelebration(true);
        else celebrationEnAttente.current = true;
      }
    } catch {
      sale.current = true;
    } finally {
      envoiEnCours.current = false;
    }
  }, [numero, appareil, validee, celebration]);

  /** Dernier envoi quand la page se ferme : sendBeacon survit à la fermeture. */
  const envoiUltime = useCallback(() => {
    const audio = audioRef.current;
    if (!couv.current || !audio || !jetonAcces.current) return;
    const charge = JSON.stringify({
      acces: jetonAcces.current, appareil, numero,
      couverture: empaqueter(couv.current), position: Math.floor(audio.currentTime), duree: dureeEp.current,
    });
    try {
      navigator.sendBeacon('/api/progression', new Blob([charge], { type: 'application/json' }));
    } catch { /* rien de plus à tenter */ }
  }, [appareil, numero]);

  /* ------------------------------------------------------- chargement --- */
  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        jetonAcces.current = data?.session?.access_token || null;
        const rep = await parcoursApi.audio(numero, appareil);
        if (annule || !audioRef.current) return;
        if (rep.dureeSec) {
          dureeEp.current = rep.dureeSec;
          setDuree(rep.dureeSec);
          couv.current = depaqueter(etape.couverture, rep.dureeSec);
        }
        audioRef.current.src = rep.url;
        audioRef.current.load();
        setFichePdf(rep.fichePdf || null);
        setChargement(false);
      } catch (e) {
        if (annule) return;
        const code = e instanceof ParcoursApiError ? e.code : '';
        setErreur(
          code === 'etape-verrouillee' ? "Cette étape n'est pas encore disponible."
          : code === 'audio-absent' ? "L'audio de cette étape arrive bientôt."
          : "L'épisode n'a pas pu être chargé. Vérifiez votre connexion."
        );
        setChargement(false);
      }
    })();
    return () => { annule = true; };
  }, [numero, appareil, etape.couverture]);

  /* --------------------------------------------- événements du lecteur --- */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    /*
      Appelé à chaque timeupdate et à chaque seeked. On ne se fie pas à l'ordre
      des événements (Chrome émet timeupdate avant seeked) : un saut se voit à
      la distance parcourue. Avancer compte comme écouté ; reculer ne décoche
      rien.
    */
    const traverser = () => {
      if (!couv.current) return;
      const s = Math.floor(audio.currentTime);
      if (s > derniereSeconde.current + 1) {
        for (let i = derniereSeconde.current; i < s && i < couv.current.length; i++) couv.current[i] = 1;
      }
      if (!audio.paused && s >= 0 && s < couv.current.length) couv.current[s] = 1;
      derniereSeconde.current = s;
      sale.current = true;
    };

    const onMetadata = () => {
      // Durée de référence : celle du serveur, sinon celle du fichier.
      if (!dureeEp.current && audio.duration && isFinite(audio.duration)) {
        dureeEp.current = Math.floor(audio.duration);
        setDuree(dureeEp.current);
        couv.current = depaqueter(etape.couverture, dureeEp.current);
      }
      const pos = etape.position || 0;
      if (pos > 0 && pos < dureeEp.current - 2) {
        derniereSeconde.current = pos;      // reprendre ici ne coche pas ce qui précède
        audio.currentTime = pos;
        setTemps(pos);
      }
    };
    const onTime = () => {
      traverser();
      setTemps(audio.currentTime);
      const t = tauxLocal(couv.current);
      setTaux(t);
      if (t >= seuil && !validee) envoyer();
    };
    const onSeeked = () => {
      traverser();
      setTemps(audio.currentTime);
      setTaux(tauxLocal(couv.current));
    };
    const onPlay = () => setEnLecture(true);
    const onPause = () => { setEnLecture(false); envoyer(); };
    const onEnded = () => {
      intentionLecture.current = false;
      setEnLecture(false);
      if (celebrationEnAttente.current) { celebrationEnAttente.current = false; setCelebration(true); }
      else envoyer();
    };
    const onCanPlay = () => { if (intentionLecture.current && audio.paused) audio.play().catch(() => {}); };
    const onError = () => {
      intentionLecture.current = false;
      setEnLecture(false);
      if (audio.getAttribute('src')) setErreur("L'épisode n'a pas pu être lu. Vérifiez votre connexion.");
    };

    audio.addEventListener('loadedmetadata', onMetadata);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('seeked', onSeeked);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('loadedmetadata', onMetadata);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('seeked', onSeeked);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('error', onError);
    };
  }, [etape.couverture, etape.position, seuil, validee, envoyer]);

  /* --------------------------------- envoi périodique et à la fermeture --- */
  // Les callbacks changent d'identité au fil de l'état ; on passe par des refs
  // pour que cet effet ne tourne qu'une fois. Son nettoyage coupe le son : il
  // ne doit s'exécuter qu'au démontage, jamais à une validation.
  const envoyerRef = useRef(envoyer);
  const envoiUltimeRef = useRef(envoiUltime);
  envoyerRef.current = envoyer;
  envoiUltimeRef.current = envoiUltime;
  useEffect(() => {
    const audio = audioRef.current;
    const minuteur = setInterval(() => { if (sale.current) envoyerRef.current(); }, SAUVEGARDE_MS);
    const onVisibilite = () => { if (document.hidden) envoiUltimeRef.current(); };
    const onPageHide = () => envoiUltimeRef.current();
    document.addEventListener('visibilitychange', onVisibilite);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      clearInterval(minuteur);
      document.removeEventListener('visibilitychange', onVisibilite);
      window.removeEventListener('pagehide', onPageHide);
      // On quitte l'écran : dernier envoi, et on coupe le son.
      envoiUltimeRef.current();
      audio?.pause();
    };
  }, []);

  /* -------------------------------------------------------- commandes --- */
  const basculer = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      intentionLecture.current = true;
      setEnLecture(true);                 // le bouton réagit tout de suite
      audio.play().catch(() => {});
    } else {
      intentionLecture.current = false;
      audio.pause();
    }
  };
  const deplacer = (vers: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min((audio.duration || dureeEp.current || 0) - 0.3, vers));
  };
  const retour = () => {
    if (celebrationEnAttente.current) { celebrationEnAttente.current = false; setCelebration(true); }
    else onRetour();
  };

  const d = duree || 1;
  const pcLu = Math.min(100, (temps / d) * 100);
  const pcSeuil = Math.min(100, Math.round((taux / seuil) * 100));
  const resteMin = Math.max(0, Math.ceil(((seuil - taux) * d) / 60));

  return (
    <div className="max-w-2xl mx-auto">
      <audio ref={audioRef} preload="metadata" />

      <button onClick={retour} className="flex items-center space-x-2 text-gray-600 hover:text-green-600 mb-4">
        <ArrowLeft className="w-5 h-5" /><span>Mon parcours</span>
      </button>

      <p className="text-xs font-semibold tracking-widest uppercase text-pink-600">Étape {numero} sur {total}</p>
      <h1 className="text-2xl font-bold text-gray-800 mt-1 mb-6">{etape.titre}</h1>

      {erreur ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-start space-x-3">
          <Lock className="w-5 h-5 mt-0.5 flex-shrink-0" /><span>{erreur}</span>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {/* Le bouton lecture, entouré de l'anneau de progression */}
          <div className="flex flex-col items-center">
            <div className="relative w-28 h-28">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="45" fill="none" stroke="#E5E7EB" strokeWidth="5" />
                <circle cx="48" cy="48" r="45" fill="none" stroke="#16A34A" strokeWidth="5" strokeLinecap="round"
                  strokeDasharray="282.7" strokeDashoffset={282.7 - (pcLu / 100) * 282.7} className="transition-all" />
              </svg>
              <button
                onClick={basculer}
                disabled={chargement}
                aria-label={enLecture ? 'Pause' : 'Lecture'}
                className="absolute inset-3 rounded-full bg-green-600 text-white flex items-center justify-center shadow-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {chargement ? <Headphones className="w-8 h-8 animate-pulse" /> : enLecture ? <Pause className="w-9 h-9" /> : <Play className="w-9 h-9 ml-1" />}
              </button>
            </div>

            <div className="flex items-center space-x-6 mt-5">
              <button onClick={() => deplacer(temps - 15)} className="text-gray-500 hover:text-gray-800 flex flex-col items-center" aria-label="Reculer de 15 secondes">
                <RotateCcw className="w-6 h-6" /><span className="text-xs mt-1">15 s</span>
              </button>
              <button onClick={() => deplacer(temps + 15)} className="text-gray-500 hover:text-gray-800 flex flex-col items-center" aria-label="Avancer de 15 secondes">
                <RotateCw className="w-6 h-6" /><span className="text-xs mt-1">15 s</span>
              </button>
            </div>
          </div>

          <div className="mt-6">
            <input
              type="range" min={0} max={1000} value={Math.round((temps / d) * 1000)}
              onChange={(e) => deplacer((Number(e.target.value) / 1000) * d)}
              className="w-full accent-green-600"
              aria-label="Position dans l'épisode"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{mmss(temps)}</span><span>{mmss(duree)}</span>
            </div>
          </div>

          {/* L'avancement vers le déblocage */}
          <div className="mt-6 bg-gray-50 rounded-xl p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Écouté</span>
              <span className="font-semibold text-gray-800">{Math.round(taux * 100)} %</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pcSeuil}%` }} />
            </div>
            <p className="text-sm text-gray-600 mt-3">
              {validee
                ? '🔓 Étape validée, la suivante est disponible.'
                : taux > 0
                  ? `Encore environ ${resteMin} min d'écoute pour débloquer l'étape suivante.`
                  : "L'étape suivante se débloque une fois cet épisode écouté."}
            </p>
          </div>

          {/* La fiche récap : le support écrit de l'épisode, à portée de main du lecteur. */}
          {fichePdf && (
            <a href={fichePdf} target="_blank" rel="noopener noreferrer"
              className="mt-4 w-full flex items-center justify-center space-x-2 bg-marine-600 text-white py-3 rounded-full font-semibold hover:bg-marine-700 hover:-translate-y-px transition-all shadow-carte">
              <FileText className="w-5 h-5" /><span>Ouvrir la fiche récap de l'étape</span>
            </a>
          )}
        </div>
      )}

      {/* Le contenu de l'étape */}
      {etape.description && (
        <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-6">
          <p className="text-gray-700 leading-relaxed">{etape.description}</p>
        </div>
      )}
      {etape.pointsCles && etape.pointsCles.length > 0 && (
        <div className="mt-4 bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-3">Points clés</h2>
          <ul className="space-y-2">
            {etape.pointsCles.map((p, i) => (
              <li key={i} className="flex items-start space-x-2 text-gray-700"><span className="text-green-600 mt-0.5">•</span><span>{p}</span></li>
            ))}
          </ul>
        </div>
      )}
      {etape.defis && etape.defis.length > 0 && (
        <div className="mt-4 bg-green-50 rounded-2xl border border-green-200 p-6">
          <h2 className="font-semibold text-green-800 mb-3">Défis de la semaine</h2>
          <ul className="space-y-2">
            {etape.defis.map((p, i) => (
              <li key={i} className="flex items-start space-x-2 text-green-900"><span className="mt-0.5">✓</span><span>{p}</span></li>
            ))}
          </ul>
        </div>
      )}
      {(etape.supportPdf || (etape.boutons && etape.boutons.length > 0)) && (
        <div className="mt-4 flex flex-wrap gap-3">
          {etape.supportPdf && (
            <a href={etape.supportPdf} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
              <FileText className="w-4 h-4" /><span>Support PDF</span>
            </a>
          )}
          {etape.boutons?.map((b, i) => (
            <a key={i} href={b.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700">
              <ExternalLink className="w-4 h-4" /><span>{b.text}</span>
            </a>
          ))}
        </div>
      )}

      {/* La célébration : à la fin de l'épisode, jamais avant */}
      {celebration && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
            <PartyPopper className="w-12 h-12 text-pink-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800">Bravo !</h2>
            <p className="text-gray-600 mt-2">
              {numero >= total
                ? "🎉 Vous avez terminé l'ensemble de votre parcours audio."
                : '🔓 Votre prochaine étape est maintenant disponible.'}
            </p>
            <button onClick={() => { setCelebration(false); onSuivante(); }}
              className="mt-6 w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700">
              {numero >= total ? 'Revenir à mon parcours' : 'Découvrir la prochaine étape'}
            </button>
            <button onClick={() => { setCelebration(false); onRetour(); }}
              className="mt-3 text-sm text-gray-500 hover:text-gray-700">Plus tard</button>
          </div>
        </div>
      )}
    </div>
  );
}
