import { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, Loader2, AlertCircle, CalendarClock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  url: string | null;
  day_of_week: number | null;
  hour: number;
  active: boolean;
  last_sent_on: string | null;
}

const DAYS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' },
];

function describeSchedule(item: ScheduledNotification): string {
  const heure = `${item.hour}h`;
  if (item.day_of_week === null) return `Tous les jours à ${heure}`;
  const day = DAYS.find((d) => d.value === item.day_of_week)?.label ?? '';
  return `Tous les ${day.toLowerCase()}s à ${heure}`;
}

export default function ScheduledNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<ScheduledNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('MAbeautyplus Nutrition');
  const [body, setBody] = useState('');
  const [frequency, setFrequency] = useState<'weekly' | 'daily'>('weekly');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [hour, setHour] = useState(9);

  const load = async () => {
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .order('hour', { ascending: true });

    if (loadError) {
      setError(`Chargement impossible : ${loadError.message}`);
      setItems([]);
    } else {
      setError(null);
      setItems(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setTitle('MAbeautyplus Nutrition');
    setBody('');
    setFrequency('weekly');
    setDayOfWeek(1);
    setHour(9);
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!title.trim() || !body.trim()) {
      setError('Le titre et le message sont obligatoires.');
      return;
    }

    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase.from('scheduled_notifications').insert({
      title: title.trim(),
      body: body.trim(),
      url: '/',
      day_of_week: frequency === 'daily' ? null : dayOfWeek,
      hour,
      active: true,
      created_by: user?.id,
    });

    if (insertError) {
      setError(`Enregistrement impossible : ${insertError.message}`);
    } else {
      resetForm();
      load();
    }
    setSaving(false);
  };

  const toggleActive = async (item: ScheduledNotification) => {
    const { error: updateError } = await supabase
      .from('scheduled_notifications')
      .update({ active: !item.active, updated_at: new Date().toISOString() })
      .eq('id', item.id);

    if (updateError) {
      setError(`Modification impossible : ${updateError.message}`);
      return;
    }
    load();
  };

  const handleDelete = async (item: ScheduledNotification) => {
    if (!window.confirm(`Supprimer définitivement « ${item.body} » ?`)) return;

    const { error: deleteError } = await supabase
      .from('scheduled_notifications')
      .delete()
      .eq('id', item.id);

    if (deleteError) {
      setError(`Suppression impossible : ${deleteError.message}`);
      return;
    }
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-indigo-600" />
            Messages programmés
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Envoyés automatiquement, sans intervention de votre part (heure de Paris).
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Programmer
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 break-words">{error}</p>
        </div>
      )}

      {/* Formulaire de création */}
      {showForm && (
        <div className="border border-indigo-200 bg-indigo-50/40 rounded-xl p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              maxLength={180}
              placeholder="Ex : C'est le jour de la pesée ! N'oubliez pas de noter votre poids 😊"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fréquence</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as 'weekly' | 'daily')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="weekly">Chaque semaine</option>
                <option value="daily">Tous les jours</option>
              </select>
            </div>

            {frequency === 'weekly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jour</label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  {DAYS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Heure</label>
              <select
                value={hour}
                onChange={(e) => setHour(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {h}h00
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={saving || !body.trim() || !title.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
              Enregistrer
            </button>
            <button
              onClick={resetForm}
              className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Chargement…
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">
          Aucun message programmé pour l'instant.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`border rounded-xl p-4 flex items-start gap-4 ${
                item.active ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-70'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {describeSchedule(item)}
                  </span>
                  {!item.active && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      en pause
                    </span>
                  )}
                </div>
                <p className="font-medium text-gray-800 text-sm mt-1.5 break-words">{item.title}</p>
                <p className="text-sm text-gray-600 break-words">{item.body}</p>
                {item.last_sent_on && (
                  <p className="text-xs text-gray-400 mt-1">
                    Dernier envoi : {new Date(item.last_sent_on).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleActive(item)}
                  className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  {item.active ? 'Mettre en pause' : 'Réactiver'}
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  aria-label="Supprimer"
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
