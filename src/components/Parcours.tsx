import { useState, useEffect, useCallback } from 'react';
import { Headphones, Lock, Check, Play, Loader2, Bell, X } from 'lucide-react';
import { parcoursApi, EtatParcours, EtapeParcours, ParcoursApiError } from '../lib/parcoursApi';
import { idAppareil, minutes, mmss } from '../lib/parcoursEcoute';
import { isPushSupported, permissionState, isSubscribed, subscribeToPush, iosNeedsInstall } from '../lib/webpush';
import { useAuth } from '../contexts/AuthContext';
import ParcoursLecteur from './ParcoursLecteur';

/*
  Le parcours audio de la cliente : une étape après l'autre. Ce que le serveur
  ne renvoie pas — les titres des étapes verrouillées — n'existe pas ici.
*/

const MESSAGES: Record<string, { titre: string; texte: string }> = {
  'compte-sans-parcours': {
    titre: 'Votre parcours audio arrive',
    texte: "Votre accès n'est pas encore ouvert. Il s'active avec votre cure : parlez-en à votre centre MAbeautyplus.",
  },
  'acces-suspendu': {
    titre: 'Accès suspendu',
    texte: 'Votre accès au parcours audio a été suspendu. Contactez votre centre MAbeautyplus.',
  },
  'parcours-vide': {
    titre: 'Les épisodes arrivent bientôt',
    texte: 'Votre parcours est en préparation. Revenez dans quelques jours.',
  },
  'session-expiree': {
    titre: 'Session expirée',
    texte: 'Déconnectez-vous puis reconnectez-vous pour reprendre votre parcours.',
  },
};

const CLE_RAPPELS_REFUSES = 'mbp_rappels_refuses';

