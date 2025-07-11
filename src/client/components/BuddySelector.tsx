import React, { useState, useEffect } from 'react';
import { BuddyService } from '../../services/BuddyService';
import { User } from '../types/User';

interface BuddySelectorProps {
  onBuddySelected: (buddy: User) => void;
  onCancel: () => void;
}

const BuddySelector: React.FC<BuddySelectorProps> = ({ onBuddySelected, onCancel }) => {
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    loadAvailableUsers();
  }, []);

  const loadAvailableUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const users = await BuddyService.getAvailableUsers();
      setAvailableUsers(users);
    } catch (error: any) {
      console.error('Error loading users:', error);
      setError('Failed to load available users');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBuddy = async (buddy: User) => {
    try {
      setSelecting(buddy.id);
      setError(null);
      await onBuddySelected(buddy);
      // onBuddySelected will handle closing the modal
    } catch (error: any) {
      console.error('Error selecting buddy:', error);
      setError(error.message || 'Failed to select buddy. Please try again.');
      // Refresh the available users list in case someone got paired
      await loadAvailableUsers();
    } finally {
      setSelecting(null);
    }
  };



  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading available buddies...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Choose Your Accountability Buddy</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <div className="flex justify-between items-center">
              <p className="text-red-800 text-sm">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="mb-4">
          <p className="text-gray-600">
            Select a buddy to stay motivated together! You'll be able to compare progress and encourage each other.
          </p>
        </div>

        <div className="overflow-y-auto max-h-96">
          {availableUsers.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No available users</h3>
              <p className="text-gray-600">
                All other users are either already paired with someone or there are no other users yet.
                Invite all your friends to join Study Buddy!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableUsers.map((availableBuddy) => (
                <div
                  key={availableBuddy.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-lg">
                        {availableBuddy.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{availableBuddy.name}</h3>
                      {/* <p className="text-sm text-gray-600">{availableBuddy.email}</p>~ */}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleSelectBuddy(availableBuddy)}
                    disabled={selecting === availableBuddy.id}
                    className="flex-shrink-0 max-w-[100px] sm:w-auto px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex justify-center items-center gap-2 text-sm whitespace-normal"
                  >
                    {selecting === availableBuddy.id ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm">Sending Request...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm">Send Request</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuddySelector; 