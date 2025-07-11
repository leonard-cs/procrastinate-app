import { db, auth } from "../firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  updateDoc,
  deleteDoc,
  addDoc,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { User } from "../client/types/User";
import { BuddyPair, GeneralPoke } from "../client/types/Buddy";
import { parseTask } from "../client/utils/parseTask";
import { fetchTasks } from "./TaskService";
import { Task } from "../client/types/Task";
import { ensureUserAuthenticated } from "../client/utils/authUtils";

const collectionName: string = 'buddyPairs'

export class BuddyService {

  // Get all users except the current user (potential buddies)
  static async getAvailableUsers(): Promise<User[]> {
    const currentUser = ensureUserAuthenticated();

    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);

    const users: User[] = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data() as User;
      // Exclude current user from available buddies
      if (userData.id !== currentUser.uid) {
        users.push(userData);
      }
    });

    // Filter out users who are already paired with someone else
    const availableUsers: User[] = [];
    for (const user of users) {
      const isAlreadyPaired = await this.isUserAlreadyPaired(user.id);
      if (!isAlreadyPaired) {
        availableUsers.push(user);
      }
    }

    return availableUsers.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Check if a user is already paired with someone (mutually accepted)
  static async isUserAlreadyPaired(userId: string): Promise<boolean> {
    const buddyPairsRef = collection(db, collectionName);

    // Check if user is in any accepted pair as userId
    const q1 = query(buddyPairsRef, where('userId', '==', userId), where('invitingAccepted', '==', true));
    const snapshot1 = await getDocs(q1);

    // Check if user is in any accepted pair as buddyId
    const q2 = query(buddyPairsRef, where('buddyId', '==', userId), where('invitingAccepted', '==', true));
    const snapshot2 = await getDocs(q2);

    return !snapshot1.empty || !snapshot2.empty;
  }

  // Composing a pairId from two user UIDs in ascending order
  static generateBuddyPairId = (uid1: string, uid2: string): string => {
    const [first, second] = [uid1, uid2].sort();
    return `${first}_${second}`;
  };

  // Create a buddy pair relationship (send invitation)
  static async createBuddyPair(buddyId: string): Promise<void> {
    const currentUser = ensureUserAuthenticated();

    const userId = currentUser.uid;

    // Check if target user is already paired with someone else
    const isTargetPaired = await this.isUserAlreadyPaired(buddyId);
    if (isTargetPaired) {
      throw new Error('This user is already paired with someone else');
    }

    // Check if current user is already paired with someone else
    const isCurrentUserPaired = await this.isUserAlreadyPaired(userId);
    if (isCurrentUserPaired) {
      throw new Error('You are already paired with someone else');
    }

    const pairId = BuddyService.generateBuddyPairId(userId, buddyId);
    const pairRef = doc(db, collectionName, pairId);
    const pairSnap = await getDoc(pairRef);

    if (!pairSnap.exists()) {
      // First invitation — create with invitingAccepted = false
      const buddyPair: BuddyPair = {
        userId,
        buddyId,
        pairedAt: new Date(),
        invitingAccepted: false,
      };
      await setDoc(pairRef, buddyPair);
    } else {
      const existingPair = pairSnap.data() as BuddyPair;

      // If the other user already invited current user, accept the pairing
      if (
        !existingPair.invitingAccepted &&
        existingPair.userId !== userId
      ) {
        await updateDoc(pairRef, { invitingAccepted: true });
      }
    }
  }

  // Accept a buddy invitation
  static async acceptBuddyInvitation(inviterId: string): Promise<void> {
    const currentUser = ensureUserAuthenticated();

    const userId = currentUser.uid;
    const pairId = this.generateBuddyPairId(userId, inviterId);
    const pairRef = doc(db, collectionName, pairId);

    await updateDoc(pairRef, { invitingAccepted: true });
  }

  // Reject a buddy invitation
  static async rejectBuddyInvitation(inviterId: string): Promise<void> {
    const currentUser = ensureUserAuthenticated();

    const userId = currentUser.uid;
    const pairId = this.generateBuddyPairId(userId, inviterId);
    const pairRef = doc(db, collectionName, pairId);

    await deleteDoc(pairRef);
  }

  // Get current user's buddy (only if mutually accepted)
  static async getCurrentBuddy(): Promise<User | null> {
    const currentUser = ensureUserAuthenticated();

    const buddyPairsRef = collection(db, collectionName);

    // Look for accepted pairs where current user is userId
    const q1 = query(
      buddyPairsRef,
      where('userId', '==', currentUser.uid),
      where('invitingAccepted', '==', true)
    );
    const snapshot1 = await getDocs(q1);

    // Look for accepted pairs where current user is buddyId
    const q2 = query(
      buddyPairsRef,
      where('buddyId', '==', currentUser.uid),
      where('invitingAccepted', '==', true)
    );
    const snapshot2 = await getDocs(q2);

    let buddyId: string | null = null;

    if (!snapshot1.empty) {
      const buddyPair = snapshot1.docs[0].data() as BuddyPair;
      buddyId = buddyPair.buddyId;
    } else if (!snapshot2.empty) {
      const buddyPair = snapshot2.docs[0].data() as BuddyPair;
      buddyId = buddyPair.userId;
    }

    if (!buddyId) {
      return null;
    }

    // Fetch the buddy's user data
    const buddyUserRef = doc(db, 'users', buddyId);
    const buddyUserDoc = await getDoc(buddyUserRef);

    if (!buddyUserDoc.exists()) {
      return null;
    }

    return buddyUserDoc.data() as User;
  }

  // Remove buddy relationship
  static async removeBuddy(buddyId: string): Promise<void> {
    const currentUser = ensureUserAuthenticated();

    await this.resetIsPoke(currentUser.uid, buddyId);

    const pairId = this.generateBuddyPairId(currentUser.uid, buddyId);
    const pairRef = doc(db, collectionName, pairId);

    await deleteDoc(pairRef);
  }

  private static async resetIsPoke(currentUserId: string, buddyId: string) {
    try {
      const currentUserTasks = await fetchTasks(currentUserId);
      const buddyTasks = await fetchTasks(buddyId);

      const pokedTasks = [...currentUserTasks, ...buddyTasks].filter(task => task.isPoked);

      for (const task of pokedTasks) {
        const taskRef = doc(db, "tasks", task.id);
        await updateDoc(taskRef, { isPoked: false });
      }
    } catch (error) {
      console.error("Error resetting isPoke for tasks:", error);
    }
  }

  // Get buddy's tasks for progress comparison
  static async getBuddyTasks(buddyId: string) {
    try {
      const tasksRef = collection(db, 'tasks');
      const q = query(tasksRef, where('userId', '==', buddyId));
      const querySnapshot = await getDocs(q);

      const tasks: any[] = [];
      querySnapshot.forEach((doc) => {
        const rawData = doc.data();
        // Use parseTask utility to ensure proper data transformation
        const parsedTask = parseTask(rawData, doc.id);
        tasks.push(parsedTask);
      });

      return tasks;
    } catch (error) {
      console.error('Error fetching buddy tasks:', error);
      throw error;
    }
  }

  // Get user who invited the current user (pending invitations)
  static async getInvitedBy(currentUserId: string): Promise<User | null> {
    try {
      const buddyPairRef = collection(db, collectionName);
      const q = query(
        buddyPairRef,
        where('buddyId', '==', currentUserId),
        where('invitingAccepted', '==', false)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) return null;

      const pairDoc = snapshot.docs[0].data() as BuddyPair;
      const userDocRef = doc(db, 'users', pairDoc.userId);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) return null;

      return userSnap.data() as User;
    } catch (error) {
      console.error('Error fetching invitedBy user:', error);
      return null;
    }
  }

  // Get pending buddy request sent by current user
  static async getPendingRequest(): Promise<User | null> {
    const currentUser = ensureUserAuthenticated();

    try {
      const buddyPairRef = collection(db, collectionName);
      const q = query(
        buddyPairRef,
        where('userId', '==', currentUser.uid),
        where('invitingAccepted', '==', false)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) return null;

      const pairDoc = snapshot.docs[0].data() as BuddyPair;
      const userDocRef = doc(db, 'users', pairDoc.buddyId);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) return null;

      return userSnap.data() as User;
    } catch (error) {
      console.error('Error fetching pending request:', error);
      return null;
    }
  }

  // Send a general poke to buddy
  static async sendGeneralPoke(buddyId: string, message: string): Promise<void> {
    const currentUser = ensureUserAuthenticated();

    try {
      const generalPoke = {
        fromUserId: currentUser.uid,
        toUserId: buddyId,
        message,
        timestamp: serverTimestamp(),
        read: false,
      };

      const docRef = await addDoc(collection(db, 'generalPokes'), generalPoke);
      console.log('BuddyService: Poke sent successfully with ID:', docRef.id);
    } catch (error) {
      console.error('Error sending general poke:', error);
      throw error;
    }
  }

  // Get unread general pokes for current user
  static async getUnreadGeneralPokes(): Promise<GeneralPoke[]> {
    const currentUser = ensureUserAuthenticated();

    try {
      const pokesRef = collection(db, 'generalPokes');
      const q = query(
        pokesRef,
        where('toUserId', '==', currentUser.uid),
        where('read', '==', false),
        orderBy('timestamp', 'desc')
      );
      const snapshot = await getDocs(q);

      const pokes: GeneralPoke[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        pokes.push({
          id: doc.id,
          fromUserId: data.fromUserId,
          toUserId: data.toUserId,
          message: data.message,
          timestamp: data.timestamp.toDate(),
          read: data.read,
        });
      });

      return pokes;
    } catch (error) {
      console.error('Error fetching unread general pokes:', error);
      return [];
    }
  }

  // Mark general poke as read
  static async markGeneralPokeAsRead(pokeId: string): Promise<void> {
    try {
      const pokeRef = doc(db, 'generalPokes', pokeId);
      await updateDoc(pokeRef, { read: true });
    } catch (error) {
      console.error('Error marking general poke as read:', error);
      throw error;
    }
  }

  // Get the latest general poke for display
  static async getLatestGeneralPoke(): Promise<GeneralPoke | null> {
    const currentUser = ensureUserAuthenticated();

    try {
      console.log('Fetching latest poke for user:', currentUser.uid);
      const pokesRef = collection(db, 'generalPokes');
      
      // First try without orderBy to see if there are any pokes at all
      const simpleQuery = query(
        pokesRef,
        where('toUserId', '==', currentUser.uid),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(simpleQuery);
      console.log('Found pokes:', snapshot.size);

      if (snapshot.empty) {
        console.log('No unread pokes found');
        return null;
      }

      // Convert all pokes and sort them manually for now
      const pokes: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        pokes.push({
          id: doc.id,
          fromUserId: data.fromUserId,
          toUserId: data.toUserId,
          message: data.message,
          timestamp: data.timestamp.toDate(),
          read: data.read,
        });
      });

      // Sort by timestamp descending and get the latest
      pokes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      const latestPoke = pokes[0];
      
      console.log('Latest poke:', latestPoke);
      return latestPoke;
    } catch (error) {
      console.error('Error fetching latest general poke:', error);
      return null;
    }
  }

  // Real-time listener for current buddy
  static subscribeToCurrentBuddy(
    userId: string,
    callback: (buddy: User | null) => void
  ): Unsubscribe {
    console.log('Setting up real-time listener for buddy pairs for user:', userId);
    const buddyPairsRef = collection(db, collectionName);
    
    // Use a single listener to get all accepted pairs involving this user
    // We'll filter in the callback to find the one where this user is involved
    const q = query(
      buddyPairsRef,
      where('invitingAccepted', '==', true)
    );

    return onSnapshot(q, async (snapshot) => {
      console.log('Buddy pairs update received. Total accepted pairs:', snapshot.size);
      try {
        let buddyId: string | null = null;
        
        // Find any pair where current user is either userId or buddyId
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as BuddyPair;
          console.log('Checking pair:', data.userId, '<->', data.buddyId, 'for user:', userId);
          if (data.userId === userId) {
            buddyId = data.buddyId;
            console.log('Found buddy as buddyId:', buddyId);
          } else if (data.buddyId === userId) {
            buddyId = data.userId;
            console.log('Found buddy as userId:', buddyId);
          }
        });

        if (!buddyId) {
          console.log('No buddy found for user:', userId);
          callback(null);
          return;
        }

        console.log('Fetching buddy user data for:', buddyId);
        // Fetch the buddy's user data
        const buddyUserRef = doc(db, 'users', buddyId);
        const buddyUserDoc = await getDoc(buddyUserRef);
        
        if (buddyUserDoc.exists()) {
          const buddyData = buddyUserDoc.data() as User;
          console.log('Buddy found:', buddyData.name);
          callback(buddyData);
        } else {
          console.log('Buddy user data not found for:', buddyId);
          callback(null);
        }
      } catch (error) {
        console.error('Error fetching buddy user data:', error);
        callback(null);
      }
    }, (error) => {
      console.error('Error listening to buddy pairs:', error);
      callback(null);
    });
  }

  // Real-time listener for buddy invitations received
  static subscribeToInvitedBy(
    userId: string,
    callback: (inviter: User | null) => void
  ): Unsubscribe {
    const buddyPairRef = collection(db, collectionName);
    const q = query(
      buddyPairRef,
      where('buddyId', '==', userId),
      where('invitingAccepted', '==', false)
    );

    return onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        callback(null);
        return;
      }

      try {
        const pairDoc = snapshot.docs[0].data() as BuddyPair;
        const userDocRef = doc(db, 'users', pairDoc.userId);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          callback(userSnap.data() as User);
        } else {
          callback(null);
        }
      } catch (error) {
        console.error('Error fetching inviter user data:', error);
        callback(null);
      }
    });
  }

  // Real-time listener for pending requests sent by current user
  static subscribeToPendingRequest(
    userId: string,
    callback: (pendingUser: User | null) => void
  ): Unsubscribe {
    const buddyPairRef = collection(db, collectionName);
    const q = query(
      buddyPairRef,
      where('userId', '==', userId),
      where('invitingAccepted', '==', false)
    );

    return onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        callback(null);
        return;
      }

      try {
        const pairDoc = snapshot.docs[0].data() as BuddyPair;
        const userDocRef = doc(db, 'users', pairDoc.buddyId);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          callback(userSnap.data() as User);
        } else {
          callback(null);
        }
      } catch (error) {
        console.error('Error fetching pending request user data:', error);
        callback(null);
      }
    });
  }

  // Real-time listener for unread general pokes
  static subscribeToUnreadGeneralPokes(
    userId: string,
    callback: (pokes: GeneralPoke[]) => void
  ): Unsubscribe {
    console.log('BuddyService: Setting up real-time listener for pokes for user:', userId);
    const pokesRef = collection(db, 'generalPokes');
    // Remove orderBy to avoid composite index requirement - we'll sort client-side
    const q = query(
      pokesRef,
      where('toUserId', '==', userId),
      where('read', '==', false)
    );

    return onSnapshot(q, (snapshot) => {
      const pokes: GeneralPoke[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Handle both Timestamp and Date objects
        let timestamp: Date;
        if (data.timestamp && typeof data.timestamp.toDate === 'function') {
          timestamp = data.timestamp.toDate();
        } else if (data.timestamp instanceof Date) {
          timestamp = data.timestamp;
        } else {
          console.warn('Invalid timestamp format for poke:', doc.id);
          timestamp = new Date(); // Fallback to current time
        }
        
        const poke = {
          id: doc.id,
          fromUserId: data.fromUserId,
          toUserId: data.toUserId,
          message: data.message,
          timestamp: timestamp,
          read: data.read,
        };
        pokes.push(poke);
      });
      
      // Sort by timestamp descending (most recent first) on the client
      pokes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      callback(pokes);
    }, (error) => {
      console.error('Error listening to general pokes:', error);
      callback([]);
    });
  }
} 