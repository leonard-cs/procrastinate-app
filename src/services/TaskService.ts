// src/services/TaskService.ts
import { EffortLevel, Task } from "../client/types/Task";
import { db, auth } from "../firebaseConfig";
import { collection, getDocs, addDoc, query, where, doc, getDoc, updateDoc, onSnapshot, Unsubscribe } from "firebase/firestore";

const parseTask = (data: any, id: string): Task => {
  return {
    id,
    name: data.name,
    completed: data.completed,
    createdAt: new Date(data.createdAt),
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
    effort: data.effort as EffortLevel, // ensure it's a valid EffortLevel
    userId: data.userId || '',
    isPoked: data.isPoked || false, // Default to false if undefined
  };
};

// Real-time listener for user's tasks
export const subscribeToUserTasks = (
  userId: string, 
  callback: (tasks: Task[]) => void
): Unsubscribe => {
  console.log('Setting up real-time listener for user tasks:', userId);
  const q = query(collection(db, "tasks"), where("userId", "==", userId));
  
  return onSnapshot(q, (querySnapshot) => {
    console.log('Task update received for user:', userId, 'Number of tasks:', querySnapshot.size);
    const tasks: Task[] = [];
    querySnapshot.forEach((docSnap) => {
      const rawData = docSnap.data();
      const parsedTask = parseTask(rawData, docSnap.id);
      console.log('Task received:', parsedTask.id, parsedTask.name, 'completed:', parsedTask.completed, 'isPoked:', parsedTask.isPoked);
      tasks.push(parsedTask);
    });
    console.log('Total tasks being sent to callback:', tasks.length);
    callback(tasks);
  }, (error) => {
    console.error("Error listening to tasks:", error);
  });
};

// Real-time listener for buddy's tasks
export const subscribeToBuddyTasks = (
  buddyId: string,
  callback: (tasks: Task[]) => void
): Unsubscribe => {
  console.log('Setting up real-time listener for buddy tasks:', buddyId);
  const q = query(collection(db, "tasks"), where("userId", "==", buddyId));
  
  return onSnapshot(q, (querySnapshot) => {
    console.log('Buddy task update received for buddy:', buddyId, 'Number of tasks:', querySnapshot.size);
    const tasks: Task[] = [];
    querySnapshot.forEach((docSnap) => {
      const rawData = docSnap.data();
      const parsedTask = parseTask(rawData, docSnap.id);
      console.log('Buddy task received:', parsedTask.id, parsedTask.name, 'completed:', parsedTask.completed, 'isPoked:', parsedTask.isPoked);
      tasks.push(parsedTask);
    });
    console.log('Total buddy tasks being sent to callback:', tasks.length);
    callback(tasks);
  }, (error) => {
    console.error("Error listening to buddy tasks:", error);
  });
};

// Original fetch function (kept for backward compatibility)
export const fetchTasks = async (userId: string): Promise<Task[]> => {
  try {
    const q = query(collection(db, "tasks"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    const tasks: Task[] = [];
    querySnapshot.forEach((docSnap) => {
      const rawData = docSnap.data();
      const parsedTask = parseTask(rawData, docSnap.id);
      tasks.push(parsedTask);
    });

    return tasks;
  } catch (error) {
    console.error("Error fetching tasks:", error);
    throw error;
  }
};

export const addTask = async (task: Omit<Task, "id" | "userId">): Promise<void> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to add tasks');
  }

  const taskWithUserId = {
    ...task,
    userId: user.uid
  };

  await addDoc(collection(db, 'tasks'), taskWithUserId);
};

export const isPokedByBuddy = async (taskId: string): Promise<boolean> => {
  try {
    const taskDocRef = doc(db, "tasks", taskId);
    const taskDocSnap = await getDoc(taskDocRef);

    if (taskDocSnap.exists()) {
      const taskData = taskDocSnap.data();
      return taskData.isPoked === true;
    } else {
      console.error("Task not found");
      return false;
    }
  } catch (error) {
    console.error("Error checking if task is poked:", error);
    return false;
  }
}

export const setTaskPoke = async (taskId: string, isPoked: boolean) => {
  try {
    console.log('TaskService: Updating task poke status for task:', taskId, 'isPoked:', isPoked);
    await updateDoc(doc(db, "tasks", taskId), {
      isPoked: isPoked,
    });
    console.log('TaskService: Task poke status updated successfully');
  } catch (error) {
    console.error("Error updating task poke status:", error);
    throw error;
  }
}
