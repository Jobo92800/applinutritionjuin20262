import { useState, ReactNode } from 'react';
import {
  ChevronDown, Smartphone, LogIn, Home, Headphones, Fingerprint, TrendingUp, Book, Camera, Settings,
  MessageCircle, FileText, Bell, LifeBuoy,
} from 'lucide-react';
import PushNotificationSettings from './PushNotificationSettings';

/*
  « Aide » : le guide de l'application, dans l'application. Une carte par
  écran, fermée par défaut, avec un bouton pour y aller. Les paragraphes
  reprennent le guide PDF (docs/guide-cliente) — quand l'un change, l'autre
  suit. Le réglage des notifications est là, dans le paragraphe qui l'explique,
  plutôt qu'un renvoi vers Mon compte.
*/

interface Props {
  onPageChange: (page: string) => void;
}

interface Section {
  id: string;
  icone: typeof Home;
  titre: string;
  resume: string;
  page?: string;
  contenu: ReactNode;
}

const estIphone = /iphone|ipad|ipod/i.test(typeof navigator === 'undefined' ? '' : navigator.userAgent);
const estInstallee = typeof window !== 'undefined'
  && (window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true);

function Etapes({ enfants }: { enfants: ReactNode[] }) {
  return (
    <ol className="space-y-2.5">
      {enfants.map((e, i) => (
        <li key={i} className="flex items-start space-x-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-marine-500 text-white text-xs font-semibold flex items-center justify-center mt-0.5">{i + 1}</span>
          <span className="text-[15px] leading-7 text-gray-700">{e}</span>
        </li>
      ))}
    </ol>
  );
}

function Astuce({ enfants, rose = false }: { enfants: ReactNode; rose?: boolean }) {
  return (
    <div className={`rounded-xl px-4 py-3 text-sm leading-6 border-l-4 ${rose ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-marine-50 border-marine-300 text-marine-900'}`}>
      {enfants}
    </div>
  );
}

const B = ({ enfants }: { enfants: ReactNode }) => <span className="inline-block border border-gray-200 bg-gray-50 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap align-middle">{enfants}</span>;

