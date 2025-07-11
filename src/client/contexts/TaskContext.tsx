// src/client/contexts/TaskContext.tsx
import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect, useCallback } from 'react';
import { Task } from '../types/Task';
import { parseTask } from '../utils/parseTask';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, Unsubscribe } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useUserContext } from './UserContext';
import { BuddyService } from '../../services/BuddyService';
import { subscribeToUserTasks } from '../../services/TaskService';

interface TaskContextType {
  tasks: Task[];
  addTask: (task: Task) => void;
  toggleCompleteTask: (id: string) => void;
  toggleBuddyTask: (taskId: string, buddyId: string) => void;
  editTask: (updatedTask: Task) => void;
  deleteTask: (id: string) => void;
  getTasksList: () => void;
  dailyProgress: {
    completed: number;
    total: number;
    percentage: number;
  };
  hasBuddy: boolean;
  canToggleOwnTasks: boolean;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
};

interface TaskProviderProps {
  children: ReactNode;
}

export const TaskProvider: React.FC<TaskProviderProps> = ({ children }) => {
  const user = useUserContext();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hasBuddy, setHasBuddy] = useState(false);

  // Check if user has a buddy
  const checkBuddyStatus = useCallback(async () => {
    if (!user) {
      setHasBuddy(false);
      return;
    }

    try {
      const buddy = await BuddyService.getCurrentBuddy();
      setHasBuddy(!!buddy);
    } catch (error) {
      console.error('Error checking buddy status:', error);
      setHasBuddy(false);
    }
  }, [user]);

  // Users with buddies cannot toggle their own tasks
  const canToggleOwnTasks = !hasBuddy;

  // Set up real-time listener for tasks
  useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    }

    console.log('TaskContext: Setting up real-time listener for user:', user.uid);
    let unsubscribe: Unsubscribe;

    // Subscribe to real-time updates for user's tasks
    unsubscribe = subscribeToUserTasks(user.uid, (updatedTasks) => {
      console.log('TaskContext: Received task update, setting', updatedTasks.length, 'tasks');
      setTasks(updatedTasks);
    });

    // Also check buddy status
    checkBuddyStatus();

    // Cleanup function
    return () => {
      if (unsubscribe) {
        console.log('TaskContext: Cleaning up task listener for user:', user.uid);
        unsubscribe();
      }
    };
  }, [user, checkBuddyStatus]);

  // Set up real-time listener for buddy status
  useEffect(() => {
    if (!user) {
      setHasBuddy(false);
      return;
    }

    const unsubscribe = BuddyService.subscribeToCurrentBuddy(user.uid, (buddy) => {
      setHasBuddy(!!buddy);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Fallback function for manual refresh (kept for backward compatibility)
  const getTasksList = useCallback(async () => {
    try {
      const tasksCollection = collection(db, "tasks");

      const q = user
        ? query(tasksCollection, where("userId", "==", user.uid))
        : tasksCollection; // allow guests to access unscoped tasks

      const snapshot = await getDocs(q);
      const loadedTasks: Task[] = snapshot.docs.map(doc => parseTask(doc.data(), doc.id));
      setTasks(loadedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  }, [user]);

  const addTask = async (task: Task) => {
    // Optimistically add to local state
    setTasks((prev) => [...prev, task]);

    try {
      await addDoc(collection(db, 'tasks'), {
        ...task,
        userId: user?.uid || '',
        createdAt: task.createdAt.toISOString(),
        dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        completedAt: task.completedAt ? task.completedAt.toISOString() : null,
      });
      console.log('Task added to Firestore');
      // Real-time listener will automatically update the tasks
    } catch (err) {
      console.error('Failed to add task to Firestore:', err);
      // Revert optimistic update on error
      setTasks((prev) => prev.filter(t => t.id !== task.id));
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
      // Real-time listener will automatically update the tasks
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  // Toggle completion for user's own tasks (only allowed if no buddy)
  const toggleCompleteTask = async (id: string) => {
    if (hasBuddy) {
      // alert('You have a buddy! Only your buddy can mark your tasks as complete.');
      return;
    }

    const taskToUpdate = tasks.find(task => task.id === id);
    if (!taskToUpdate) {
      console.warn('Task not found');
      return;
    }

    const isNowCompleted = !taskToUpdate.completed;
    const timeNow = new Date();

    try {
      await updateDoc(doc(db, 'tasks', id), {
        completed: isNowCompleted,
        completedAt: isNowCompleted ? timeNow.toISOString() : null,
      });

      // Real-time listener will automatically update the tasks
      console.log('Task updated in Firestore');
    } catch (err) {
      console.error('Failed to update task in Firestore:', err);
    }
  };

  // Toggle completion for buddy's tasks (only allowed if you have a buddy)
  const toggleBuddyTask = async (taskId: string, buddyId: string) => {
    if (!hasBuddy) {
      // alert('You need a buddy to mark buddy tasks!');
      return;
    }

    // Verify the task belongs to the buddy
    try {
      const buddyTasks = await BuddyService.getBuddyTasks(buddyId);
      const taskToUpdate = buddyTasks.find(task => task.id === taskId);

      if (!taskToUpdate) {
        console.warn('Buddy task not found');
        return;
      }

      const isNowCompleted = !taskToUpdate.completed;
      const timeNow = new Date();

      await updateDoc(doc(db, 'tasks', taskId), {
        completed: isNowCompleted,
        completedAt: isNowCompleted ? timeNow.toISOString() : null,
      });

      console.log('Buddy task updated in Firestore');
      // Buddy's real-time listener will automatically update their view
    } catch (err) {
      console.error('Failed to update buddy task in Firestore:', err);
      // alert('Failed to update buddy task. Please try again.');
    }
  };

  const editTask = async (updatedTask: Task) => {
    const { id, name, effort, dueDate, completed, completedAt } = updatedTask;

    try {
      await updateDoc(doc(db, 'tasks', id), {
        name,
        effort,
        dueDate: dueDate ? dueDate.toISOString() : null,
        completed,
        completedAt: completedAt ? completedAt.toISOString() : null,
      });
      // Real-time listener will automatically update the tasks
      console.log('Task edited successfully in Firestore');
    } catch (err) {
      console.error('Failed to edit task in Firestore:', err);
    }
  };

  // Calculate daily progress
  const dailyProgress = useMemo(() => {
    const today = new Date();
    const todayStr = today.toDateString();

    // Count tasks completed today
    const completedToday = tasks.filter(task => {
      if (!task.completed) return false;

      // If task has completedAt, use that, otherwise use createdAt as fallback
      const completionDate = task.completedAt || task.createdAt;
      return completionDate.toDateString() === todayStr;
    }).length;

    // Set daily goal to 3 tasks
    const dailyGoal = 3;
    const percentage = Math.round((completedToday / dailyGoal) * 100);

    return {
      completed: completedToday,
      total: dailyGoal,
      percentage: Math.min(percentage, 100) // Cap at 100%
    };
  }, [tasks]);

  return (
    <TaskContext.Provider value={{
      tasks,
      addTask,
      toggleCompleteTask,
      toggleBuddyTask,
      editTask,
      dailyProgress,
      deleteTask,
      getTasksList,
      hasBuddy,
      canToggleOwnTasks
    }}>
      {children}
    </TaskContext.Provider>
  );
}; 