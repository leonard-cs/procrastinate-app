import React from 'react';

interface Props {
  name: string;
  onAccept: () => void;
  onReject: () => void;
  processing?: boolean;
}

const BuddyInvitationBox= ({
  name,
  onAccept,
  onReject,
  processing = false,
}: Props) => {
  return (
    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6 shadow-sm">
      <div className="text-gray-800 mb-3">
        <strong>{name}</strong> has invited you to be their study buddy.
      </div>
      <div className="flex justify-center space-x-3">
        <button
          onClick={onAccept}
          disabled={processing}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? 'Accepting...' : 'Accept'}
        </button>
        <button
          onClick={onReject}
          disabled={processing}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? 'Rejecting...' : 'Reject'}
        </button>
      </div>
    </div>
  );
};

export default BuddyInvitationBox;