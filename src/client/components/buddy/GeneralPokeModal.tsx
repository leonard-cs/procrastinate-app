import React, { useState } from 'react';
import { useTaskContext } from '../../contexts/TaskContext';

interface GeneralPokeModalProps {
  buddyName: string;
  onSendPoke: (message: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const GeneralPokeModal: React.FC<GeneralPokeModalProps> = ({
  buddyName,
  onSendPoke,
  onCancel,
  isLoading,
}) => {
  const [selectedMessage, setSelectedMessage] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [selectedTaskName, setSelectedTaskName] = useState('');

  const predefinedMessages = [
    "Hey! How's your study session going? 📚",
    "Don't forget about your tasks today! 💪",
    "You've got this! Keep pushing forward! 🚀",
    "Time to get back to work! 🎯",
  ];

  const taskDoneMessage = selectedTaskName
  ? `Hey! I've completed "${selectedTaskName}", can you mark it as done? ✅`
  : null;

  const allMessages = taskDoneMessage
  ? [...predefinedMessages, taskDoneMessage]
  : predefinedMessages;

  const getFinalMessage = () => {
    if (selectedMessage === 'custom') return customMessage;
    if (selectedMessage === 'taskDone' && selectedTaskName)
      return `Hey! I've completed "${selectedTaskName}", can you mark it as done? ✅`;
    return selectedMessage;
  };

  const handleSend = () => {
    const messageToSend = getFinalMessage();
    if (messageToSend.trim()) {
      onSendPoke(messageToSend.trim());
    }
  };

  const isValid = () => {
    if (selectedMessage === 'custom') {
      return customMessage.trim().length > 0;
    }
    return selectedMessage.length > 0;
  };

  const { tasks } = useTaskContext();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">👋</div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">Poke {buddyName}</h3>
          <p className="text-gray-600 text-sm">
            Send them a motivational message to keep them going!
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Choose a message:
          </label>

          {/* Predefined static messages */}
          {predefinedMessages.map((message, index) => (
            <label
              key={index}
              className={`flex items-start p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedMessage === message
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="pokeMessage"
                value={message}
                checked={selectedMessage === message}
                onChange={(e) => setSelectedMessage(e.target.value)}
                className="mr-3 mt-1 text-yellow-600 focus:ring-yellow-500"
              />
              <span className="text-sm text-gray-700">{message}</span>
            </label>
          ))}

          {/* Embedded task-based message */}
          <label
            className={`flex flex-col items-start p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedMessage === 'taskDone'
                ? 'border-yellow-400 bg-yellow-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start w-full">
              <input
                type="radio"
                name="pokeMessage"
                value="taskDone"
                checked={selectedMessage === 'taskDone'}
                onChange={(e) => setSelectedMessage(e.target.value)}
                className="mr-3 mt-1 text-yellow-600 focus:ring-yellow-500"
              />
              <div className="flex-1 text-sm text-gray-700">
                Hey! I've completed&nbsp;
                <select
                  value={selectedTaskName}
                  onChange={(e) => setSelectedTaskName(e.target.value)}
                  className="inline-block border rounded px-2 py-1 text-sm"
                >
                  <option value="">a task</option>
                  {tasks
                    .filter(task => !task.completed)
                    .map(task => (
                      <option key={task.id} value={task.name}>
                        {task.name}
                      </option>
                    ))}
                </select>
                , can you mark it as done? ✅
              </div>
            </div>
          </label>

          {/* Custom message input */}
          <label
            className={`flex items-start p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedMessage === 'custom'
                ? 'border-yellow-400 bg-yellow-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="pokeMessage"
              value="custom"
              checked={selectedMessage === 'custom'}
              onChange={(e) => setSelectedMessage(e.target.value)}
              className="mr-3 mt-1 text-yellow-600 focus:ring-yellow-500"
            />
            <div className="flex-1">
              <span className="text-sm text-gray-700 block mb-2">Write your own message:</span>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Type your custom poke message here..."
                className="w-full p-2 border border-gray-300 rounded text-sm"
                rows={3}
                maxLength={200}
                disabled={selectedMessage !== 'custom'}
              />
              <div className="text-xs text-gray-500 mt-1">
                {customMessage.length}/200 characters
              </div>
            </div>
          </label>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={isLoading || !isValid()}
            className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </>
            ) : (
              <>
                👋 Send Poke
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeneralPokeModal; 