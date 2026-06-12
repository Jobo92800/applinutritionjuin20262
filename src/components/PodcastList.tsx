import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Clock, Search, Volume2, SkipBack, SkipForward, Calendar, GripVertical } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Podcast } from '../types';
import PodcastModal from './PodcastModal';

export default function PodcastList() {
  const { podcasts, updatePodcastOrder } = useData();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [draggedPodcast, setDraggedPodcast] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Fonction pour vérifier si l'utilisateur a accès à un podcast
  const hasAccessToPodcast = (podcast: Podcast): boolean => {
    if (!user) return false;

    // Les admins ont accès à tout
    if (user.role === 'admin') {
      return true;
    }

    // Si le podcast est accessible à tous
    if (podcast.access_tiers.includes('all')) {
      return true;
    }

    // Vérifier si le niveau d'abonnement de l'utilisateur est dans la liste des accès autorisés
    return podcast.access_tiers.includes(user.subscription_tier as any);
  };

  // Filtrer les podcasts selon l'accès utilisateur
  const accessiblePodcasts = podcasts.filter(hasAccessToPodcast);

  const filteredPodcasts = podcasts
    .filter(podcast => {
      if (!hasAccessToPodcast(podcast)) {
        return false;
      }

      const matchesSearch = podcast.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           podcast.description.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    })
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const formatDuration = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getCurrentPodcast = () => {
    return podcasts.find(p => p.id === currentlyPlaying);
  };

  const playPodcast = (podcast: Podcast) => {
    if (audioRef.current) {
      if (currentlyPlaying === podcast.id) {
        // Toggle play/pause pour le même podcast
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          audioRef.current.play();
          setIsPlaying(true);
        }
      } else {
        // Nouveau podcast
        setCurrentlyPlaying(podcast.id);
        audioRef.current.src = podcast.audioUrl;
        audioRef.current.load();
        audioRef.current.play();
        audioRef.current.playbackRate = playbackRate;
        setIsPlaying(true);
      }
    }
  };

  const stopPodcast = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentlyPlaying(null);
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handlePlaybackRateChange = (newRate: number) => {
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  const toggleDescription = (podcastId: string) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(podcastId)) {
        newSet.delete(podcastId);
      } else {
        newSet.add(podcastId);
      }
      return newSet;
    });
  };

  const handleDragStart = (e: React.DragEvent, podcastId: string) => {
    setDraggedPodcast(podcastId);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedPodcast(null);
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetPodcastId: string) => {
    e.preventDefault();

    if (!draggedPodcast || draggedPodcast === targetPodcastId) {
      return;
    }

    const allPodcasts = [...podcasts].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    const draggedIndex = allPodcasts.findIndex(p => p.id === draggedPodcast);
    const targetIndex = allPodcasts.findIndex(p => p.id === targetPodcastId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const reordered = [...allPodcasts];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    try {
      await updatePodcastOrder(reordered);
    } catch (error) {
      console.error('Erreur lors de la réorganisation:', error);
    }

    setDraggedPodcast(null);
    setIsDragging(false);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  // Event listeners pour l'audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      audio.playbackRate = playbackRate;
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      // Auto-play next podcast si disponible
      const currentIndex = podcasts.findIndex(p => p.id === currentlyPlaying);
      if (currentIndex < podcasts.length - 1) {
        const nextPodcast = podcasts[currentIndex + 1];
        playPodcast(nextPodcast);
      } else {
        setCurrentlyPlaying(null);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [currentlyPlaying, podcasts]);

  return (
    <div className="space-y-6">
      {/* Audio element caché */}
      <audio ref={audioRef} preload="metadata" />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Podcasts</h1>
          <p className="text-gray-600 mt-2">
            {filteredPodcasts.length} épisodes disponibles
            {accessiblePodcasts.length < podcasts.length && (
              <span className="text-sm text-gray-500 ml-2">
                ({podcasts.length - accessiblePodcasts.length} épisodes premium)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un épisode..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Lecteur audio fixe en bas si un podcast est en cours */}
      {currentlyPlaying && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center space-x-4">
              {/* Info du podcast */}
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <img
                  src={getCurrentPodcast()?.thumbnail}
                  alt={getCurrentPodcast()?.title}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-gray-800 truncate">{getCurrentPodcast()?.title}</h3>
                </div>
              </div>

              {/* Contrôles */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => seekTo(Math.max(0, currentTime - 15))}
                  className="p-2 text-gray-600 hover:text-purple-600 transition-colors"
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                <button
                  onClick={() => getCurrentPodcast() && playPodcast(getCurrentPodcast()!)}
                  className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>

                <button
                  onClick={() => seekTo(Math.min(duration, currentTime + 15))}
                  className="p-2 text-gray-600 hover:text-purple-600 transition-colors"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>

              {/* Barre de progression */}
              <div className="flex-1 max-w-md">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>{formatDuration(currentTime)}</span>
                  <div className="flex-1">
                    <input
                      type="range"
                      min="0"
                      max={duration || 0}
                      value={currentTime}
                      onChange={(e) => seekTo(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                  <span>{formatDuration(duration)}</span>
                </div>
              </div>

              {/* Vitesse de lecture */}
              <div className="hidden sm:flex items-center space-x-2">
                <span className="text-xs text-gray-600">Vitesse:</span>
                <select
                  value={playbackRate}
                  onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                  className="text-xs bg-white border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={1.75}>1.75x</option>
                  <option value={2}>2x</option>
                </select>
              </div>

              {/* Volume */}
              <div className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-gray-600" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Fermer */}
              <button
                onClick={stopPodcast}
                className="p-2 text-gray-600 hover:text-red-600 transition-colors"
              >
                <span className="text-lg">×</span>
              </button>

              <button
                onClick={() => setSelectedPodcast(getCurrentPodcast()!)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span>Détails</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Podcast List */}
      <div className={`space-y-4 ${currentlyPlaying ? 'pb-24' : ''}`}>
        {user && user.role === 'admin' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              <GripVertical className="w-4 h-4 inline mr-2" />
              Mode administrateur: Glissez-déposez les podcasts pour changer leur ordre d'affichage
            </p>
          </div>
        )}
        {filteredPodcasts.map((podcast) => (
          <div
            key={podcast.id}
            draggable={user?.role === 'admin'}
            onDragStart={(e) => user?.role === 'admin' && handleDragStart(e, podcast.id)}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDrop={(e) => user?.role === 'admin' && handleDrop(e, podcast.id)}
            className={`bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-purple-200 transition-all duration-300 overflow-hidden group ${
              currentlyPlaying === podcast.id ? 'ring-2 ring-purple-500 bg-purple-50' : ''
            } ${
              draggedPodcast === podcast.id ? 'opacity-50' : ''
            } ${
              user?.role === 'admin' ? 'cursor-move' : ''
            }`}
          >
            {/* Header avec image et titre */}
            <div className="p-4 lg:p-6 border-b border-gray-100">
              <div className="flex items-start space-x-4">
                {user && user.role === 'admin' && (
                  <div className="flex-shrink-0 pt-2">
                    <GripVertical className="w-5 h-5 text-gray-400" />
                  </div>
                )}
                <div className="relative flex-shrink-0">
                  <img
                    src={podcast.thumbnail}
                    alt={podcast.title}
                    className="w-16 h-16 lg:w-20 lg:h-20 rounded-xl object-cover shadow-md group-hover:shadow-lg transition-shadow duration-300"
                  />

                  {currentlyPlaying === podcast.id && (
                    <div className="absolute inset-0 bg-purple-600/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center shadow-lg">
                        {isPlaying ? (
                          <Pause className="w-4 h-4 text-white" />
                        ) : (
                          <Play className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h3
                      className="text-lg lg:text-xl font-bold text-gray-800 line-clamp-2 group-hover:text-purple-700 transition-colors duration-200 cursor-pointer"
                      onClick={() => setSelectedPodcast(podcast)}
                    >
                      {podcast.title}
                    </h3>
                  </div>

                  {/* Informations */}
                  <div className="flex items-center flex-wrap gap-3 lg:gap-4 text-sm text-gray-500 mb-3">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatDuration(podcast.duration)}</span>
                    </div>
                  </div>

                  {/* Boutons d'action */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playPodcast(podcast);
                      }}
                      className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 text-sm flex-1 ${
                        currentlyPlaying === podcast.id && isPlaying
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      {currentlyPlaying === podcast.id && isPlaying ? (
                        <>
                          <Pause className="w-4 h-4" />
                          <span className="text-xs">Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          <span className="text-xs">Écouter</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setSelectedPodcast(podcast)}
                      className="flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium text-sm flex-1"
                    >
                      <span className="text-xs">Détails</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Contenu principal - Description et Points clés côte à côte */}
            <div className="p-4 lg:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Description */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <span className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                      <span className="text-blue-600 text-xs">📝</span>
                    </span>
                    Description
                  </h4>
                  <div className="text-gray-600 text-sm leading-relaxed">
                    {expandedDescriptions.has(podcast.id) ? (
                      <div className="space-y-3">
                        {podcast.description.split('\n').filter(p => p.trim()).map((paragraph, index) => (
                          <p key={index} className="text-justify">{paragraph.trim()}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-justify">
                        {truncateText(podcast.description, 200)}
                      </p>
                    )}
                    
                    {podcast.description.length > 200 && (
                      <button
                        onClick={() => toggleDescription(podcast.id)}
                        className="mt-2 text-purple-600 hover:text-purple-700 font-medium text-sm transition-colors"
                      >
                        {expandedDescriptions.has(podcast.id) ? 'Voir moins' : 'Voir plus'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Points clés */}
                {podcast.keyPoints && podcast.keyPoints.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                      <span className="w-4 h-4 bg-purple-100 rounded-full flex items-center justify-center mr-2">
                        <span className="text-purple-600 text-xs">✨</span>
                      </span>
                      Points clés
                    </h4>
                    <div className="space-y-2">
                      {podcast.keyPoints.slice(0, 4).map((point, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                            <span className="text-purple-600 text-xs font-bold">{index + 1}</span>
                          </div>
                          <span className="text-sm text-gray-600 leading-relaxed">{point}</span>
                        </div>
                      ))}
                      {podcast.keyPoints.length > 4 && (
                        <div className="flex items-center space-x-3 mt-2">
                          <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-gray-500 text-xs">+</span>
                          </div>
                          <span className="text-sm text-gray-500 italic font-medium">
                            {podcast.keyPoints.length - 4} autres points...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPodcasts.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 lg:w-24 lg:h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 lg:mb-6">
            <Play className="w-8 h-8 lg:w-12 lg:h-12 text-purple-600" />
          </div>
          <h3 className="text-xl lg:text-2xl font-medium text-gray-500 mb-2">
            {accessiblePodcasts.length === 0 ? 'Aucun épisode accessible' : 'Aucun épisode trouvé'}
          </h3>
          <p className="text-gray-400 lg:text-lg">
            {accessiblePodcasts.length === 0 
              ? 'Améliorez votre abonnement pour accéder à plus de contenu'
              : 'Essayez de modifier vos critères de recherche'
            }
          </p>
        </div>
      )}

      {/* Styles pour les sliders */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #7c3aed;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #7c3aed;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .slider::-webkit-slider-track {
          background: #e5e7eb;
          border-radius: 4px;
        }
        
        .slider::-moz-range-track {
          background: #e5e7eb;
          border-radius: 4px;
        }
      `}</style>

      {/* Podcast Details Modal */}
      {selectedPodcast && (
        <PodcastModal
          podcast={selectedPodcast}
          isOpen={!!selectedPodcast}
          onClose={() => setSelectedPodcast(null)}
        />
      )}
    </div>
  );
}