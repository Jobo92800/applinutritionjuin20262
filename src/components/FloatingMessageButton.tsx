import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import MessageModal from './MessageModal';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

export default function FloatingMessageButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { messages } = useData();
  const { user } = useAuth();

  const hasUnreadNotifications = () => {
    if (!user) return false;

    if (user.role === 'admin') {
      return messages.some(msg => msg.status === 'new');
    } else {
      return messages.some(msg =>
        msg.userId === user.id &&
        msg.adminResponse &&
        msg.respondedAt
      );
    }
  };

  const showBadge = hasUnreadNotifications();

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-green-500 to-blue-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 z-40 group"
        aria-label="Envoyer un message"
      >
        <MessageCircle className="w-6 h-6" />
        {showBadge && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
            !
          </span>
        )}
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Besoin d'aide ?
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full border-8 border-transparent border-l-gray-800"></div>
        </div>
      </button>

      <MessageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
