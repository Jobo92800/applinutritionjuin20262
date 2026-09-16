import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Loader2, AlertCircle, CheckCircle, Smartphone, Pause, Play, RotateCcw, Mail, ChevronRight } from 'lucide-react';
import { adminParcoursApi, ClienteParcours, Cure, ParcoursApiError } from '../lib/parcoursApi';

/*
  Onglet Clientes de l'administration : qui a accès au parcours audio, avec
  quelle cure, et les actions du centre. Le chemin normal pour ouvrir un accès
  reste la signature du contrat dans l'application thérapeute ; le formulaire
  ici est un rattrapage.
*/

const CURES: { code: Cure; nom: string }[] = [
  { code: '3_month', nom: 'Cure 3 mois' },
  { code: '6_month', nom: 'Cure 6 mois' },
];

const MESSAGES: Record<string, string> = {
  'email-deja-utilise': 'Cette adresse a déjà un compte. Renseignez un mot de passe pour le redéfinir.',
  'email-invalide': 'Adresse e-mail invalide.',
  'prenom-requis': 'Le prénom est obligatoire.',
  'mot-de-passe-court': 'Le mot de passe doit faire au moins 8 caractères.',
  'parcours-inconnu': 'Cure inconnue.',
  'creation-refusee': 'Supabase a refusé la création du compte.',
  'invitation-refusee': "L'invitation n'a pas pu être envoyée.",
  'code-invalide': "Vous n'êtes pas autorisé à faire cette action.",
};
const libelle = (e: unknown) =>
  e instanceof ParcoursApiError ? (MESSAGES[e.code] || `Erreur : ${e.code}`) : 'Une erreur est survenue.';

