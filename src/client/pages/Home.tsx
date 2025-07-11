import React, { useEffect, useMemo, useState } from 'react';
import { useTaskContext } from '../contexts/TaskContext';
import TaskList from '../components/TaskList';
import DailyProgress from '../components/DailyProgress';
import { useUserContext } from '../contexts/UserContext';
import { useBuddyContext } from '../contexts/BuddyContext';
import GeneralPokeNotification from '../components/GeneralPokeNotification';
import { useRealtimePokes } from '../hooks/useRealtimePokes';
import { auth, googleProvider } from '../../firebaseConfig';
import { signInWithPopup, signOut } from 'firebase/auth';

const Home: React.FC = () => {
  const user = useUserContext();
  const { currentBuddy } = useBuddyContext();
  const { tasks, toggleCompleteTask, dailyProgress, getTasksList, hasBuddy, canToggleOwnTasks } = useTaskContext();
  const { latestPoke, dismissLatestPoke } = useRealtimePokes();
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [calmMode, setCalmMode] = useState(() => {
    // Load calm mode preference from localStorage
    const saved = localStorage.getItem('calmMode');
    return saved ? JSON.parse(saved) : false;
  });

  // Save calm mode preference to localStorage
  useEffect(() => {
    localStorage.setItem('calmMode', JSON.stringify(calmMode));
  }, [calmMode]);

  const handleAuth = async () => {
    try {
      if (user) {
        await signOut(auth);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error) {
      console.error('Auth error:', error);
    }
  };

  // Sort tasks by priority and completion status
  const sortedTasks = useMemo(() => {
    const now = new Date();
    
    return [...tasks]
      .sort((a, b) => {
        // First, prioritize incomplete tasks
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        
        // For incomplete tasks, sort by urgency/priority
        if (!a.completed) {
          // Check if either task is overdue
          const aOverdue = a.dueDate && a.dueDate.getTime() < now.getTime();
          const bOverdue = b.dueDate && b.dueDate.getTime() < now.getTime();
          
          if (aOverdue !== bOverdue) {
            return aOverdue ? -1 : 1; // Overdue tasks first
          }
          
                     // Both tasks have similar due date status, sort by effort (heavy effort first for motivation)
           const effortOrder = { heavy: 3, medium: 2, light: 1 };
           const aEffort = effortOrder[a.effort] || 0;
           const bEffort = effortOrder[b.effort] || 0;
          
          if (aEffort !== bEffort) {
            return bEffort - aEffort; // Higher effort first
          }
          
          // Finally, sort by due date if both have them
          if (a.dueDate && b.dueDate) {
            return a.dueDate.getTime() - b.dueDate.getTime();
          }
          
          // Tasks with due dates come before those without
          if (a.dueDate !== b.dueDate) {
            return a.dueDate ? -1 : 1;
          }
        }
        
        // For completed tasks, sort by completion date (most recent first)
        if (a.completedAt && b.completedAt) {
          return b.completedAt.getTime() - a.completedAt.getTime();
        }
        
        // Default to creation date
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }, [tasks]);

  const handleDismissPoke = async () => {
    try {
      await dismissLatestPoke();
    } catch (error) {
      console.error('Error dismissing poke:', error);
    }
  };

  // Determine which tasks to show based on showAllTasks state
  const tasksToShow = useMemo(() => {
    if (showAllTasks || sortedTasks.length <= 3) {
      return sortedTasks;
    }
    return sortedTasks.slice(0, 3);
  }, [sortedTasks, showAllTasks]);

  // Get only the most urgent incomplete task for calm mode
  const mostUrgentTask = useMemo(() => {
    return sortedTasks.find(task => !task.completed);
  }, [sortedTasks]);

  const urgentTasksCount = useMemo(() => {
    const now = new Date();
    return tasks.filter(task => {
      if (task.completed || !task.dueDate) return false;
      const daysUntilDue = Math.ceil((task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDue <= 1; // Due today or overdue
    }).length;
  }, [tasks]);

  // Calm Mode Interface
  if (calmMode) {
    return (
      <main className="max-w-lg mx-auto min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50">
        {/* General Poke Notification in Calm Mode */}
        {latestPoke && currentBuddy && (
          <div className="p-4">
            <GeneralPokeNotification
              poke={latestPoke}
              buddyName={currentBuddy.name}
              onDismiss={handleDismissPoke}
            />
          </div>
        )}
        {/* Calm Mode Toggle */}
        <div className="flex justify-between items-center p-4">
          <div></div>
          <button
            onClick={() => setCalmMode(false)}
            className="p-2 rounded-full bg-white shadow-sm hover:shadow-md transition-all duration-200"
            title="Switch to normal mode"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Calm Content */}
        <div className="px-6 py-8 text-center">
          <div className="text-6xl mb-6">🌸</div>
          <h1 className="text-2xl font-light text-gray-700 mb-4">Take a breath</h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            You're doing great. Just try for 5 minutes first.
          </p>

          {/* Buddy Accountability Notice in Calm Mode */}
          {hasBuddy && !canToggleOwnTasks && mostUrgentTask && !mostUrgentTask.completed && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="text-sm text-blue-700 mb-2">🤝 Buddy Accountability</div>
              <div className="text-xs text-blue-600">Your buddy will verify task completion</div>
            </div>
          )}

          {/* Next Task (if any) */}
          {mostUrgentTask && (
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-sm text-gray-500 mb-3">Breathe in, breathe out, then...</div>
              <div className="text-lg text-gray-800 font-medium mb-4">{mostUrgentTask.name}</div>
              <div className="text-sm text-gray-500 mb-4">Just 5 minutes. That's all.</div>
              
              {hasBuddy && !canToggleOwnTasks ? (
                <div className="bg-blue-50 rounded-lg p-3 text-blue-700 text-sm">
                  <span className="mr-1">🤝</span>
                  Work on this task - your buddy will mark it complete!
                </div>
              ) : (
                <button
                  onClick={() => toggleCompleteTask(mostUrgentTask.id)}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full text-sm font-medium transition-colors duration-200"
                >
                  Mark Complete ✓
                </button>
              )}
            </div>
          )}

          {!mostUrgentTask && (
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-lg text-gray-700 mb-2">All caught up! 🎉</div>
              <div className="text-sm text-gray-500">Take some time for yourself</div>
            </div>
          )}
        </div>
      </main>
    );
  }

  // Normal Mode Interface
  return (
    <main className="max-w-lg mx-auto">
      {/* General Poke Notification */}
      {latestPoke && currentBuddy && (
        <div className="p-4">
          <GeneralPokeNotification
            poke={latestPoke}
            buddyName={currentBuddy.name}
            onDismiss={handleDismissPoke}
          />
        </div>
      )}
      {/* Header with Toggle */}
      {/*
      <div className="bg-white border-b border-gray-200 p-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="text-3xl">🎯</div>
              <h1 className="text-2xl font-bold text-gray-900">Explore your tasks!</h1>
            </div>
            
            // Buddy Status
            {hasBuddy && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-2">
                <p className="text-blue-700 text-xs font-medium">
                  🤝 Buddy Mode: Only your buddy can mark your tasks complete
                </p>
              </div>
            )}

            {urgentTasksCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 mt-2">
                <p className="text-red-700 text-sm font-medium">
                  🚨 {urgentTasksCount} urgent task{urgentTasksCount > 1 ? 's' : ''} need{urgentTasksCount === 1 ? 's' : ''} attention!
                </p>
              </div>
            )}
          </div>
          
          // Calm Mode Toggle
          <div className="flex flex-col items-end">
            <div className="text-xs text-gray-400 mb-1">Feeling stressed?</div>
            <button
              onClick={() => setCalmMode(true)}
              className="p-2 rounded-full bg-blue-50 hover:bg-blue-100 transition-all duration-200 group"
              title="Switch to calm mode - for when you're feeling overwhelmed"
            >
              <svg className="w-5 h-5 text-blue-600 group-hover:text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
            onClick={handleAuth}
          >
            {user ? "Logout" : "Login"}
          </button>
        </div>
      </div>
      */}
      
      {/* Daily Progress */}
      <div className="px-4">
        <DailyProgress 
          completed={dailyProgress.completed}
          total={dailyProgress.total}
          percentage={dailyProgress.percentage}
        />
      </div>
      
      {/* Tasks List */}
      <div className="px-4">
        <TaskList tasks={tasksToShow} onComplete={toggleCompleteTask} />
        
        {/* Show More/Less Button */}
        {sortedTasks.length > 3 ? (
          <div className="text-center mt-4 mb-6">
            {showAllTasks ? (
              <div className="text-center">
                <div className="text-gray-500 text-sm mb-2">
                  All caught up! 🎉
                </div>
                <button
                  onClick={() => setShowAllTasks(false)}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors duration-200"
                >
                  Show Less
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAllTasks(true)}
                className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors duration-200 flex items-center justify-center mx-auto gap-1"
              >
                <span>See More</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        ) : sortedTasks.length > 0 && (
          <div className="text-center mt-4 mb-6">
            <div className="text-gray-500 text-sm">
              That's all your tasks! ✨
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default Home;