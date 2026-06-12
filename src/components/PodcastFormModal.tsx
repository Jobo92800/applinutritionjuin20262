import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Upload } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { Podcast } from '../types';

interface PodcastFormModalProps {
  podcast?: Podcast | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PodcastFormModal({ podcast, isOpen, onClose }: PodcastFormModalProps) {
  const { addPodcast, updatePodcast, uploadPodcastAudio, uploadPodcastImage, uploadPodcastPdf } = useData();
  const [loading, setLoading] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    audioUrl: '',
    duration: 0,
    category: 'Nutrition',
    thumbnail: '',
    access_tiers: ['all'] as ('1_month' | '3_month' | '6_month' | 'all')[],
    keyPoints: [''],
    weekChallenges: [''],
    support_pdf_url: '',
    ctaButton: {
      enabled: false,
      text: '',
      url: ''
    },
    ctaButton2: {
      enabled: false,
      text: '',
      url: ''
    }
  });

  const categories = [
    'Nutrition',
    'Santé',
    'Bien-être',
    'Sport',
    'Recettes',
    'Motivation',
    'Lifestyle'
  ];

  const accessTiers = [
    { value: 'all', label: 'Accessible à tous' },
    { value: '1_month', label: 'Abonnement 1 mois' },
    { value: '3_month', label: 'Abonnement 3 mois' },
    { value: '6_month', label: 'Abonnement 6 mois' }
  ];

  useEffect(() => {
    if (podcast) {
      setFormData({
        title: podcast.title,
        description: podcast.description || '',
        audioUrl: podcast.audioUrl,
        duration: podcast.duration,
        category: podcast.category,
        thumbnail: podcast.thumbnail || '',
        access_tiers: podcast.access_tiers || ['all'],
        keyPoints: podcast.keyPoints && podcast.keyPoints.length > 0 ? podcast.keyPoints : [''],
        weekChallenges: podcast.weekChallenges && podcast.weekChallenges.length > 0 ? podcast.weekChallenges : [''],
        support_pdf_url: podcast.support_pdf_url || '',
        ctaButton: podcast.ctaButton || { enabled: false, text: '', url: '' },
        ctaButton2: podcast.ctaButton2 || { enabled: false, text: '', url: '' }
      });
    } else {
      // Reset form for new podcast
      setFormData({
        title: '',
        description: '',
        audioUrl: '',
        duration: 0,
        category: 'Nutrition',
        thumbnail: '',
        access_tiers: ['all'],
        keyPoints: [''],
        weekChallenges: [''],
        support_pdf_url: '',
        ctaButton: { enabled: false, text: '', url: '' },
        ctaButton2: { enabled: false, text: '', url: '' }
      });
    }
  }, [podcast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const podcastData = {
        ...formData,
        keyPoints: formData.keyPoints.filter(point => point.trim() !== ''),
        weekChallenges: formData.weekChallenges.filter(challenge => challenge.trim() !== ''),
        ctaButton: formData.ctaButton.enabled ? formData.ctaButton : undefined,
        ctaButton2: formData.ctaButton2.enabled ? formData.ctaButton2 : undefined
      };

      if (podcast) {
        await updatePodcast(podcast.id, podcastData);
      } else {
        await addPodcast(podcastData);
      }

      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde du podcast');
    } finally {
      setLoading(false);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier la taille du fichier (limite à 50MB)
    const maxSizeInMB = 50;
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    
    if (file.size > maxSizeInBytes) {
      alert(`Le fichier audio est trop volumineux. Taille maximale autorisée : ${maxSizeInMB}MB. Taille du fichier : ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      // Réinitialiser l'input file
      e.target.value = '';
      return;
    }

    setUploadingAudio(true);
    try {
      const audioUrl = await uploadPodcastAudio(file);
      setFormData({ ...formData, audioUrl });
      
      // Essayer de récupérer la durée du fichier audio
      const audio = new Audio(audioUrl);
      audio.addEventListener('loadedmetadata', () => {
        setFormData(prev => ({ ...prev, duration: Math.round(audio.duration) }));
      });
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      
      // Gestion spécifique des erreurs de taille
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('maximum allowed size') || errorMessage.includes('Payload too large') || errorMessage.includes('413')) {
        alert(`Le fichier audio est trop volumineux. Veuillez utiliser un fichier de moins de ${maxSizeInMB}MB.`);
      } else {
        alert('Erreur lors du téléchargement du fichier audio. Veuillez réessayer.');
      }
      
      // Réinitialiser l'input file en cas d'erreur
      e.target.value = '';
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier que c'est une image
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image');
      e.target.value = '';
      return;
    }

    // Vérifier la taille du fichier (limite à 2MB)
    const maxSizeInMB = 2;
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

    if (file.size > maxSizeInBytes) {
      alert(`L'image est trop volumineuse. Taille maximale autorisée : ${maxSizeInMB}MB. Taille du fichier : ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      e.target.value = '';
      return;
    }

    setUploadingImage(true);
    try {
      const imageUrl = await uploadPodcastImage(file);
      setFormData({ ...formData, thumbnail: imageUrl });
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      alert('Erreur lors du téléchargement de l\'image. Veuillez réessayer.');
      e.target.value = '';
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier que c'est un PDF
    if (file.type !== 'application/pdf') {
      alert('Veuillez sélectionner un fichier PDF');
      e.target.value = '';
      return;
    }

    // Vérifier la taille du fichier (limite à 10MB)
    const maxSizeInMB = 10;
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

    if (file.size > maxSizeInBytes) {
      alert(`Le PDF est trop volumineux. Taille maximale autorisée : ${maxSizeInMB}MB. Taille du fichier : ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      e.target.value = '';
      return;
    }

    setUploadingPdf(true);
    try {
      const pdfUrl = await uploadPodcastPdf(file);
      setFormData({ ...formData, support_pdf_url: pdfUrl });
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      alert('Erreur lors du téléchargement du PDF. Veuillez réessayer.');
      e.target.value = '';
    } finally {
      setUploadingPdf(false);
    }
  };

  const addKeyPoint = () => {
    setFormData({
      ...formData,
      keyPoints: [...formData.keyPoints, '']
    });
  };

  const removeKeyPoint = (index: number) => {
    setFormData({
      ...formData,
      keyPoints: formData.keyPoints.filter((_, i) => i !== index)
    });
  };

  const updateKeyPoint = (index: number, value: string) => {
    const updatedKeyPoints = [...formData.keyPoints];
    updatedKeyPoints[index] = value;
    setFormData({ ...formData, keyPoints: updatedKeyPoints });
  };

  const addWeekChallenge = () => {
    setFormData({
      ...formData,
      weekChallenges: [...formData.weekChallenges, '']
    });
  };

  const removeWeekChallenge = (index: number) => {
    setFormData({
      ...formData,
      weekChallenges: formData.weekChallenges.filter((_, i) => i !== index)
    });
  };

  const updateWeekChallenge = (index: number, value: string) => {
    const updatedChallenges = [...formData.weekChallenges];
    updatedChallenges[index] = value;
    setFormData({ ...formData, weekChallenges: updatedChallenges });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">
              {podcast ? 'Modifier le podcast' : 'Nouveau podcast'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Informations de base */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre du podcast *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Les bases de la nutrition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catégorie
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description du podcast..."
              />
            </div>

            {/* Audio et durée */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fichier audio *
                </label>
                <div className="space-y-3">
                  <input
                    type="url"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={formData.audioUrl}
                    onChange={(e) => setFormData({ ...formData, audioUrl: e.target.value })}
                    placeholder="URL du fichier audio"
                  />
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">ou</span>
                    <label className="flex items-center space-x-2 cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors">
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">
                        {uploadingAudio ? 'Téléchargement...' : 'Télécharger un fichier'}
                      </span>
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={handleAudioUpload}
                        disabled={uploadingAudio}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durée (secondes)
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                />
                {formData.duration > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    Durée: {formatDuration(formData.duration)}
                  </p>
                )}
              </div>
            </div>

            {/* Image et accès */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image de couverture
                </label>
                <div className="space-y-3">
                  <input
                    type="url"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    value={formData.thumbnail}
                    onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                    placeholder="URL de l'image"
                  />
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">ou</span>
                    <label className="flex items-center space-x-2 cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors">
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">
                        {uploadingImage ? 'Téléchargement...' : 'Télécharger une image'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                    </label>
                  </div>
                  {formData.thumbnail && (
                    <div className="mt-2">
                      <img
                        src={formData.thumbnail}
                        alt="Aperçu"
                        className="w-full h-40 object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Niveaux d'accès
                </label>
                <div className="space-y-2 border border-gray-300 rounded-lg p-3">
                  {accessTiers.map((tier) => (
                    <label key={tier.value} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        checked={formData.access_tiers.includes(tier.value as any)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              access_tiers: [...formData.access_tiers, tier.value as any]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              access_tiers: formData.access_tiers.filter(t => t !== tier.value)
                            });
                          }
                        }}
                      />
                      <span className="text-sm text-gray-700">{tier.label}</span>
                    </label>
                  ))}
                </div>
                {formData.access_tiers.length === 0 && (
                  <p className="text-sm text-red-500 mt-1">Veuillez sélectionner au moins un niveau d'accès</p>
                )}
              </div>
            </div>

            {/* Support PDF */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Support Important (PDF)
              </label>
              <div className="space-y-3">
                <input
                  type="url"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  value={formData.support_pdf_url}
                  onChange={(e) => setFormData({ ...formData, support_pdf_url: e.target.value })}
                  placeholder="URL du fichier PDF"
                />
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">ou</span>
                  <label className="flex items-center space-x-2 cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">
                      {uploadingPdf ? 'Téléchargement...' : 'Télécharger un PDF'}
                    </span>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={handlePdfUpload}
                      disabled={uploadingPdf}
                    />
                  </label>
                </div>
                {formData.support_pdf_url && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2 text-sm text-green-700">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>PDF ajouté avec succès</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Points clés */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Points clés
                </label>
                <button
                  type="button"
                  onClick={addKeyPoint}
                  className="flex items-center space-x-1 text-purple-600 hover:text-purple-700"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Ajouter</span>
                </button>
              </div>
              <div className="space-y-3">
                {formData.keyPoints.map((point, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-sm font-medium text-purple-600">{index + 1}</span>
                    </div>
                    <input
                      type="text"
                      placeholder={`Point clé ${index + 1}...`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      value={point}
                      onChange={(e) => updateKeyPoint(index, e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeKeyPoint(index)}
                      className="p-2 text-red-500 hover:text-red-700 mt-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Défis de la semaine */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Défis de la semaine
                </label>
                <button
                  type="button"
                  onClick={addWeekChallenge}
                  className="flex items-center space-x-1 text-green-600 hover:text-green-700"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Ajouter</span>
                </button>
              </div>
              <div className="space-y-3">
                {formData.weekChallenges.map((challenge, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-sm font-medium text-green-600">{index + 1}</span>
                    </div>
                    <input
                      type="text"
                      placeholder={`Défi ${index + 1}...`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                      value={challenge}
                      onChange={(e) => updateWeekChallenge(index, e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeWeekChallenge(index)}
                      className="p-2 text-red-500 hover:text-red-700 mt-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Boutons CTA */}
            <div className="space-y-6">
              {/* Premier bouton CTA */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <input
                    type="checkbox"
                    id="cta1-enabled"
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    checked={formData.ctaButton.enabled}
                    onChange={(e) => setFormData({
                      ...formData,
                      ctaButton: { ...formData.ctaButton, enabled: e.target.checked }
                    })}
                  />
                  <label htmlFor="cta1-enabled" className="text-sm font-medium text-gray-700">
                    Activer le premier bouton d'action
                  </label>
                </div>
                
                {formData.ctaButton.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Texte du bouton</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        value={formData.ctaButton.text}
                        onChange={(e) => setFormData({
                          ...formData,
                          ctaButton: { ...formData.ctaButton, text: e.target.value }
                        })}
                        placeholder="Ex: Découvrir le programme"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">URL de destination</label>
                      <input
                        type="url"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        value={formData.ctaButton.url}
                        onChange={(e) => setFormData({
                          ...formData,
                          ctaButton: { ...formData.ctaButton, url: e.target.value }
                        })}
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Deuxième bouton CTA */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <input
                    type="checkbox"
                    id="cta2-enabled"
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    checked={formData.ctaButton2.enabled}
                    onChange={(e) => setFormData({
                      ...formData,
                      ctaButton2: { ...formData.ctaButton2, enabled: e.target.checked }
                    })}
                  />
                  <label htmlFor="cta2-enabled" className="text-sm font-medium text-gray-700">
                    Activer le deuxième bouton d'action
                  </label>
                </div>
                
                {formData.ctaButton2.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Texte du bouton</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        value={formData.ctaButton2.text}
                        onChange={(e) => setFormData({
                          ...formData,
                          ctaButton2: { ...formData.ctaButton2, text: e.target.value }
                        })}
                        placeholder="Ex: Télécharger le guide"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">URL de destination</label>
                      <input
                        type="url"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        value={formData.ctaButton2.url}
                        onChange={(e) => setFormData({
                          ...formData,
                          ctaButton2: { ...formData.ctaButton2, url: e.target.value }
                        })}
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !formData.title.trim() || !formData.audioUrl.trim() || formData.access_tiers.length === 0}
              className="flex items-center space-x-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Sauvegarde...' : (podcast ? 'Mettre à jour' : 'Créer')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}