export default function ClientesPanel() {
  const [clientes, setClientes] = useState<ClienteParcours[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [info, setInfo] = useState('');
  const [enCours, setEnCours] = useState<string | null>(null);   // id de la cliente en cours d'action
  const [formulaire, setFormulaire] = useState(false);
  const [nouvelle, setNouvelle] = useState({ prenom: '', nom: '', email: '', parcours: '3_month' as Cure, motDePasse: '' });
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur('');
    try {
      const { clientes } = await adminParcoursApi.liste();
      setClientes(clientes);
    } catch (e) {
      setErreur(libelle(e));
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const agir = async (id: string, action: () => Promise<unknown>, succes: string) => {
    setEnCours(id);
    setErreur('');
    setInfo('');
    try {
      await action();
      setInfo(succes);
      await charger();
    } catch (e) {
      setErreur(libelle(e));
    } finally {
      setEnCours(null);
    }
  };

  const creer = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnvoi(true);
    setErreur('');
    setInfo('');
    try {
      const r = await adminParcoursApi.creer({
        prenom: nouvelle.prenom.trim(),
        nom: nouvelle.nom.trim() || undefined,
        email: nouvelle.email.trim(),
        parcours: nouvelle.parcours,
        motDePasse: nouvelle.motDePasse || undefined,
      });
      setInfo(
        r.existante
          ? 'Compte existant : mot de passe redéfini et cure mise à jour.'
          : r.invitation.motDePasseDefini
            ? 'Compte créé. La cliente peut se connecter tout de suite avec ce mot de passe.'
            : 'Compte créé. Une invitation par e-mail lui permet de choisir son mot de passe (lien valable 24 h).'
      );
      setNouvelle({ prenom: '', nom: '', email: '', parcours: '3_month', motDePasse: '' });
      setFormulaire(false);
      await charger();
    } catch (err) {
      setErreur(libelle(err));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Clientes du parcours audio</h2>
          <p className="text-sm text-gray-500 mt-1">
            L'accès s'ouvre normalement à la signature du contrat. Ici, on répare : cure, mot de passe, appareils.
          </p>
        </div>
        <button
          onClick={() => setFormulaire(!formulaire)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Ajouter une cliente</span>
        </button>
      </div>

      {erreur && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{erreur}</span>
        </div>
      )}
      {info && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-start space-x-2">
          <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{info}</span>
        </div>
      )}

      {formulaire && (
        <form onSubmit={creer} className="bg-gray-50 border border-gray-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
            <input required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              value={nouvelle.prenom} onChange={(e) => setNouvelle({ ...nouvelle, prenom: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            <input className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              value={nouvelle.nom} onChange={(e) => setNouvelle({ ...nouvelle, nom: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
            <input required type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              value={nouvelle.email} onChange={(e) => setNouvelle({ ...nouvelle, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cure *</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              value={nouvelle.parcours} onChange={(e) => setNouvelle({ ...nouvelle, parcours: e.target.value as Cure })}>
              {CURES.map((c) => <option key={c.code} value={c.code}>{c.nom}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe choisi avec la cliente</label>
            <input type="text" autoComplete="off" minLength={8} placeholder="Laisser vide pour envoyer une invitation par e-mail"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              value={nouvelle.motDePasse} onChange={(e) => setNouvelle({ ...nouvelle, motDePasse: e.target.value })} />
            <p className="text-xs text-gray-500 mt-1">
              Avec un mot de passe, le compte marche immédiatement. Sans, la cliente reçoit un lien valable 24 h, à usage unique.
            </p>
          </div>
          <div className="md:col-span-2 flex justify-end space-x-3">
            <button type="button" onClick={() => setFormulaire(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Annuler</button>
            <button type="submit" disabled={envoi}
              className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2">
              {envoi && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Ouvrir l'accès</span>
            </button>
          </div>
        </form>
      )}

      {chargement ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Chargement…
        </div>
      ) : clientes.length === 0 ? (
        <p className="text-center text-gray-500 py-12">Aucune cliente n'a encore accès au parcours audio.</p>
      ) : (
        <div className="divide-y divide-gray-200 border border-gray-200 rounded-xl overflow-hidden">
          {clientes.map((c) => {
            const occupe = enCours === c.id;
            const suspendue = c.statut === 'suspendu';
            return (
              <div key={c.id} className={`p-4 flex flex-col xl:flex-row xl:items-center gap-4 ${suspendue ? 'bg-amber-50' : 'bg-white'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium text-gray-800">{c.prenom}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 whitespace-nowrap">{c.cureNom}</span>
                    {suspendue && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 whitespace-nowrap">Accès suspendu</span>}
                  </div>
                  <div className="text-sm text-gray-500 break-all">{c.email}</div>
                  <div className="text-sm text-gray-600 mt-1 flex items-center space-x-4">
                    <span>{c.terminees} / {c.total} étape{c.total > 1 ? 's' : ''}</span>
                    <span className="flex items-center space-x-1">
                      <Smartphone className="w-3.5 h-3.5" /><span>{c.appareils} / {c.appareilsMax}</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full mt-2 max-w-xs">
                    <div className="h-1.5 bg-green-500 rounded-full transition-all"
                      style={{ width: `${c.total ? Math.round(c.terminees / c.total * 100) : 0}%` }} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <select
                    disabled={occupe}
                    value={c.cure}
                    onChange={(e) => agir(c.id, () => adminParcoursApi.modifier(c.id, { cure: e.target.value as Cure }), 'Cure modifiée.')}
                    className="text-sm border border-gray-300 rounded-lg px-2 py-1.5"
                    title="Changer de cure"
                  >
                    {CURES.map((k) => <option key={k.code} value={k.code}>{k.nom}</option>)}
                  </select>
                  <button disabled={occupe} title="Débloquer l'étape suivante à la main"
                    onClick={() => agir(c.id, () => adminParcoursApi.validerEtape(c.id), 'Étape suivante débloquée.')}
                    className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-1">
                    <ChevronRight className="w-4 h-4" /><span>Étape suivante</span>
                  </button>
                  <button disabled={occupe} title="Réinitialiser les appareils reconnus"
                    onClick={() => agir(c.id, () => adminParcoursApi.modifier(c.id, { reinitialiserAppareils: true }), 'Appareils réinitialisés.')}
                    className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-1">
                    <RotateCcw className="w-4 h-4" /><span>Appareils</span>
                  </button>
                  <button disabled={occupe} title="Renvoyer un e-mail pour choisir un nouveau mot de passe"
                    onClick={() => agir(c.id, () => adminParcoursApi.renvoyerInvitation(c.id), 'E-mail envoyé (lien valable 24 h).')}
                    className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-1">
                    <Mail className="w-4 h-4" /><span>Mot de passe</span>
                  </button>
                  <button disabled={occupe} title={suspendue ? "Rétablir l'accès" : "Suspendre l'accès"}
                    onClick={() => agir(c.id, () => adminParcoursApi.modifier(c.id, { statut: suspendue ? 'actif' : 'suspendu' }), suspendue ? 'Accès rétabli.' : 'Accès suspendu.')}
                    className={`text-sm px-3 py-1.5 border rounded-lg flex items-center space-x-1 ${suspendue ? 'border-green-300 text-green-700 hover:bg-green-50' : 'border-amber-300 text-amber-700 hover:bg-amber-50'}`}>
                    {occupe ? <Loader2 className="w-4 h-4 animate-spin" /> : suspendue ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    <span>{suspendue ? 'Rétablir' : 'Suspendre'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