/*
  Invitation à activer les notifications : « votre nouvelle étape est
  disponible », et un rappel si le parcours reste sans écoute une semaine.
  Discrète, et qui ne revient pas si la cliente l'a fermée.
*/
function InvitationRappels() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        if (!isPushSupported() || iosNeedsInstall() || permissionState() === 'denied') return;
        if (localStorage.getItem(CLE_RAPPELS_REFUSES)) return;
        if (await isSubscribed()) return;
        if (!annule) setVisible(true);
      } catch { /* pas d'invitation plutôt qu'une erreur */ }
    })();
    return () => { annule = true; };
  }, []);

  if (!visible) return null;

  const activer = async () => {
    if (!user) return;
    setEnCours(true);
    try {
      const ok = await subscribeToPush(user.id);
      if (ok) { setMessage('C\'est activé : vous serez prévenue à chaque nouvelle étape.'); setTimeout(() => setVisible(false), 2500); }
      else setMessage('Les notifications ont été refusées par le navigateur.');
    } catch {
      setMessage("Impossible d'activer les notifications sur cet appareil.");
    } finally {
      setEnCours(false);
    }
  };
  const fermer = () => {
    try { localStorage.setItem(CLE_RAPPELS_REFUSES, '1'); } catch { /* sans stockage, l'invitation reviendra */ }
    setVisible(false);
  };

  return (
    <div className="bg-marine-50 border border-marine-200 rounded-2xl p-4 flex items-start gap-3">
      <Bell className="w-5 h-5 text-marine-700 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-marine-900">
          {message || 'Recevez une notification quand votre nouvelle étape est disponible.'}
        </p>
        {!message && (
          <button onClick={activer} disabled={enCours}
            className="mt-2 text-sm font-semibold text-white bg-marine-600 hover:bg-marine-700 disabled:opacity-50 px-4 py-1.5 rounded-full">
            {enCours ? 'Activation…' : 'Activer les notifications'}
          </button>
        )}
      </div>
      <button onClick={fermer} aria-label="Ne plus proposer" className="text-marine-400 hover:text-marine-700">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function Parcours() {
  const appareil = idAppareil();
  const [etat, setEtat] = useState<EtatParcours | null>(null);
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(true);
  const [ouverte, setOuverte] = useState<number | null>(null);   // numéro de l'étape dans le lecteur

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      setEtat(await parcoursApi.etat(appareil));
      setErreur('');
    } catch (e) {
      setErreur(e instanceof ParcoursApiError ? e.code : 'erreur');
    } finally {
      setChargement(false);
    }
  }, [appareil]);

  useEffect(() => { charger(); }, [charger]);

  if (chargement && !etat) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Ouverture de votre parcours…
      </div>
    );
  }

  if (erreur || !etat) {
    const m = MESSAGES[erreur] || { titre: 'Un problème est survenu', texte: "Votre parcours n'a pas pu être chargé. Vérifiez votre connexion et réessayez." };
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-pink-400 flex items-center justify-center mx-auto mb-5">
          <Lock className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">{m.titre}</h1>
        <p className="text-gray-600 mt-3">{m.texte}</p>
        <button onClick={charger} className="mt-6 px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Réessayer</button>
      </div>
    );
  }

  const courante = etat.etapes[etat.disponible];
  const etapeOuverte = ouverte !== null ? etat.etapes.find((e) => e.numero === ouverte) : null;

  if (etapeOuverte && etapeOuverte.accessible) {
    return (
      <ParcoursLecteur
        key={etapeOuverte.numero}
        etape={etapeOuverte}
        appareil={appareil}
        seuil={etat.seuil}
        total={etat.total}
        onRetour={() => { setOuverte(null); charger(); }}
        onSuivante={async () => {
          const nouvel = await parcoursApi.etat(appareil).catch(() => null);
          if (nouvel) setEtat(nouvel);
          const suivante = nouvel?.etapes[nouvel.disponible];
          setOuverte(suivante && !suivante.terminee && suivante.numero !== etapeOuverte.numero ? suivante.numero : null);
        }}
      />
    );
  }

  const pourcent = etat.total ? Math.round((etat.terminees / etat.total) * 100) : 0;
  const toutFini = etat.terminees >= etat.total;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase text-green-600">Bonjour {etat.cliente.prenom}</p>
        <h1 className="text-2xl font-bold text-gray-800 mt-1">Votre parcours MAbeautyplus</h1>
        <p className="text-sm text-gray-500 mt-1">{etat.cliente.cure} · une étape à la fois, à votre rythme.</p>
      </div>

      <InvitationRappels />

      {/* Avancement global */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-700">{etat.terminees} étape{etat.terminees > 1 ? 's' : ''} terminée{etat.terminees > 1 ? 's' : ''} sur {etat.total}</span>
          <span className="font-semibold text-pink-600">{pourcent} %</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-500 to-pink-500 rounded-full transition-all" style={{ width: `${pourcent}%` }} />
        </div>
      </div>

      {/* L'étape du moment */}
      {courante && (
        <div className="bg-white rounded-2xl border-l-4 border-green-500 shadow-sm p-5">
          <p className="text-xs font-semibold tracking-widest uppercase text-pink-600">
            {toutFini ? 'Parcours terminé' : `Étape ${courante.numero}`}
          </p>
          <h2 className="text-xl font-bold text-gray-800 mt-1">{courante.titre}</h2>
          <p className="text-sm text-gray-500 mt-2 flex items-center space-x-2">
            <Headphones className="w-4 h-4" />
            <span>
              {minutes(courante.dureeSec)}
              {courante.position ? ` · vous étiez à ${mmss(courante.position)}` : ''}
            </span>
          </p>
          <button
            onClick={() => setOuverte(courante.numero)}
            className="mt-4 w-full bg-pink-600 text-white py-3 rounded-full font-medium hover:bg-pink-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Play className="w-5 h-5" />
            <span>{toutFini ? 'Réécouter' : courante.position ? 'Reprendre mon écoute' : 'Commencer'}</span>
          </button>
        </div>
      )}

      {/* La frise */}
      <div>
        <h2 className="font-semibold text-gray-800 mb-3">Votre parcours</h2>
        <ol className="relative border-l-2 border-gray-200 ml-4 space-y-6">
          {etat.etapes.map((e, i) => <Etape key={e.numero} etape={e} premiereVerrouillee={i === etat.disponible + 1} onOuvrir={() => setOuverte(e.numero)} />)}
        </ol>
      </div>
    </div>
  );
}

function Etape({ etape, premiereVerrouillee, onOuvrir }: { etape: EtapeParcours; premiereVerrouillee: boolean; onOuvrir: () => void }) {
  const pc = Math.round((etape.taux || 0) * 100);
  const pastille = etape.terminee
    ? 'bg-green-500 text-white'
    : etape.accessible ? 'bg-pink-600 text-white ring-4 ring-pink-100' : 'bg-white border-2 border-gray-300 text-gray-400';

  return (
    <li className="ml-6">
      <span className={`absolute -left-4 w-8 h-8 rounded-full flex items-center justify-center text-sm ${pastille}`}>
        {etape.terminee ? <Check className="w-4 h-4" /> : etape.accessible ? <Play className="w-3.5 h-3.5 ml-0.5" /> : <Lock className="w-3.5 h-3.5" />}
      </span>
      {etape.accessible ? (
        <button onClick={onOuvrir} className="text-left w-full">
          <p className={`font-medium ${etape.terminee ? 'text-gray-700' : 'text-pink-700'}`}>{etape.numero}. {etape.titre}</p>
          <p className="text-sm text-gray-500">
            {etape.terminee ? 'Terminée' : pc > 0 ? `En cours · ${pc} % écouté` : 'Disponible'}
          </p>
        </button>
      ) : (
        <div>
          <p className="font-medium text-gray-400">{premiereVerrouillee ? 'Votre prochaine étape' : `Étape ${etape.numero}`}</p>
          <p className="text-sm text-gray-400">{premiereVerrouillee ? `Se débloque après l'étape ${etape.numero - 1}` : 'À venir'}</p>
        </div>
      )}
    </li>
  );
}
