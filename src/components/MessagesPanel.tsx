import React, { useState } from 'react';
import { MessageCircle, AlertCircle, Clock, CheckCircle, X, Send, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

export default function MessagesPanel() {
  const { user } = useAuth();
  const { messages, updateMessage } = useData();
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredMessages = messages
    .filter(msg => statusFilter === 'all' || msg.status === statusFilter)
    .sort((a, b) => {
      if (a.status === 'new' && b.status !== 'new') return -1;
      if (a.status !== 'new' && b.status === 'new') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const messageCounts = {
    all: messages.length,
    new: messages.filter(m => m.status === 'new').length,
    in_progress: messages.filter(m => m.status === 'in_progress').length,
    resolved: messages.filter(m => m.status === 'resolved').length,
    closed: messages.filter(m => m.status === 'closed').length
  };

  const handleStatusChange = async (messageId: string, newStatus: string) => {
    try {
      await updateMessage(messageId, { status: newStatus });
      if (selectedMessage?.id === messageId) {
        setSelectedMessage({ ...selectedMessage, status: newStatus });
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  const handleSendResponse = async () => {
    if (!selectedMessage || !responseText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await updateMessage(selectedMessage.id, {
        adminResponse: responseText.trim(),
        adminId: user?.id,
        respondedAt: new Date().toISOString(),
        status: 'resolved'
      });

      setSelectedMessage({
        ...selectedMessage,
        adminResponse: responseText.trim(),
        adminId: user?.id,
        respondedAt: new Date().toISOString(),
        status: 'resolved'
      });
      setResponseText('');
      alert('Réponse envoyée avec succès !');
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la réponse:', error);
      alert('Erreur lors de l\'envoi de la réponse');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <AlertCircle className="w-4 h-4" />;
      case 'in_progress':
        return <Clock className="w-4 h-4" />;
      case 'resolved':
      case 'closed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      new: { text: 'Nouveau', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      in_progress: { text: 'En cours', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      resolved: { text: 'Résolu', color: 'bg-green-100 text-green-800 border-green-200' },
      closed: { text: 'Fermé', color: 'bg-gray-100 text-gray-800 border-gray-200' }
    };
    const badge = badges[status as keyof typeof badges] || badges.new;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
        {getStatusIcon(status)}
        <span className="ml-1">{badge.text}</span>
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Messages utilisateurs</h1>
          <p className="text-gray-600 mt-2">Gérez les messages et demandes des utilisateurs</p>
        </div>
      </div>

      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        <Filter className="w-5 h-5 text-gray-400 flex-shrink-0" />
        {[
          { key: 'all', label: 'Tous' },
          { key: 'new', label: 'Nouveaux' },
          { key: 'in_progress', label: 'En cours' },
          { key: 'resolved', label: 'Résolus' },
          { key: 'closed', label: 'Fermés' }
        ].map(filter => (
          <button
            key={filter.key}
            onClick={() => setStatusFilter(filter.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              statusFilter === filter.key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {filter.label} ({messageCounts[filter.key as keyof typeof messageCounts]})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Liste des messages ({filteredMessages.length})
          </h2>

          {filteredMessages.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucun message à afficher</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
              {filteredMessages.map(msg => (
                <div
                  key={msg.id}
                  onClick={() => {
                    setSelectedMessage(msg);
                    setResponseText(msg.adminResponse || '');
                  }}
                  className={`bg-white border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedMessage?.id === msg.id
                      ? 'border-blue-500 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        {getStatusBadge(msg.status)}
                        {getPriorityBadge(msg.priority)}
                      </div>
                      <h3 className="font-semibold text-gray-800">{msg.subject}</h3>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{msg.message}</p>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-medium">{msg.userName}</span>
                    <span>{new Date(msg.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {selectedMessage ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <h2 className="text-xl font-bold text-gray-800">Détails du message</h2>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Utilisateur</label>
                  <p className="text-gray-800 font-medium">{selectedMessage.userName}</p>
                  <p className="text-sm text-gray-600">{selectedMessage.userEmail}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Sujet</label>
                  <p className="text-gray-800 font-medium">{selectedMessage.subject}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Message</label>
                  <div className="bg-gray-50 rounded-lg p-3 mt-1">
                    <p className="text-gray-800 whitespace-pre-wrap">{selectedMessage.message}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Statut</label>
                    <div className="mt-1">{getStatusBadge(selectedMessage.status)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Priorité</label>
                    <div className="mt-1">{getPriorityBadge(selectedMessage.priority)}</div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Date</label>
                  <p className="text-gray-800">{new Date(selectedMessage.createdAt).toLocaleString('fr-FR', {
                    dateStyle: 'long',
                    timeStyle: 'short'
                  })}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600 mb-2 block">Changer le statut</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['new', 'in_progress', 'resolved', 'closed'].map(status => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(selectedMessage.id, status)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedMessage.status === status
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {status === 'new' ? 'Nouveau' :
                         status === 'in_progress' ? 'En cours' :
                         status === 'resolved' ? 'Résolu' : 'Fermé'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-gray-600 mb-2 block">
                    {selectedMessage.adminResponse ? 'Modifier la réponse' : 'Envoyer une réponse'}
                  </label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Écrivez votre réponse ici..."
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  <button
                    onClick={handleSendResponse}
                    disabled={isSubmitting || !responseText.trim()}
                    className="mt-3 w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                    <span>{isSubmitting ? 'Envoi...' : 'Envoyer la réponse'}</span>
                  </button>
                </div>

                {selectedMessage.adminResponse && selectedMessage.respondedAt && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-900 mb-1">
                      Réponse envoyée le {new Date(selectedMessage.respondedAt).toLocaleString('fr-FR', {
                        dateStyle: 'long',
                        timeStyle: 'short'
                      })}
                    </p>
                    <p className="text-sm text-blue-800 whitespace-pre-wrap">{selectedMessage.adminResponse}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center py-12">
              <div>
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Sélectionnez un message</p>
                <p className="text-gray-400 text-sm mt-2">Choisissez un message pour voir les détails et répondre</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
