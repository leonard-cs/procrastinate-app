import { db } from "../firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { User } from "../client/types/User";

export const createUser = async (userData: Omit<User, 'id' | 'createdAt' | 'studyStats'>): Promise<string> => {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newUser: User = {
        id: userId,
        ...userData,
        studyStats: {
            totalSecondsStudied: 0,
            totalHoursStudied: 0,
            studySessionsCompleted: 0,
            dailyStudySeconds: 0,
            isCurrentlyStudying: false
        },
        createdAt: new Date()
    };

    await setDoc(doc(db, 'users', userId), newUser);
    return userId;
};

export const getUser = async (userId: string): Promise<User | null> => {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
        return userDoc.data() as User;
    }
    
    return null;
};

export const initializeDemoUser = async (): Promise<string> => {
    const demoUserId = 'demo-user-001';
    
    // Check if demo user already exists
    const existingUser = await getUser(demoUserId);
    if (existingUser) {
        return demoUserId;
    }

    // Create demo user
    const demoUser: User = {
        id: demoUserId,
        name: 'Demo User',
        email: 'demo@example.com',
        avatar: '👤',
        studyStats: {
            totalSecondsStudied: 0,
            totalHoursStudied: 0,
            studySessionsCompleted: 0,
            dailyStudySeconds: 0,
            isCurrentlyStudying: false
        },
        createdAt: new Date()
    };

    await setDoc(doc(db, 'users', demoUserId), demoUser);
    return demoUserId;
}; 