export default function Aide({ onPageChange }: Props) {
  const [ouverte, setOuverte] = useState<string | null>(null);

  const sections: Section[] = [
    {
      id: 'installer', icone: Smartphone, titre: "Installer l'application sur votre téléphone",
      resume: "Sans App Store ni Google Play, en trois gestes.",
      contenu: (
        <div className="space-y-4">
          {estInstallee ? (
            <Astuce enfants={<><b>C'est fait :</b> vous utilisez l'application depuis votre écran d'accueil.</>} />
          ) : (
            <p className="text-[15px] leading-7 text-gray-700">L'application s'installe sur l'écran d'accueil, comme n'importe quelle autre — et c'est de là qu'elle fonctionne le mieux (notifications, plein écran).</p>
          )}
          <div>
            <p className="font-semibold text-gray-800 mb-2">Sur iPhone (dans Safari)</p>
            <Etapes enfants={[
              <>Appuyez sur le bouton <b>Partager</b> — le carré avec une flèche vers le haut, en bas de l'écran.</>,
              <>Faites défiler et choisissez <b>« Sur l'écran d'accueil »</b>.</>,
              <>Appuyez sur <b>Ajouter</b>. L'icône MAbeautyplus apparaît parmi vos applications.</>,
            ]} />
          </div>
          <div>
            <p className="font-semibold text-gray-800 mb-2">Sur Android (dans Chrome)</p>
            <Etapes enfants={[
              <>Appuyez sur le bandeau <B enfants="Installer l'application" /> en bas de l'écran, s'il est là.</>,
              <>Sinon : les trois points en haut à droite, puis <b>« Installer l'application »</b>.</>,
            ]} />
          </div>
          {estIphone && !estInstallee && (
            <Astuce rose enfants={<><b>Sur iPhone, c'est indispensable pour les notifications</b> : les rappels de votre parcours ne peuvent arriver que si l'application est ouverte depuis l'écran d'accueil.</>} />
          )}
        </div>
      ),
    },
    {
      id: 'connexion', icone: LogIn, titre: 'Votre compte et votre mot de passe',
      resume: 'Créé au centre, avec vous.',
      page: 'account',
      contenu: (
        <div className="space-y-4">
          <p className="text-[15px] leading-7 text-gray-700">Votre accès a été créé par votre thérapeute à la signature de votre cure, avec votre adresse e-mail et un mot de passe choisi ensemble. Vous restez connectée ensuite : pas besoin de le retaper à chaque fois.</p>
          <Astuce enfants={<><b>Mot de passe oublié ?</b> Sur l'écran de connexion, « Mot de passe oublié ? » : un e-mail de <i>contact@mabeautyplus.fr</i> vous permet d'en choisir un nouveau. Regardez aussi dans vos indésirables.</>} />
          <p className="text-[15px] leading-7 text-gray-700">Pour changer de mot de passe quand vous êtes connectée : <b>Compte</b>, puis le bloc « Mot de passe » (l'actuel, puis le nouveau deux fois). « Se déconnecter » est tout en bas — utile seulement si vous prêtez votre téléphone.</p>
        </div>
      ),
    },
    {
      id: 'parcours', icone: Headphones, titre: 'Mon parcours — une étape par semaine',
      resume: "L'accompagnement audio de votre cure, dans l'ordre.",
      page: 'podcasts',
      contenu: (
        <div className="space-y-4">
          <p className="text-[15px] leading-7 text-gray-700">Une introduction, puis une étape par semaine. Chaque étape se débloque quand la précédente a été écoutée.</p>
          <Etapes enfants={[
            <>L'étape du moment est en haut. Appuyez sur <b>Commencer</b> (ou <b>Reprendre mon écoute</b>).</>,
            <>Écoutez-la en une fois ou en plusieurs : l'application retient où vous en êtes, même si vous fermez.</>,
            <>À partir de 90 % d'écoute, l'étape est validée et la suivante s'ouvre — mais l'épisode continue jusqu'à la fin, rien ne vous coupe.</>,
          ]} />
          <p className="text-[15px] leading-7 text-gray-700">Dans le lecteur : le bouton rond lance et met en pause, « 15 s » recule ou avance. Vous pouvez avancer dans un épisode déjà entendu, ce que vous passez compte comme écouté. Sous le lecteur, le grand bouton teal ouvre la <b>fiche récap</b> de l'étape (PDF), puis le résumé, les points à retenir et vos défis de la semaine.</p>
          <p className="text-[15px] leading-7 text-gray-700">Vous pouvez écouter depuis votre téléphone, votre tablette et votre ordinateur (jusqu'à quatre appareils) : votre progression est la même partout. Une étape terminée se réécoute autant de fois que vous voulez.</p>
          <Astuce enfants={<><b>Un seul épisode par semaine, c'est voulu.</b> Choisissez un jour fixe : pesée le matin à jeun, écoute de l'étape, planification des repas.</>} />
        </div>
      ),
    },
    {
      id: 'notifications', icone: Bell, titre: 'Les notifications',
      resume: 'Une quand une étape est prête, un rappel si votre parcours vous attend. Jamais plus.',
      contenu: (
        <div className="space-y-4">
          <p className="text-[15px] leading-7 text-gray-700">Une fois activées sur ce téléphone, vous recevez un message quand une étape est validée et que la suivante est prête, et un petit rappel si votre parcours vous attend depuis une semaine.</p>
          <PushNotificationSettings />
        </div>
      ),
    },
    {
      id: 'profil', icone: Fingerprint, titre: 'Mon profil — votre BioPortrait',
      resume: 'Le bilan fait au centre, votre analyse InBody, vos mensurations.',
      page: 'profil',
      contenu: (
        <div className="space-y-4">
          <p className="text-[15px] leading-7 text-gray-700">Tout ce que votre thérapeute a établi avec vous au centre, à jour : votre <b>profil</b> et votre <b>terrain</b> avec ce qu'ils signifient, les dix jauges, les mesures relevées sur la balance InBody, le complément orienté par votre terrain, et le document complet en PDF (« Ouvrir mon BioPortrait »).</p>
          <p className="text-[15px] leading-7 text-gray-700">Quand votre thérapeute relève vos mensurations en séance, elles apparaissent en bas, d'une date à l'autre, avec l'écart. Si vous refaites un point, une barre de dates permet de comparer les bilans.</p>
          <Astuce rose enfants={<><b>Rien ne se modifie ici</b> : ces données sont tenues par votre centre. Si quelque chose vous semble inexact, parlez-en à votre thérapeute.</>} />
        </div>
      ),
    },
    {
      id: 'suivi', icone: TrendingUp, titre: 'Suivi — poids, objectifs de la semaine, badges',
      resume: 'Votre courbe, vos quatre cases du jour, votre série.',
      page: 'progress',
      contenu: (
        <div className="space-y-4">
          <Etapes enfants={[
            <>Appuyez sur <b>Nouvelle entrée</b>, entrez votre poids et la date (et si vous voulez vos tours de taille, poitrine, hanches).</>,
            <>La courbe et l'IMC se mettent à jour. Une entrée se modifie ou se supprime avec les deux icônes à droite dans l'historique.</>,
          ]} />
          <p className="text-[15px] leading-7 text-gray-700">Les pesées et mensurations faites <b>au centre</b> apparaissent aussi sur la courbe, marquées « Pesée au centre » : elles viennent de votre thérapeute et ne se modifient pas ici. La ligne rouge en pointillé est votre objectif de poids (réglable dans Compte).</p>
          <p className="text-[15px] leading-7 text-gray-700"><b>Les objectifs de la semaine</b> : quatre questions, une case par jour — compléments alimentaires, hydratation (2 litres), audio de la semaine, cuisine maison. Une journée où tout est coché fait avancer votre <b>série</b>, et les badges se gagnent avec la régularité : Semaine Parfaite, Maître de l'Hydratation, Champion des Compléments, Chef à Domicile, Auditeur Assidu, Série de 7 jours, Série de 30 jours.</p>
          <Astuce enfants={<><b>0,5 à 1 kg par semaine</b>, c'est une perte saine et durable. Regardez la direction, pas la vitesse.</>} />
        </div>
      ),
    },
    {
      id: 'repas', icone: Book, titre: 'Recettes, calendrier des repas, liste de courses',
      resume: 'On choisit, on place dans la semaine, la liste s’écrit toute seule.',
      page: 'recipes',
      contenu: (
        <div className="space-y-4">
          <p className="text-[15px] leading-7 text-gray-700"><b>Recettes</b> : cherchez par nom, filtrez par catégorie, difficulté ou préférence. Ouvrez une recette pour les ingrédients, les étapes et les apports ; certaines proposent une version adaptée à vos besoins caloriques. Le cœur met une recette en favori.</p>
          <p className="text-[15px] leading-7 text-gray-700"><b>Calendrier</b> : une semaine à la fois. Pour chaque repas, appuyez sur une case « + Ajouter », choisissez une recette, c'est placé. En bas, les apports moyens par jour.</p>
          <p className="text-[15px] leading-7 text-gray-700"><b>Courses</b> : « Générer depuis les repas », choisissez la semaine, et tous les ingrédients de vos repas planifiés arrivent dans la liste. Ajoutez ce qui manque, cochez en magasin, « J'ai fait mes courses » remet la liste à zéro.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => onPageChange('calendar')} className="text-sm font-medium text-marine-800 bg-marine-100 hover:bg-marine-200 px-3 py-1.5 rounded-full">Ouvrir le calendrier</button>
            <button onClick={() => onPageChange('shopping')} className="text-sm font-medium text-marine-800 bg-marine-100 hover:bg-marine-200 px-3 py-1.5 rounded-full">Ouvrir la liste de courses</button>
          </div>
        </div>
      ),
    },
    {
      id: 'photo', icone: Camera, titre: 'Analyse calorique par photo',
      resume: 'Une estimation de votre assiette, pour prendre conscience des portions.',
      page: 'food-analysis',
      contenu: (
        <p className="text-[15px] leading-7 text-gray-700">Prenez votre assiette en photo ou importez-la depuis la galerie, puis « Analyser » : l'application estime les calories et la répartition du repas. « Sauvegarder dans l'historique » pour la retrouver. C'est une estimation, utile pour se rendre compte — pas une pesée au gramme près.</p>
      ),
    },
    {
      id: 'compte', icone: Settings, titre: 'Mon compte',
      resume: 'Votre taille, votre objectif de poids, vos préférences.',
      page: 'account',
      contenu: (
        <ul className="space-y-2 text-[15px] leading-7 text-gray-700">
          <li><b>Informations personnelles</b> — nom, tranche d'âge, taille (elle sert au calcul de l'IMC), niveau d'activité, préférences alimentaires.</li>
          <li><b>Objectif de poids</b> — la ligne rouge de votre courbe de suivi.</li>
          <li><b>Notifications</b> — sur ce téléphone, rappels de repas, rapport hebdomadaire.</li>
          <li><b>Mot de passe</b> — l'actuel, puis le nouveau deux fois.</li>
        </ul>
      ),
    },
    {
      id: 'aide', icone: MessageCircle, titre: 'Une question ? Écrivez à votre centre',
      resume: 'La bulle en bas à droite, sur tous les écrans.',
      contenu: (
        <div className="space-y-4">
          <p className="text-[15px] leading-7 text-gray-700">La bulle en bas à droite ouvre « Envoyer un message » : un sujet, quelques lignes, et votre centre vous répond dans l'application. Vous y retrouvez aussi vos messages précédents et leurs réponses.</p>
          <Astuce rose enfants={<><b>Ça ne marche pas comme prévu ?</b> Trois gestes qui règlent presque tout : fermer complètement l'application et la rouvrir ; vérifier que vous avez du réseau ; vous déconnecter puis vous reconnecter.</>} />
        </div>
      ),
    },
  ];

  const NOMS_PAGES: Record<string, string> = {
    account: 'Ouvrir Mon compte', podcasts: 'Ouvrir Mon parcours', profil: 'Ouvrir Mon profil',
    progress: 'Ouvrir le Suivi', recipes: 'Ouvrir les Recettes', 'food-analysis': "Ouvrir l'analyse photo",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-widest uppercase text-green-600">Aide</p>
        <h1 className="text-2xl font-bold text-gray-800 mt-1">Comment fonctionne votre application</h1>
        <p className="text-sm text-gray-500 mt-1">Un écran, une carte. Appuyez pour ouvrir.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <p className="flex items-center space-x-2 text-xs font-semibold tracking-widest uppercase text-marine-700"><LifeBuoy className="w-4 h-4" /><span>Les trois rendez-vous de votre semaine</span></p>
        <div className="mt-3">
          <Etapes enfants={[
            <><b>Un jour fixe, votre pesée</b>, le matin à jeun. Notez-la dans Suivi ; celles du centre s'ajoutent toutes seules.</>,
            <><b>Une étape audio par semaine</b>, dans Mon parcours, puis sa fiche récap.</>,
            <><b>Chaque jour, quatre cases</b> dans Suivi : compléments, hydratation, audio, cuisine maison.</>,
          ]} />
        </div>
      </div>

      <div className="space-y-3">
        {sections.map((s) => {
          const active = ouverte === s.id;
          return (
            <section key={s.id} className={`bg-white rounded-2xl border transition-colors ${active ? 'border-marine-300 shadow-carte' : 'border-gray-200'}`}>
              <button type="button" onClick={() => setOuverte(active ? null : s.id)} aria-expanded={active}
                className="w-full flex items-center space-x-4 p-5 text-left">
                <span className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-marine-500 text-white' : 'bg-marine-100 text-marine-700'}`}>
                  <s.icone className="w-5 h-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-gray-800">{s.titre}</span>
                  <span className="block text-sm text-gray-500">{s.resume}</span>
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${active ? 'rotate-180' : ''}`} />
              </button>
              {active && (
                <div className="px-5 pb-5 space-y-4">
                  {s.contenu}
                  {s.page && (
                    <button onClick={() => onPageChange(s.page!)}
                      className="w-full sm:w-auto bg-marine-600 text-white px-5 py-2.5 rounded-full font-semibold hover:bg-marine-700 transition-colors">
                      {NOMS_PAGES[s.page] || 'Ouvrir la page'}
                    </button>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <a href="/guide-application.pdf" target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center space-x-2 bg-white border border-gray-200 rounded-2xl p-4 text-sm font-medium text-gray-700 hover:border-marine-300">
        <FileText className="w-4 h-4 text-marine-700" /><span>Télécharger le guide complet (PDF)</span>
      </a>
    </div>
  );
}
