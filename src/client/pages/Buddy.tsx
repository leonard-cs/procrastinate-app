import React, { useState, useMemo, useEffect } from 'react';
import { useBuddyContext } from '../contexts/BuddyContext';
import { useUserContext } from '../contexts/UserContext';
import { useTaskContext } from '../contexts/TaskContext';
import { BuddyService } from '../../services/BuddyService';
import DailyStudyTracker from '../components/DailyStudyTracker';
import BuddySelector from '../components/BuddySelector';
import { User } from '../types/User';
import ConfirmRemoveModal from '../components/buddy/ConfirmRemoveModal';
import BuddyInvitationBox from '../components/buddy/BuddyInvitationBox';
import GeneralPokeModal from '../components/buddy/GeneralPokeModal';
import TaskItem from '../components/TaskItem';
import ModalPortal from '../components/ModalPortal';

type StudyMode = 'solo' | 'buddy';

const Buddy: React.FC = () => {
  const { 
    currentBuddy,
    invitedBy: hasInvitation,
    pendingRequest,
    buddyTasks: realtimeBuddyTasks,
    userProgress, 
    buddyProgress, 
    userRecentTasks, 
    buddyRecentTasks,
    isLoading,
    setBuddy,
    refreshBuddyData,
    acceptInvitation,
    rejectInvitation,
    cancelPendingRequest,
    updateBuddyTaskOptimistically
  } = useBuddyContext();

  const { toggleBuddyTask } = useTaskContext();
  
  const user = useUserContext();
  
  const [showBuddySelector, setShowBuddySelector] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [processingInvitation, setProcessingInvitation] = useState(false);
  const [studyMode, setStudyMode] = useState<StudyMode>('solo');
  const [showPokeModal, setShowPokeModal] = useState(false);
  const [pokingBuddy, setPokingBuddy] = useState(false);
  const [pokeSent, setPokeSent] = useState(false);

  // Use real-time buddy tasks from context
  const buddyTasks = realtimeBuddyTasks;

  // Sort buddy tasks by urgency (same logic as Home page)
  const sortedBuddyTasks = useMemo(() => {
    return [...buddyTasks].sort((a, b) => {
      // Completed tasks go to the bottom
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;
      if (a.completed && b.completed) return 0;

      // For uncompleted tasks, sort by urgency
      const now = new Date();
      
      // Handle tasks without due dates
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate && b.dueDate) {
        const bDaysUntilDue = Math.ceil((b.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return bDaysUntilDue <= 3 ? 1 : -1;
      }
      if (a.dueDate && !b.dueDate) {
        const aDaysUntilDue = Math.ceil((a.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return aDaysUntilDue <= 3 ? -1 : 1;
      }

      // Both have due dates
      if (a.dueDate && b.dueDate) {
        const aDaysUntilDue = Math.ceil((a.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const bDaysUntilDue = Math.ceil((b.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Overdue tasks first
        if (aDaysUntilDue < 0 && bDaysUntilDue >= 0) return -1;
        if (bDaysUntilDue < 0 && aDaysUntilDue >= 0) return 1;
        if (aDaysUntilDue < 0 && bDaysUntilDue < 0) return aDaysUntilDue - bDaysUntilDue;

        // Due soon tasks next
        return aDaysUntilDue - bDaysUntilDue;
      }

      return 0;
    });
  }, [buddyTasks]);

  const handleBuddySelected = async (buddy: User) => {
    try {
      // If the user already has a buddy, remove them first
      if (currentBuddy && currentBuddy.id !== buddy.id) {
        await BuddyService.removeBuddy(currentBuddy.id);
        setBuddy(null); // Clear local buddy state
      }

      await BuddyService.createBuddyPair(buddy.id);
      setShowBuddySelector(false);
      // Real-time listeners will automatically update the state
    } catch (error: any) {
      console.error('Error selecting buddy:', error);
      // alert(error.message || 'Failed to send buddy request. Please try again.');
    }
  };


  const handleRemoveBuddy = async () => {
    if (!currentBuddy) return;
    
    try {
      setRemoving(true);
      await BuddyService.removeBuddy(currentBuddy.id);
      setBuddy(null);
      setShowRemoveConfirm(false);
      // Real-time listeners will automatically update the state
    } catch (error) {
      console.error('Error removing buddy:', error);
      // alert('Failed to remove buddy. Please try again.');
    } finally {
      setRemoving(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!hasInvitation) return;
    
    try {
      setProcessingInvitation(true);
      await acceptInvitation(hasInvitation.id);
      // Real-time listeners will automatically update the state
    } catch (error) {
      console.error('Error accepting invitation:', error);
      // alert('Failed to accept invitation. Please try again.');
    } finally {
      setProcessingInvitation(false);
    }
  };

  const handleRejectInvitation = async () => {
    if (!hasInvitation) return;
    
    try {
      setProcessingInvitation(true);
      await rejectInvitation(hasInvitation.id);
      // Real-time listeners will automatically update the state
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      // alert('Failed to reject invitation. Please try again.');
    } finally {
      setProcessingInvitation(false);
    }
  };

  const handleCancelPendingRequest = async () => {
    try {
      await cancelPendingRequest();
      // Real-time listeners will automatically update the state
    } catch (error) {
      console.error('Error canceling request:', error);
      // alert('Failed to cancel request. Please try again.');
    }
  };

  const handleToggleBuddyTask = async (taskId: string) => {
    if (!currentBuddy) return;
    
    // Find the task to get its current state
    const taskToUpdate = buddyTasks.find(task => task.id === taskId);
    if (!taskToUpdate) return;
    
    const newCompletedState = !taskToUpdate.completed;
    
    try {
      // Optimistically update the buddy context for immediate visual feedback
      updateBuddyTaskOptimistically(taskId, newCompletedState);

      await toggleBuddyTask(taskId, currentBuddy.id);
      // Real-time listeners will automatically update the tasks
    } catch (error) {
      console.error('Error toggling buddy task:', error);
      // Revert optimistic update on error
      updateBuddyTaskOptimistically(taskId, !newCompletedState);
    }
  };

  const handleSendGeneralPoke = async (message: string) => {
    if (!currentBuddy) return;
    
    try {
      setPokingBuddy(true);
      await BuddyService.sendGeneralPoke(currentBuddy.id, message);
      setShowPokeModal(false);
      setPokeSent(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setPokeSent(false);
      }, 3000);
      
      // Real-time listeners will automatically update poke notifications
    } catch (error) {
      console.error('Error sending general poke:', error);
      alert('Failed to send poke. Please try again.');
    } finally {
      setPokingBuddy(false);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours === 1) {
      return '1 hour ago';
    } else {
      return `${diffInHours} hours ago`;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading buddy system...</p>
        </div>
      </div>
    );
  }

  if (!currentBuddy) {
    return (
      <div className="container mx-auto px-4 py-0">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-6xl mb-6">👥</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Find Your Accountability Buddy</h1>
          <p className="text-gray-600 mb-6">
            Partner up with your friends to stay motivated, track daily study progress, and achieve your goals together!
          </p>
          
          {/* Show incoming invitation */}
          {hasInvitation && (
            <BuddyInvitationBox 
              name={hasInvitation.name}
              onAccept={handleAcceptInvitation}
              onReject={handleRejectInvitation}
              processing={processingInvitation}
            />
          )}

          {/* Show pending request status */}
          {pendingRequest && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6 shadow-sm">
              <div className="text-gray-800 mb-3">
                <strong>Pending Request</strong> - Waiting for {pendingRequest.name} to respond to your buddy request.
              </div>
              <button
                onClick={handleCancelPendingRequest}
                className="text-red-600 hover:text-red-800 text-sm underline"
              >
                Cancel Request
              </button>
            </div>
          )}
          
          <div className="bg-blue-50 rounded-lg p-6 mb-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">Benefits of Having a Buddy:</h3>
            <ul className="text-left text-blue-700 space-y-2">
              <li className="flex items-center">
                <span className="mr-2">⏰</span>
                See each other's daily study time progress
              </li>
              <li className="flex items-center">
                <span className="mr-2">🤝</span>
                Only your buddy can mark your tasks as complete (accountability!)
              </li>
              <li className="flex items-center">
                <span className="mr-2">📊</span>
                Stay motivated through friendly competition
              </li>
              <li className="flex items-center">
                <span className="mr-2">🎯</span>
                Achieve your study goals together
              </li>
            </ul>
          </div>
          
          {/* Only show Choose Buddy button if no pending request */}
          {!pendingRequest && (
            <button
              onClick={() => setShowBuddySelector(true)}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg"
            >
              Choose Your Buddy
            </button>
          )}
        </div>
        
        {showBuddySelector && (
          <BuddySelector
            onBuddySelected={handleBuddySelected}
            onCancel={() => setShowBuddySelector(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Buddy System</h1>
          <p className="text-gray-600">Track your daily study progress together!</p>
        </div>

        {/* Daily Study Tracker */}
        <DailyStudyTracker studyMode={studyMode} setStudyMode={setStudyMode} />

        {/* Buddy Info Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-green-600 font-bold text-2xl">
                  {currentBuddy.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{currentBuddy.name}</h2>
                <p className="text-gray-600">Your Buddy</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              {pokeSent && (
                <div className="bg-green-100 text-green-800 px-2 py-1 rounded-lg text-sm animate-pulse flex items-center">
                  ✅ Sent!
                </div>
              )}
              <button
                onClick={() => setShowPokeModal(true)}
                disabled={pokingBuddy}
                className="px-2 py-2 text-yellow-600 border border-yellow-300 rounded-lg hover:bg-yellow-50 disabled:bg-yellow-100 transition-colors text-sm font-medium"
                title="Send a poke to your buddy"
              >
                {pokingBuddy ? '⏳' : '👈'}
              </button>
              {/* Commented out Change Buddy button - keeping code for potential future use */}
              <button
                onClick={() => setShowBuddySelector(true)}
                className="px-2 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm"
              >
                🔁
              </button>
              
              <button
                onClick={() => setShowRemoveConfirm(true)}
                className="px-2 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors text-sm"
              >
                ❌
              </button>
            </div>
          </div>

          {/* Accountability Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center text-blue-800">
              <span className="mr-2 text-lg">🤝</span>
              <div>
                <div className="font-medium">Mutual Accountability</div>
                <div className="text-sm text-blue-600">You can mark {currentBuddy.name}'s tasks complete, and they can mark yours!</div>
              </div>
            </div>
          </div>

          {/* Task Progress Comparison */}
          <div className="grid grid-cols-2 gap-3 sm:gap-6 mb-6">
            {/* Your Task Progress */}
            <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
              <h3 className="text-sm sm:text-lg font-semibold text-blue-800 mb-2 sm:mb-3">Your Task Progress</h3>
              <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1 sm:mb-2">
                {userProgress.completed}/{userProgress.total} tasks
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${userProgress.percentage}%` }}
                ></div>
              </div>
              <p className="text-xs sm:text-sm text-blue-600 mt-1 sm:mt-2">{userProgress.percentage}% complete</p>
            </div>

            {/* Buddy's Task Progress */}
            <div className="bg-green-50 rounded-lg p-3 sm:p-4">
              <h3 className="text-sm sm:text-lg font-semibold text-green-800 mb-2 sm:mb-3">{currentBuddy.name}'s Task Progress</h3>
              <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1 sm:mb-2">
                {buddyProgress.completed}/{buddyProgress.total} tasks
              </div>
              <div className="w-full bg-green-200 rounded-full h-2.5">
                <div 
                  className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${buddyProgress.percentage}%` }}
                ></div>
              </div>
              <p className="text-xs sm:text-sm text-green-600 mt-1 sm:mt-2">{buddyProgress.percentage}% complete</p>
            </div>
          </div>

          {/* Motivation Message */}
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-gray-700">
              {userProgress.percentage > buddyProgress.percentage ? (
                <span>🎉 Great job! You're ahead of {currentBuddy.name}. Keep it up!</span>
              ) : userProgress.percentage < buddyProgress.percentage ? (
                <span>💪 {currentBuddy.name} is ahead! Time to catch up!</span>
              ) : (
                <span>🤝 You and {currentBuddy.name} are tied! Keep pushing together!</span>
              )}
            </p>
          </div>
        </div>

        {/* Buddy's Tasks - Mark as Complete Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800">
              Mark {currentBuddy.name}'s Tasks Complete
            </h3>
            <div className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg">
              Real-time updates
            </div>
          </div>

          {sortedBuddyTasks.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">📝</div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">No Tasks Yet</h4>
              <p className="text-gray-600">{currentBuddy.name} hasn't added any tasks yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedBuddyTasks.map((task) => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  toggleComplete={handleToggleBuddyTask}
                  isBuddyTask={true}
                  buddyId={currentBuddy.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent Tasks Comparison */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6">
          {/* Your Recent Tasks */}
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
            <h3 className="text-sm sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">Your Recent Tasks</h3>
                          <div className="space-y-1 sm:space-y-2">
                {userRecentTasks.length === 0 ? (
                  <p className="text-gray-500 text-center py-2 sm:py-3 text-xs sm:text-sm">No tasks yet. Start by adding some tasks!</p>
                ) : (
                  userRecentTasks.map((task) => (
                    <div 
                      key={task.id} 
                      className={`flex items-center justify-between p-1.5 sm:p-2 rounded-md border ${
                        task.completed 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center min-w-0 flex-1">
                        <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full mr-2 sm:mr-3 flex-shrink-0 ${
                          task.completed ? 'bg-green-500' : 'bg-gray-300'
                        }`}></div>
                        <span className={`text-xs sm:text-sm truncate ${
                          task.completed ? 'text-green-800 line-through' : 'text-gray-800'
                        }`}>
                          {task.name}
                        </span>
                      </div>
                      {task.completed && task.completedAt && (
                        <span className="text-xs text-green-600 ml-1 flex-shrink-0 hidden sm:inline">
                          {formatTimeAgo(task.completedAt)}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Buddy's Recent Tasks */}
            <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">
                {currentBuddy.name}'s Recent Tasks
              </h3>
              <div className="space-y-1 sm:space-y-2">
                {buddyRecentTasks.length === 0 ? (
                  <p className="text-gray-500 text-center py-2 sm:py-3 text-xs sm:text-sm">{currentBuddy.name} hasn't added any tasks yet.</p>
                ) : (
                  buddyRecentTasks.map((task) => (
                    <div 
                      key={task.id} 
                      className={`flex items-center justify-between p-1.5 sm:p-2 rounded-md border ${
                        task.completed 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center min-w-0 flex-1">
                        <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full mr-2 sm:mr-3 flex-shrink-0 ${
                          task.completed ? 'bg-green-500' : 'bg-gray-300'
                        }`}></div>
                        <span className={`text-xs sm:text-sm truncate ${
                          task.completed ? 'text-green-800 line-through' : 'text-gray-800'
                        }`}>
                          {task.name}
                        </span>
                      </div>
                      {task.completed && task.completedAt && (
                        <span className="text-xs text-green-600 ml-1 flex-shrink-0 hidden sm:inline">
                          {formatTimeAgo(task.completedAt)}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
        </div>

        {/* Remove Buddy Confirmation Modal */}
        <ModalPortal>
          <ConfirmRemoveModal 
            currentBuddyName={currentBuddy.name} 
            isOpen ={showRemoveConfirm}
            onClose={() => setShowRemoveConfirm(false)}
            onConfirm={handleRemoveBuddy}
            isLoading ={removing}
          />
        </ModalPortal>

        {/* Buddy Selector Modal */}
        <ModalPortal>
        {showBuddySelector && (
          <BuddySelector
            onBuddySelected={handleBuddySelected}
            onCancel={() => setShowBuddySelector(false)}
          />
        )}
        </ModalPortal>

        {/* Buddy Invitation Box */}

        {/* General Poke Modal */}
        <ModalPortal>
          {showPokeModal && (
            <GeneralPokeModal
              buddyName={currentBuddy.name}
              onSendPoke={handleSendGeneralPoke}
              onCancel={() => setShowPokeModal(false)}
              isLoading={pokingBuddy}
            />
          )}
        </ModalPortal>
      </div>
    </div>
  );
};

export default Buddy; 