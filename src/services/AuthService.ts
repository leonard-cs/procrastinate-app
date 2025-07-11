import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  GoogleAuthProvider
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "../firebaseConfig";
import { User } from "../client/types/User";

export class AuthService {
  static async signInWithGoogle(): Promise<User | null> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      
      // Create or get user document from Firestore
      const userData = await this.createOrGetUser(firebaseUser);
      return userData;
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  }

  static async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  }

  static async createOrGetUser(firebaseUser: FirebaseUser): Promise<User> {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return userDoc.data() as User;
    } else {
      // Create new user document
      const newUser: User = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || 'User',
        email: firebaseUser.email || '',
        studyStats: {
          totalSecondsStudied: 0,
          totalHoursStudied: 0,
          studySessionsCompleted: 0,
          dailyStudySeconds: 0,
          isCurrentlyStudying: false
        },
        createdAt: new Date()
      };

      await setDoc(userRef, newUser);
      return newUser;
    }
  }

  static onAuthStateChange(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  static getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }
} 