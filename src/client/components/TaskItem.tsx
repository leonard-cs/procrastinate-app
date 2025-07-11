import React, { useEffect, useState } from 'react';
import { Task } from '../types/Task';
import TaskEditModal from './TaskEditModal';
import { useTaskContext } from '../contexts/TaskContext';
import { isPokedByBuddy, setTaskPoke } from '../../services/TaskService';


interface TaskItemProps {
  task: Task;
  toggleComplete: (id: string) => void;
  isBuddyTask?: boolean;
  buddyId?: string;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, toggleComplete, isBuddyTask = false, buddyId }) => {
  const { tasks, editTask, deleteTask, hasBuddy, canToggleOwnTasks, toggleBuddyTask } = useTaskContext();
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isPoked, setIsPoked] = useState<boolean | null>(null);

  useEffect(() => {
    // Use the isPoked value directly from the real-time task data
    setIsPoked(task.isPoked);
  }, [task.isPoked]);

  const editingTask = tasks.find(t => t.id === editingTaskId) ?? null;

  const handleOpenModal = (id: string) => setEditingTaskId(id);
  const handleCloseModal = () => setEditingTaskId(null);
  const handleEditTask = (updatedTask: Task) => {
    editTask(updatedTask);
    setEditingTaskId(null);
  };

  const handleToggleComplete = () => {
    if (isBuddyTask && buddyId) {
      toggleBuddyTask(task.id, buddyId);
    } else {
      toggleComplete(task.id);
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'light': return 'bg-green-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'heavy': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getEffortEmoji = (effort: string) => {
    switch (effort) {
      case 'light': return '🟢';
      case 'medium': return '🟡';
      case 'heavy': return '🔴';
      default: return '⚪';
    }
  };

  const getHeroGradient = (effort: string) => {
    switch (effort) {
      case 'light': return 'from-green-400 to-green-600';
      case 'medium': return 'from-yellow-400 to-orange-500';
      case 'heavy': return 'from-red-400 to-red-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  const getDueDateInfo = (dueDate?: Date) => {
    if (!dueDate) return null;

    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let urgencyColor = 'text-gray-600';
    let urgencyText = '';
    let urgencyIcon = '📅';

    if (diffDays < 0) {
      urgencyColor = 'text-red-600 font-bold';
      urgencyText = `${Math.abs(diffDays)} days overdue`;
      urgencyIcon = '🚨';
    } else if (diffDays === 0) {
      urgencyColor = 'text-red-600 font-bold';
      urgencyText = 'Due today';
      urgencyIcon = '⚠️';
    } else if (diffDays === 1) {
      urgencyColor = 'text-orange-600 font-medium';
      urgencyText = 'Due tomorrow';
      urgencyIcon = '⏰';
    } else if (diffDays <= 3) {
      urgencyColor = 'text-yellow-600 font-medium';
      urgencyText = `Due in ${diffDays} days`;
      urgencyIcon = '📅';
    } else {
      urgencyColor = 'text-gray-600';
      urgencyText = `Due ${formatDate(due)}`;
      urgencyIcon = '📅';
    }

    return { urgencyColor, urgencyText, urgencyIcon };
  };

  const dueDateInfo = getDueDateInfo(task.dueDate);

  const isCompleteButtonDisabled = !isBuddyTask && hasBuddy && !canToggleOwnTasks;

  const handlePoke = async () => {
    if (!buddyId) return;
    
    const newPokeState = !isPoked;
    
    try {
      // Optimistic update for immediate feedback
      setIsPoked(newPokeState);
      
      // Update the database
      await setTaskPoke(task.id, newPokeState);
      console.log('TaskItem: Task poke updated successfully:', task.name, 'isPoked:', newPokeState);
    } catch (error) {
      // Revert optimistic update on error
      setIsPoked(!newPokeState);
      console.error('TaskItem: Error updating task poke:', error);
    }
  };

  return (
    <div className={`bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200 mb-4 ${task.completed ? 'opacity-60' : ''}`}>
      {/* Hero Section */}
      <div className={`h-12 bg-gradient-to-r ${getHeroGradient(task.effort)} relative`}>
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        <div className="absolute bottom-3 left-4 text-white">
          <span className={`px-2 py-1 rounded-full text-xs font-bold ${getEffortColor(task.effort)} border-2 border-white-200`}>
              {task.effort.toUpperCase()}
            </span>
          {/*
          <div className="text-3xl mb-1">{getEffortEmoji(task.effort)}</div>
          <div className="text-xs opacity-90">{isBuddyTask ? 'Buddy Task' : 'Task'}</div>
          */}
        </div>
        {task.completed && (
          <div className="absolute bottom-3 right-4 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
            ✓ Complete
          </div>
        )}
        {dueDateInfo && dueDateInfo.urgencyText.includes('overdue') && !task.completed && (
          <div className="absolute bottom-3 right-4 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
            🚨 OVERDUE
          </div>
        )}
        {dueDateInfo && dueDateInfo.urgencyText === 'Due today' && !task.completed && (
          <div className="absolute bottom-3 right-4 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold">
            ⚠️ TODAY
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <h3 className={`text-lg font-semibold ${task.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {task.name}
          </h3>
          {task.completed && (
            <div className="text-right">
              <div className="text-lg font-bold text-green-600">Done!</div>
              <div className="text-xs text-gray-500">completed</div>
            </div>
          )}
        </div>

        {/* Due Date Display */}
        {dueDateInfo && (
          <div className={`mb-3 text-sm ${dueDateInfo.urgencyColor}`}>
            <span className="mr-1">{dueDateInfo.urgencyIcon}</span>
            {dueDateInfo.urgencyText}
          </div>
        )}

        {/* Buddy Accountability Message */}
        {isCompleteButtonDisabled && !task.completed && (
          <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center text-blue-800 text-sm">
              <span className="mr-2">🤝</span>
              <span>Only your buddy can mark this task as complete!</span>
            </div>
          </div>
        )}

        {isPoked && !isBuddyTask && !task.completed && (
          <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center text-blue-800 text-sm">
              <span className="mr-2">🤝</span>
              <span>Your buddy is keeping an eye on you. Don't slack off! 😅</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/*
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${getEffortColor(task.effort)}`}>
              {task.effort.toUpperCase()}
            </span>
            */}
            <div className="flex items-center text-gray-500 text-sm">
              <span className="mr-1">📅</span>
              <span>Added {formatDate(task.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Poke Button Section */}
            {!task.completed && isBuddyTask && (
              <button
                className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-600 transition-colors text-sm"
                onClick={handlePoke}
              >
                {isPoked ? "UnPoke" : "Poke Buddy"}
              </button>
            )}

            {!task.completed && !isBuddyTask && (
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
                onClick={() => handleOpenModal(task.id)}
              >
                Edit
              </button>
            )}

            <button
              className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${isCompleteButtonDisabled
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              onClick={handleToggleComplete}
              disabled={isCompleteButtonDisabled}
              title={isCompleteButtonDisabled ? 'Only your buddy can mark this complete' : ''}
            >
              {task.completed ? 'Undo' : (isBuddyTask ? 'Mark for Buddy' : 'Mark Done')}
            </button>
          </div>

        </div>
      </div>
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onSave={handleEditTask}
          onClose={handleCloseModal}
          onDelete={deleteTask}
        />
      )}
    </div>
  );
};

export default TaskItem;