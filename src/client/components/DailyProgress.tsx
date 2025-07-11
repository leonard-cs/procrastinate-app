import React from 'react';

interface DailyProgressProps {
  completed: number;
  total: number;
  percentage: number;
}

const DailyProgress: React.FC<DailyProgressProps> = ({ completed, total, percentage }) => {
  const getMotivationalMessage = (completed: number, percentage: number) => {
    if (completed === 0) {
      return {
        message: "Ready to tackle the day?",
        emoji: "🌅",
        color: "text-gray-600"
      };
    }
    
    if (completed === 1) {
      return {
        message: "Great start! Keep the momentum going!",
        emoji: "🚀",
        color: "text-blue-600"
      };
    }
    
    if (completed === 2) {
      return {
        message: "You're on fire! Two down!",
        emoji: "🔥",
        color: "text-orange-600"
      };
    }
    
    if (completed === 3) {
      return {
        message: "You crushed it! Three tasks done!",
        emoji: "💪",
        color: "text-purple-600"
      };
    }
    
    if (completed >= 4 && completed <= 6) {
      return {
        message: "Productivity champion! Amazing work!",
        emoji: "🏆",
        color: "text-yellow-600"
      };
    }
    
    if (completed >= 7) {
      return {
        message: "Absolute legend! You're unstoppable!",
        emoji: "⭐",
        color: "text-green-600"
      };
    }
    
    // Fallback based on percentage
    if (percentage >= 100) {
      return {
        message: "Perfect day! All tasks completed!",
        emoji: "🎉",
        color: "text-green-600"
      };
    }
    
    if (percentage >= 75) {
      return {
        message: "Almost there! You've got this!",
        emoji: "💯",
        color: "text-green-600"
      };
    }
    
    if (percentage >= 50) {
      return {
        message: "Halfway there! Keep it up!",
        emoji: "⚡",
        color: "text-blue-600"
      };
    }
    
    return {
      message: "Every step counts! Keep going!",
      emoji: "👏",
      color: "text-indigo-600"
    };
  };

  const motivation = getMotivationalMessage(completed, percentage);
  
  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-green-500";
    if (percentage >= 75) return "bg-green-400";
    if (percentage >= 50) return "bg-blue-500";
    if (percentage >= 25) return "bg-yellow-500";
    return "bg-orange-500";
  };

  const progressColor = getProgressColor(percentage);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{motivation.emoji}</span>
          <span className="font-medium text-gray-900">Today's Progress</span>
        </div>
        <div className="text-sm text-gray-500">
          {completed} / {total} tasks
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ease-out ${progressColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Motivational Message */}
      <div className="text-center">
        <p className={`text-sm font-medium ${motivation.color}`}>
          {motivation.message}
        </p>
        {percentage >= 100 && (
          <div className="mt-2 inline-flex items-center bg-green-50 border border-green-200 rounded-full px-3 py-1">
            <span className="text-green-700 text-xs font-bold">🎯 DAY COMPLETED!</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyProgress; 