import React, { useState } from 'react';
import { X, Send, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MessageModal({ isOpen, onClose }: MessageModalProps) {
  const { user } = useAuth();
  const { messages, sendMessage } = useData();
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const userMessages = messages.filter(m => m.userId === user?.id).sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.subject.trim() || !formData.message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await sendMessage({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        priority: formData.priority
      });

      setFormData({ subject: '', message: '', priority: 'medium' });
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setActiveTab('history');
      }, 2000);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      alert('Erreur lors de l\'envoi du message');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      new: { icon: AlertCircle, text: 'Nouveau', color: 'bg-blue-100 text-blue-800' },
      in_progress: { icon: Clock, text: 'En cours', color: 'bg-yellow-100 text-yellow-800' },
      resolved: { icon: CheckCircle, text: 'Résolu', color: 'bg-green-100 text-green-800' },
      closed: { icon: CheckCircle, text: 'Fermé', color: 'bg-gray-100 text-gray-800' }
    };
    const badge = badges[status as keyof typeof badges] || badges.new;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.text}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const badges = {
      low: { text: 'Faible', color: 'bg-gray-100 text-gray-700' },
      medium: { text: 'Moyenne', color: 'bg-blue-100 text-blue-700' },
      high: { text: 'Haute', color: 'bg-red-100 text-red-700' }
    };
    const badge = badges[priority as keyof typeof badges] || badges.medium;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">Contacter l'équipe</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('new')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'new'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              Nouveau message
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              Mes messages ({userMessages.length})
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'new' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {submitSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <p className="text-green-800">Message envoyé avec succès ! Un administrateur vous répondra bientôt.</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priorité
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['low', 'medium', 'high'] as const).map(priority => (
                    <button
                      key={priority}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority })}
                      className={`p-3 rounded-lg border-2 transition-all text-center ${
                        formData.priority === priority
                          ? priority === 'low' ? 'border-gray-400 bg-gray-50 text-gray-700'
                          : priority === 'medium' ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <div className="font-medium text-sm">
                        {priority === 'low' ? 'Faible' : priority === 'medium' ? 'Moyenne' : 'Haute'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Sujet
                </label>
                <input
                  id="subject"
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Ex: Problème avec une recette"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Décrivez votre problème ou question en détail..."
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !formData.subject.trim() || !formData.message.trim()}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
                <span>{isSubmitting ? 'Envoi en cours...' : 'Envoyer le message'}</span>
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              {userMessages.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Aucun message envoyé pour le moment</p>
                  <button
                    onClick={() => setActiveTab('new')}
                    className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Envoyer votre premier message
                  </button>
                </div>
              ) : (
                userMessages.map(msg => (
                  <div key={msg.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 mb-1">{msg.subject}</h3>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(msg.status)}
                          {getPriorityBadge(msg.priority)}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <p className="text-gray-700 text-sm mb-3 whitespace-pre-wrap">{msg.message}</p>

                    {msg.adminResponse && (
                      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                        <p className="text-xs font-semibold text-blue-900 mb-1">
                          Réponse de l'équipe
                          {msg.respondedAt && (
                            <span className="ml-2 font-normal text-blue-700">
                              • {new Date(msg.respondedAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-blue-800 whitespace-pre-wrap">{msg.adminResponse}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
