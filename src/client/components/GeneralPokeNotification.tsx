import React from 'react';
import { GeneralPoke } from '../types/Buddy';

interface GeneralPokeNotificationProps {
  poke: GeneralPoke;
  buddyName: string;
  onDismiss: () => void;
}

const GeneralPokeNotification: React.FC<GeneralPokeNotificationProps> = ({
  poke,
  buddyName,
  onDismiss,
}) => {
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    } else {
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
      } else {
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
      }
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <div className="text-2xl mr-3">👋</div>
          <div className="flex-1">
            <div className="flex items-center mb-1">
              <span className="font-semibold text-yellow-800 mr-2">{buddyName} poked you!</span>
              <span className="text-xs text-yellow-600">{formatTimeAgo(poke.timestamp)}</span>
            </div>
            <p className="text-yellow-700 text-sm">{poke.message}</p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-yellow-600 hover:text-yellow-800 transition-colors ml-2"
          title="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default GeneralPokeNotification; 