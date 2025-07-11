import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { User } from '../types/User';
import { Task } from '../types/Task';
import { BuddyService } from '../../services/BuddyService';
import { useUserContext } from './UserContext';
import { auth } from '../../firebaseConfig';
import { subscribeToBuddyTasks } from '../../services/TaskService';
import { Unsubscribe } from 'firebase/firestore';

interface BuddyContextType {
  currentBuddy: User | null;
  invitedBy: User | null;
  pendingRequest: User | null;
  buddyTasks: any[];
  userProgress: {
    completed: number;
    total: number;
    percentage: number;
  };
  buddyProgress: {
    completed: number;
    total: number;
    percentage: number;
  };
  userRecentTasks: Array<{
    id: string;
    name: string;
    completed: boolean;
    completedAt?: Date;
  }>;
  buddyRecentTasks: Array<{
    id: string;
    name: string;
    completed: boolean;
    completedAt?: Date;
  }>;
  isLoading: boolean;
  setBuddy: (buddy: User | null) => void;
  refreshBuddyData: () => void;
  acceptInvitation: (inviterId: string) => Promise<void>;
  rejectInvitation: (inviterId: string) => Promise<void>;
  cancelPendingRequest: () => Promise<void>;
  updateBuddyTaskOptimistically: (taskId: string, completed: boolean) => void;
}

const BuddyContext = createContext<BuddyContextType | undefined>(undefined);

export const useBuddyContext = () => {
  const context = useContext(BuddyContext);
  if (!context) {
    throw new Error('useBuddyContext must be used within a BuddyProvider');
  }
  return context;
};

interface BuddyProviderProps {
  children: ReactNode;
  userTasks: Task[];
}

