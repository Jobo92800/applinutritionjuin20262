import { useEffect, useState } from 'react';
import { CalendarClock, Check, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { isPushSupported, permissionState, isSubscribed, subscribeToPush, iosNeedsInstall } from '../lib/webpush';

/*
  Le jour de pesée.

  « Choisissez un jour fixe hebdomadaire pour vous peser, le matin à jeun » :
  c'est la première consigne de l'introduction du parcours, et le rituel autour
  duquel toute la méthode s'organise. L'application ne le demandait nulle part.

  Elle le demande ici, à côté de la courbe — pas enfoui dans les réglages du
  compte —, et le rappelle ce matin-là à 8 h. Une cliente qui ne choisit rien
  ne reçoit rien : le silence est le réglage par défaut.
*/

const JOURS = [
  { iso: 1, court: 'lun.', long: 'lundi' },
  { iso: 2, court: 'mar.', long: 'mardi' },
  { iso: 3, court: 'mer.', long: 'mercredi' },
  { iso: 4, court: 'jeu.', long: 'jeudi' },
  { iso: 5, court: 'ven.', long: 'vendredi' },
  { iso: 6, court: 'sam.', long: 'samedi' },
  { iso: 7, court: 'dim.', long: 'dimanche' },
];

export default function JourDePesee() {
  const { user } = useAuth();
  const [jour, setJour] = useState<number | null>(null);
  const [charge, setCharge] = useState(false);
  const [enregistre, setEnregistre] = useState<'repos' | 'encours' | 'fait' | 'erreur'>('repos');
  const [notificationsActives, setNotificationsActives] = useState<boolean | null>(null);
  const [activation, setActivation] = useState(false);

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured) { setCharge(true); return; }
    let vivant = true;
    (async () => {
      try {
        const { data } = await supabase.from('profiles').select('jour_pesee').eq('id', user.id).maybeSingle();
        if (vivant) setJour((data as { jour_pesee?: number | null } | null)?.jour_pesee ?? null);
      } catch {
        /* la carte reste utilisable, elle part de « aucun jour » */
      } finally {
        if (vivant) setCharge(true);
      }
    })();
    return () => { vivant = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!isPushSupported() || iosNeedsInstall()) { setNotificationsActives(false); return; }
    if (permissionState() !== 'granted') { setNotificationsActives(false); return; }
    isSubscribed().then(setNotificationsActives).catch(() => setNotificationsActives(false));
  }, []);

  const choisir = async (iso: number | null) => {
    if (!user?.id) return;
    const nouveau = jour === iso ? null : iso;   // re-cliquer sur son jour l'enlève
    setJour(nouveau);
    if (!isSupabaseConfigured) { setEnregistre('fait'); return; }

    setEnregistre('encours');
    const { error } = await supabase.from('profiles').update({ jour_pesee: nouveau }).eq('id', user.id);
    setEnregistre(error ? 'erreur' : 'fait');
    if (!error) setTimeout(() => setEnregistre('repos'), 2500);
  };

  const activerLesNotifications = async () => {
    if (!user?.id) return;
    setActivation(true);
    try {
      setNotificationsActives(await subscribeToPush(user.id));
    } catch {
      setNotificationsActives(false);
    } finally {
      setActivation(false);
    }
  };

  if (!charge) return null;

  const choisi = JOURS.find((j) => j.iso === jour);

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="surtitre flex items-center space-x-2">
        <CalendarClock className="w-4 h-4" /><span>Votre jour de pesée</span>
      </h2>
      <p className="mt-2 text-[15px] leading-7 text-gray-700">
        Un jour fixe, le matin à jeun : c'est ce qui rend votre courbe lisible. Choisissez le vôtre,
        et nous vous le rappellerons ce matin-là.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {JOURS.map((j) => {
          const actif = jour === j.iso;
          return (
            <button key={j.iso} type="button" onClick={() => choisir(j.iso)} aria-pressed={actif}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                actif ? 'border-marine-600 bg-marine-700 text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-marine-400'}`}>
              {j.court}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-sm text-gray-500">
        {choisi
          ? <>Rappel le <b className="font-semibold text-gray-700">{choisi.long} matin</b>. Appuyez à nouveau sur {choisi.court} pour ne plus en recevoir.</>
          : "Aucun jour choisi : vous ne recevez aucun rappel de pesée."}
        {enregistre === 'encours' && <Loader2 className="inline w-3.5 h-3.5 animate-spin ml-2" />}
        {enregistre === 'fait' && <Check className="inline w-3.5 h-3.5 text-marine-700 ml-2" />}
        {enregistre === 'erreur' && <span className="ml-2 text-rose-600">Enregistrement impossible, réessayez.</span>}
      </p>

      {/* Le rappel passe par les notifications : sans elles, le jour choisi ne sert à rien. */}
      {choisi && notificationsActives === false && (
        <div className="mt-4 rounded-xl bg-marine-50 border border-marine-200 px-4 py-3 text-sm text-marine-900">
          {iosNeedsInstall() ? (
            <>Pour recevoir ce rappel sur iPhone, installez d'abord l'application sur votre écran d'accueil
              (bouton Partager, puis « Sur l'écran d'accueil »).</>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span>Les notifications ne sont pas encore activées sur cet appareil.</span>
              <button type="button" onClick={activerLesNotifications} disabled={activation}
                className="rounded-full bg-marine-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-marine-800 disabled:opacity-60">
                {activation ? 'Activation…' : 'Les activer'}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
