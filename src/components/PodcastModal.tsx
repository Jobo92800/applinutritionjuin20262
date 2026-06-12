import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, Volume2, SkipBack, SkipForward, Clock, Star, Download, FileText } from 'lucide-react';
import { Podcast } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface PodcastModalProps {
  podcast: Podcast;
  isOpen: boolean;
  onClose: () => void;
}

export default function PodcastModal({ podcast, isOpen, onClose }: PodcastModalProps) {
  const { user } = useAuth();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Fonction pour vérifier si l'utilisateur a accès à ce podcast
  const hasAccessToPodcast = (): boolean => {
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

  const formatDuration = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const playPodcast = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
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
  }, []);

  // Réinitialiser l'audio quand le modal s'ouvre
  useEffect(() => {
    if (isOpen && audioRef.current) {
      audioRef.current.src = podcast.audioUrl;
      audioRef.current.load();
      audioRef.current.playbackRate = playbackRate;
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [isOpen, podcast.audioUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Audio element caché */}
        <audio ref={audioRef} preload="metadata" />

        {/* Header avec image */}
        <div className="relative h-48 sm:h-64 md:h-80">
          <img
            src={podcast.thumbnail}
            alt={podcast.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Bouton fermer */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 p-2 sm:p-3 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-lg"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
          </button>

          {/* Titre et infos en overlay */}
          <div className="absolute bottom-3 left-3 right-3 sm:bottom-6 sm:left-6 sm:right-6">
            <div className="flex items-center space-x-2 mb-2 sm:mb-3">
              <div className="flex items-center space-x-1 text-white/90 text-xs sm:text-sm">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{formatDuration(podcast.duration)}</span>
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2 line-clamp-2">{podcast.title}</h1>
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="overflow-y-auto max-h-[calc(95vh-192px)] sm:max-h-[calc(90vh-256px)] md:max-h-[calc(90vh-320px)]">
          {/* Lecteur audio */}
          {hasAccessToPodcast() ? (
            <div className="p-3 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <div className="flex items-center space-x-2 sm:space-x-4 mb-3 sm:mb-4">
                <button
                  onClick={() => seekTo(Math.max(0, currentTime - 15))}
                  className="p-2 sm:p-3 text-gray-600 hover:text-purple-600 transition-colors bg-white rounded-full shadow-sm"
                >
                  <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                <button
                  onClick={playPodcast}
                  className="p-3 sm:p-4 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors shadow-lg"
                >
                  {isPlaying ? <Pause className="w-5 h-5 sm:w-6 sm:h-6" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6" />}
                </button>

                <button
                  onClick={() => seekTo(Math.min(duration, currentTime + 15))}
                  className="p-2 sm:p-3 text-gray-600 hover:text-purple-600 transition-colors bg-white rounded-full shadow-sm"
                >
                  <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                <div className="flex-1">
                  <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2">
                    <span>{formatDuration(currentTime)}</span>
                    <span>/</span>
                    <span>{formatDuration(duration)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={(e) => seekTo(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>

                {/* Vitesse de lecture */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-600 whitespace-nowrap">Vitesse:</span>
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

                <div className="hidden sm:flex items-center space-x-2">
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
              </div>
            </div>
          ) : (
            <div className="p-3 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-orange-50">
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-yellow-600" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Contenu Premium</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4">
                  Ce podcast nécessite un abonnement {
                    podcast.access_tier === '1_month' ? '1 mois' :
                    podcast.access_tier === '3_month' ? '3 mois' :
                    podcast.access_tier === '6_month' ? '6 mois' : podcast.access_tier
                  } pour être écouté.
                </p>
                <button className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-600 transition-colors text-sm sm:text-base">
                  Améliorer mon abonnement
                </button>
              </div>
            </div>
          )}

          {/* Deuxième Call to Action Button */}
          {/* Section CTA unifiée - Boutons côte à côte */}
          {((podcast.ctaButton?.enabled && podcast.ctaButton.text && podcast.ctaButton.url) || 
            (podcast.ctaButton2?.enabled && podcast.ctaButton2.text && podcast.ctaButton2.url)) && (
            <div className="p-3 sm:p-6 border-t border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Aller plus loin</h3>
                
                {/* Container flex pour les boutons */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
                  {/* Premier bouton CTA */}
                  {podcast.ctaButton?.enabled && podcast.ctaButton.text && podcast.ctaButton.url && (
                    <a
                      href={podcast.ctaButton.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <span>{podcast.ctaButton.text}</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                  
                  {/* Deuxième bouton CTA */}
                  {podcast.ctaButton2?.enabled && podcast.ctaButton2.text && podcast.ctaButton2.url && (
                    <a
                      href={podcast.ctaButton2.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <span>{podcast.ctaButton2.text}</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
                
              </div>
            </div>
          )}
          
          <div className="p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
            {/* Description détaillée */}
            <div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-3 sm:mb-6 flex items-center">
                <span className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2 sm:mr-3">
                  <span className="text-blue-600 font-bold">📝</span>
                </span>
                Description
              </h2>
              <div className="prose prose-gray max-w-none">
                <div className="text-gray-700 leading-relaxed text-sm sm:text-base lg:text-lg space-y-4">
                  {podcast.description.split('\n').map((paragraph, index) => {
                    // Ignorer les paragraphes vides
                    if (paragraph.trim() === '') return null;
                    
                    return (
                      <p key={index} className="text-justify">
                        {paragraph.trim()}
                      </p>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Points importants */}
            {podcast.keyPoints && podcast.keyPoints.length > 0 && (
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-3 sm:mb-6 flex items-center">
                  <span className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-full flex items-center justify-center mr-2 sm:mr-3">
                    <span className="text-green-600 font-bold">✨</span>
                  </span>
                  Points importants
                </h2>
                <div className="space-y-3 sm:space-y-4">
                  {podcast.keyPoints.map((point, index) => (
                    <div key={index} className="flex space-x-3 sm:space-x-4">
                      <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-xs sm:text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 pt-0.5 sm:pt-1">
                        <p className="text-gray-700 leading-relaxed text-sm sm:text-base">{point}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Défis de la semaine */}
          {podcast.weekChallenges && podcast.weekChallenges.length > 0 && (
            <div className="p-3 sm:p-6 border-t border-gray-200 bg-gradient-to-r from-orange-50 to-yellow-50">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-3 sm:mb-6 flex items-center">
                <span className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-100 rounded-full flex items-center justify-center mr-2 sm:mr-3">
                  <span className="text-orange-600 font-bold">🎯</span>
                </span>
                Défis de la semaine
              </h2>
              <div className="space-y-3 sm:space-y-4">
                {podcast.weekChallenges.map((challenge, index) => (
                  <div key={index} className="flex space-x-3 sm:space-x-4 bg-white p-3 sm:p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold text-xs sm:text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 pt-0.5 sm:pt-1">
                      <p className="text-gray-700 leading-relaxed text-sm sm:text-base">{challenge}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Support PDF - Bouton de téléchargement */}
          {podcast.support_pdf_url && (
            <div className="p-3 sm:p-6 border-t border-gray-200 bg-gradient-to-r from-green-50 to-teal-50">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center justify-center">
                  <FileText className="w-5 h-5 mr-2 text-green-600" />
                  Support Important
                </h3>
                <a
                  href={podcast.support_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-600 to-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Download className="w-5 h-5" />
                  <span>Télécharger Mon Support</span>
                </a>
              </div>
            </div>
          )}

          {/* Informations techniques */}
          <div className="p-3 sm:p-6 bg-gray-50 border-t border-gray-200">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center">
              <span className="w-5 h-5 sm:w-6 sm:h-6 bg-purple-100 rounded-full flex items-center justify-center mr-2 sm:mr-3">
                <span className="text-purple-600 text-sm">📊</span>
              </span>
              Informations
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              <div className="text-center p-2 sm:p-3 bg-white rounded-lg">
                <div className="text-sm sm:text-lg font-bold text-gray-800">{formatDuration(podcast.duration)}</div>
                <div className="text-xs sm:text-sm text-gray-600">Durée</div>
              </div>
            </div>
          </div>
        </div>

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
      </div>
    </div>
  );
}