export const BuddyProvider: React.FC<BuddyProviderProps> = ({ 
  children, 
  userTasks
}) => {
  const user = useUserContext();
  const [currentBuddy, setCurrentBuddy] = useState<User | null>(null);
  const [invitedBy, setInvitedBy] = useState<User | null>(null);
  const [pendingRequest, setPendingRequest] = useState<User | null>(null);
  const [buddyTasks, setBuddyTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Set up real-time listeners when user is authenticated
  useEffect(() => {
    if (!user) {
      setCurrentBuddy(null);
      setBuddyTasks([]);
      setInvitedBy(null);
      setPendingRequest(null);
      setIsLoading(false);
      return;
    }

    console.log('BuddyContext: Setting up real-time listeners for user:', user.uid);
    setIsLoading(true);

    // Set up real-time listener for current buddy
    const unsubscribeBuddy = BuddyService.subscribeToCurrentBuddy(user.uid, (buddy) => {
      console.log('BuddyContext: Received buddy update:', buddy ? buddy.name : 'null');
      setCurrentBuddy(buddy);
      setIsLoading(false);
    });

    // Set up real-time listener for invitations received
    const unsubscribeInvitedBy = BuddyService.subscribeToInvitedBy(user.uid, (inviter) => {
      console.log('BuddyContext: Received invitation update:', inviter ? inviter.name : 'null');
      setInvitedBy(inviter);
    });

    // Set up real-time listener for pending requests sent
    const unsubscribePendingRequest = BuddyService.subscribeToPendingRequest(user.uid, (pending) => {
      console.log('BuddyContext: Received pending request update:', pending ? pending.name : 'null');
      setPendingRequest(pending);
    });

    // Cleanup function
    return () => {
      console.log('BuddyContext: Cleaning up buddy listeners for user:', user.uid);
      unsubscribeBuddy();
      unsubscribeInvitedBy();
      unsubscribePendingRequest();
    };
  }, [user]);

  // Set up real-time listener for buddy's tasks when buddy changes
  useEffect(() => {
    if (!currentBuddy) {
      setBuddyTasks([]);
      return;
    }

    const unsubscribe = subscribeToBuddyTasks(currentBuddy.id, (tasks) => {
      setBuddyTasks(tasks);
    });

    return () => {
      unsubscribe();
    };
  }, [currentBuddy]);

  // Fallback functions for manual loading (kept for backward compatibility)
  const loadInvitedBy = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return;
    }

    try {
      const inviter: User | null = await BuddyService.getInvitedBy(currentUser.uid);
      setInvitedBy(inviter);
    } catch (error) {
      console.error('Error loading inviter:', error);
      setInvitedBy(null);
    }
  };

  const loadPendingRequest = async () => {
    try {
      const pending: User | null = await BuddyService.getPendingRequest();
      setPendingRequest(pending);
    } catch (error) {
      console.error('Error loading pending request:', error);
      setPendingRequest(null);
    }
  };

  const loadCurrentBuddy = async () => {
    try {
      setIsLoading(true);
      const buddy = await BuddyService.getCurrentBuddy();
      setCurrentBuddy(buddy);
    } catch (error) {
      console.error('Error loading buddy:', error);
      setCurrentBuddy(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBuddyTasks = async () => {
    if (!currentBuddy) return;
    
    try {
      const tasks = await BuddyService.getBuddyTasks(currentBuddy.id);
      setBuddyTasks(tasks);
    } catch (error) {
      console.error('Error loading buddy tasks:', error);
      setBuddyTasks([]);
    }
  };

  const acceptInvitation = async (inviterId: string) => {
    try {
      await BuddyService.acceptBuddyInvitation(inviterId);
      // Real-time listeners will automatically update the state
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  };

  const rejectInvitation = async (inviterId: string) => {
    try {
      await BuddyService.rejectBuddyInvitation(inviterId);
      // Real-time listeners will automatically update the state
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      throw error;
    }
  };

  const cancelPendingRequest = async () => {
    if (!pendingRequest) return;
    
    try {
      await BuddyService.rejectBuddyInvitation(pendingRequest.id);
      // Real-time listeners will automatically update the state
    } catch (error) {
      console.error('Error canceling pending request:', error);
      throw error;
    }
  };

  // Dynamic user progress calculation from actual tasks
  const userProgress = useMemo(() => {
    const completedTasks = userTasks.filter(task => task.completed).length;
    const totalTasks = userTasks.length;
    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    return {
      completed: completedTasks,
      total: totalTasks,
      percentage: Math.min(percentage, 100)
    };
  }, [userTasks]);

  // Dynamic buddy progress calculation from real buddy tasks
  const buddyProgress = useMemo(() => {
    const completedTasks = buddyTasks.filter(task => task.completed);
    const totalTasks = buddyTasks.length;
    const percentage = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
    
    return {
      completed: completedTasks.length,
      total: totalTasks,
      percentage: Math.min(percentage, 100)
    };
  }, [buddyTasks]);

  // Dynamic user recent tasks from actual tasks
  const userRecentTasks = useMemo(() => {
    return userTasks
      .sort((a, b) => {
        // Sort by completion date if completed, otherwise by creation date
        const dateA = a.completedAt || a.createdAt;
        const dateB = b.completedAt || b.createdAt;
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 6) // Show last 6 tasks
      .map(task => ({
        id: task.id,
        name: task.name,
        completed: task.completed || false,
        completedAt: task.completedAt
      }));
  }, [userTasks]);

  // Dynamic buddy recent tasks from real buddy tasks
  const buddyRecentTasks = useMemo(() => {
    return buddyTasks
      .sort((a, b) => {
        // Sort by completion date if completed, otherwise by creation date
        const dateA = a.completedAt || a.createdAt;
        const dateB = b.completedAt || b.createdAt;
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 6) // Show last 6 tasks
      .map(task => ({
        id: task.id,
        name: task.name,
        completed: task.completed || false,
        completedAt: task.completedAt
      }));
  }, [buddyTasks]);

  const setBuddy = (buddy: User | null) => {
    setCurrentBuddy(buddy);
  };

  const refreshBuddyData = () => {
    if (user) {
      loadCurrentBuddy();
      loadInvitedBy();
      loadPendingRequest();
    }
  };

  const updateBuddyTaskOptimistically = (taskId: string, completed: boolean) => {
    setBuddyTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              completed, 
              completedAt: completed ? new Date() : undefined 
            }
          : task
      )
    );
  };

  return (
    <BuddyContext.Provider value={{ 
      currentBuddy,
      invitedBy,
      pendingRequest,
      buddyTasks,
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
    }}>
      {children}
    </BuddyContext.Provider>
  );
}; 