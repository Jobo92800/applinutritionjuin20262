import { useState, useEffect } from 'react';
import { Send, Bell, Loader2, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sendPush } from '../lib/webpush';

export default function NotificationsPanel() {
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [title, setTitle] = useState('MAbeautyplus Nutrition');
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState('/');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; removed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCount = async () => {
    const { count, error: countError } = await supabase
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      setError(`Impossible de compter les abonnés : ${countError.message}`);
      setSubscriberCount(null);
      return;
    }
    setSubscriberCount(count ?? 0);
  };

  useEffect(() => {
    loadCount();
  }, []);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setError('Le titre et le message sont obligatoires.');
      return;
    }

    const confirmed = window.confirm(
      `Envoyer cette notification à ${subscriberCount ?? 0} appareil(s) ?\n\n${title.trim()}\n${message.trim()}`
    );
    if (!confirmed) return;

    setSending(true);
    setError(null);
    setResult(null);

    try {
      const response = await sendPush({
        title: title.trim(),
        body: message.trim(),
        url: url.trim() || '/',
      });
      setResult(response);
      setMessage('');
      loadCount();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Nombre d'abonnés */}
      <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <Users className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <p className="text-sm text-blue-800">
          {subscriberCount === null ? (
            'Chargement du nombre d\'abonnés…'
          ) : subscriberCount === 0 ? (
            <>
              <strong>Aucun appareil abonné pour l'instant.</strong> Les utilisateurs doivent activer
              les notifications depuis « Mon compte ».
            </>
          ) : (
            <>
              <strong>{subscriberCount}</strong> appareil{subscriberCount > 1 ? 's' : ''} recevra
              {subscriberCount > 1 ? 'ont' : ''} cette notification.
            </>
          )}
        </p>
      </div>

      {/* Formulaire */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Titre</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="MAbeautyplus Nutrition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={180}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            placeholder="Ex : Nouvelle recette disponible cette semaine 🥗"
          />
          <p className="text-xs text-gray-500 mt-1">{message.length}/180 caractères</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Page à ouvrir au clic (optionnel)
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="/"
          />
        </div>
      </div>

      {/* Aperçu */}
      {(title.trim() || message.trim()) && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Aperçu</p>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex items-start gap-3">
            <div className="w-10 h-10 flex-shrink-0 bg-green-100 rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 text-sm break-words">
                {title.trim() || 'MAbeautyplus Nutrition'}
              </p>
              <p className="text-sm text-gray-600 break-words">
                {message.trim() || 'Votre message apparaîtra ici.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Envoi */}
      <button
        onClick={handleSend}
        disabled={sending || !message.trim() || !title.trim()}
        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        {sending ? 'Envoi en cours…' : 'Envoyer à tous les abonnés'}
      </button>

      {/* Résultat */}
      {result && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-800">
            <p className="font-medium">
              Notification envoyée à {result.sent} appareil{result.sent > 1 ? 's' : ''}.
            </p>
            {result.failed > 0 && (
              <p className="text-green-700 mt-0.5">
                {result.failed} échec{result.failed > 1 ? 's' : ''}
                {result.removed > 0 && ` (${result.removed} abonnement(s) expiré(s) supprimé(s))`}
              </p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 break-words">{error}</p>
        </div>
      )}
    </div>
  );
}
