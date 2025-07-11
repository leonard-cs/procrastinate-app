import { db } from "../firebaseConfig";
import { collection, doc, addDoc, getDocs, updateDoc, query, where, orderBy, limit, getDoc, Timestamp, deleteDoc, deleteField, increment } from "firebase/firestore";
import { User, StudySession, BuddyStudySession, BuddySessionStatus } from "../client/types/User";
import { auth } from "../firebaseConfig";
import { onSnapshot } from "firebase/firestore";

export const createStudySession = async (
    userId: string, 
    taskName: string, 
    buddyId?: string
): Promise<string> => {
    try {
        console.log('Creating study session for userId:', userId, 'taskName:', taskName);
        
        // Check if user is authenticated
        if (!auth.currentUser) {
            throw new Error('User must be authenticated to create a study session');
        }
        
        // Ensure the userId matches the authenticated user
        if (auth.currentUser.uid !== userId) {
            throw new Error('Cannot create study session for another user');
        }
        
        // Create study session object, excluding undefined fields
        const studySession: Omit<StudySession, 'id'> = {
            userId,
            taskName,
            startTime: new Date(),
            isActive: true,
            isSharedSession: !!buddyId
        };

        // Only add buddyId if it's provided (not undefined)
        if (buddyId) {
            studySession.buddyId = buddyId;
        }

        console.log('Study session data:', studySession);
        const docRef = await addDoc(collection(db, 'studySessions'), studySession);
        console.log('Study session created successfully with ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error in createStudySession:', error);
        throw error;
    }
};

export const endStudySession = async (sessionId: string): Promise<void> => {
    const sessionRef = doc(db, 'studySessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    
    if (!sessionDoc.exists()) {
        throw new Error("Study session not found");
    }

    const sessionData = sessionDoc.data();
    const startTime = sessionData.startTime instanceof Timestamp ? sessionData.startTime.toDate() : new Date(sessionData.startTime);
    const endTime = new Date();
    const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    // Update the study session
    await updateDoc(sessionRef, {
        endTime,
        durationSeconds,
        isActive: false
    });

    // Update user's study statistics
    await updateUserStudyStats(sessionData.userId, durationSeconds);
    
    // If it's a shared session, also update buddy's stats
    if (sessionData.buddyId) {
        await updateUserStudyStats(sessionData.buddyId, durationSeconds);
    }
};

export const updateUserStudyStats = async (userId: string, secondsStudied: number): Promise<void> => {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) return;

    const userData = userDoc.data() as User;
    const currentStats = userData.studyStats || {};

    const totalSeconds = Number(currentStats.totalSecondsStudied) || 0;
    const dailySeconds = Number(currentStats.dailyStudySeconds) || 0;

    const today = new Date();
    let lastReset: Date | null = null;

    if (currentStats.lastDailyReset instanceof Timestamp) {
        lastReset = currentStats.lastDailyReset.toDate();
    } else if (currentStats.lastDailyReset instanceof Date) {
        lastReset = currentStats.lastDailyReset;
    } else if (typeof currentStats.lastDailyReset === 'string') {
        const parsed = new Date(currentStats.lastDailyReset);
        if (!isNaN(parsed.getTime())) lastReset = parsed;
    }

    const isNewDay = !lastReset || today.toDateString() !== lastReset.toDateString();

    const updatedStats = {
        totalSecondsStudied: totalSeconds + secondsStudied,
        totalHoursStudied: Math.floor((totalSeconds + secondsStudied) / 3600),
        studySessionsCompleted: (currentStats.studySessionsCompleted || 0) + 1,
        dailyStudySeconds: isNewDay ? secondsStudied : dailySeconds + secondsStudied,
        lastStudyDate: today,
        lastDailyReset: today,
    };

    await updateDoc(userRef, {
        'studyStats': updatedStats,
    });
};

export const getActiveStudySession = async (userId: string): Promise<StudySession | null> => {
    const q = query(
        collection(db, 'studySessions'),
        where('userId', '==', userId),
        where('isActive', '==', true),
        orderBy('startTime', 'desc'),
        limit(1)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
        return null;
    }

    const docData = querySnapshot.docs[0];
    const data = docData.data();
    
    return {
        id: docData.id,
        ...data,
        startTime: data.startTime instanceof Timestamp ? data.startTime.toDate() : new Date(data.startTime),
        endTime: data.endTime ? (data.endTime instanceof Timestamp ? data.endTime.toDate() : new Date(data.endTime)) : undefined
    } as StudySession;
};

export const getUserStudyStats = async (userId: string): Promise<User['studyStats'] | null> => {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        return userData.studyStats || {
            totalSecondsStudied: 0,
            totalHoursStudied: 0,
            studySessionsCompleted: 0
        };
    }
    
    return null;
};

export const getUserStudySessions = async (userId: string, limitCount: number = 10): Promise<StudySession[]> => {
    const q = query(
        collection(db, 'studySessions'),
        where('userId', '==', userId),
        orderBy('startTime', 'desc'),
        limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            startTime: data.startTime instanceof Timestamp ? data.startTime.toDate() : new Date(data.startTime),
            endTime: data.endTime ? (data.endTime instanceof Timestamp ? data.endTime.toDate() : new Date(data.endTime)) : undefined
        };
    }) as StudySession[];
};

// Daily study tracking functions
export const startDailyStudySession = async (userId: string, taskName: string): Promise<string> => {
    try {
        console.log('Starting daily study session for user:', userId, 'task:', taskName);
        
        // Check if user is authenticated
        if (!auth.currentUser) {
            throw new Error('User must be authenticated to start a study session');
        }
        
        if (auth.currentUser.uid !== userId) {
            throw new Error('Cannot start study session for another user');
        }
        
        // Create study session record
        const sessionId = await createStudySession(userId, taskName);
        
        // Update user's current study status
        await updateUserStudyStatus(userId, true, taskName, sessionId);
        
        return sessionId;
    } catch (error) {
        console.error('Error in startDailyStudySession:', error);
        throw error;
    }
};

export const endDailyStudySession = async (userId: string, sessionId: string): Promise<void> => {
    try {
        console.log('Ending daily study session for user:', userId, 'session:', sessionId);
        
        // Get the session to calculate duration
        const sessionRef = doc(db, 'studySessions', sessionId);
        const sessionDoc = await getDoc(sessionRef);
        
        if (!sessionDoc.exists()) {
            throw new Error('Study session not found');
        }

        const sessionData = sessionDoc.data();
        const startTime = sessionData.startTime instanceof Timestamp ? sessionData.startTime.toDate() : new Date(sessionData.startTime);
        const endTime = new Date();
        const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);


        // End the study session
        await endStudySession(sessionId);
        
        // Update user's daily study time and status
        await updateUserStudyStatus(userId, false, undefined, undefined);
        
    } catch (error) {
        console.error('Error in endDailyStudySession:', error);
        throw error;
    }
};

export const updateUserStudyStatus = async (
    userId: string, 
    isStudying: boolean, 
    taskName?: string,
    sessionId?: string
): Promise<void> => {
    const userRef = doc(db, 'users', userId);
    const updateData: any = {
        'studyStats.isCurrentlyStudying': isStudying,
    };

    if (isStudying && taskName) {
        updateData['studyStats.currentStudyStartTime'] = new Date();
        updateData['studyStats.currentStudyTaskName'] = taskName;
        updateData['studyStats.currentSessionId'] = sessionId || ''
    } else {
        updateData['studyStats.currentStudyTaskName'] = deleteField();
        updateData['studyStats.currentStudyStartTime'] = deleteField();
        updateData['studyStats.currentSessionId'] = deleteField();
    }

    await updateDoc(userRef, updateData);
};

export const updateUserDailyStudyTime = async (userId: string, secondsStudied: number): Promise<void> => {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) return;

    const userData = userDoc.data() as User;
    const currentStats = userData.studyStats || {
        totalSecondsStudied: 0,
        totalHoursStudied: 0,
        studySessionsCompleted: 0,
        dailyStudySeconds: 0,
        isCurrentlyStudying: false,
        lastDailyReset: new Date(0)
    };

    // Check if we need to reset daily counter (new day)

    const today = new Date();
    const lastResetRaw = userData.studyStats?.lastDailyReset;
    const lastReset = lastResetRaw instanceof Timestamp
        ? lastResetRaw.toDate()
        : typeof lastResetRaw === 'string'
            ? new Date(lastResetRaw)
            : lastResetRaw instanceof Date
                ? lastResetRaw
                : null;

    const isNewDay = !lastReset || today.toDateString() !== lastReset.toDateString();
    
    const updates: any = {
        'studyStats.totalSecondsStudied': increment(secondsStudied),
        'studyStats.studySessionsCompleted': increment(1),
        'studyStats.lastStudyDate': today,
        'studyStats.lastDailyReset': today
    };

    const totalSecondsAfter = currentStats.totalSecondsStudied + secondsStudied;
    updates['studyStats.totalHoursStudied'] = Math.floor(totalSecondsAfter / 3600);

    if (isNewDay) {
        updates['studyStats.dailyStudySeconds'] = secondsStudied;
        updates['studyStats.lastDailyReset'] = today;
    } else {
        updates['studyStats.dailyStudySeconds'] = increment(secondsStudied);
    }

    await updateDoc(userRef, updates);
};

export const getUserDailyStudyData = async (userId: string): Promise<{
    dailySeconds: number;
    isCurrentlyStudying: boolean;
    currentTaskName?: string;
    currentStudyStartTime?: Date;
    currentSessionId?: string;
} | null> => {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
        return null;
    }

    const userData = userDoc.data() as User;
    const studyStats = userData.studyStats;
    
    if (!studyStats) {
        return {
            dailySeconds: 0,
            isCurrentlyStudying: false
        };
    }

    // Check if we need to reset daily counter (new day)
    const today = new Date();
    const lastReset = studyStats.lastDailyReset ? 
        (studyStats.lastDailyReset instanceof Timestamp ? 
            studyStats.lastDailyReset.toDate() : 
            new Date(studyStats.lastDailyReset)) : 
        new Date(0);
    
    const isNewDay = today.toDateString() !== lastReset.toDateString();
    
    // If it's a new day, reset the daily counter
    if (isNewDay && studyStats.dailyStudySeconds > 0) {
        await updateDoc(userRef, {
            'studyStats.dailyStudySeconds': 0,
            'studyStats.lastDailyReset': today
        });
        
        return {
            dailySeconds: 0,
            isCurrentlyStudying: studyStats.isCurrentlyStudying || false,
            currentTaskName: studyStats.currentStudyTaskName,
            currentStudyStartTime: studyStats.currentStudyStartTime instanceof Timestamp 
                ? studyStats.currentStudyStartTime.toDate() 
                : studyStats.currentStudyStartTime 
                    ? new Date(studyStats.currentStudyStartTime) 
                    : undefined,
            currentSessionId: studyStats.currentSessionId || undefined
        };
    }
    
    return {
        dailySeconds: studyStats.dailyStudySeconds || 0,
        isCurrentlyStudying: studyStats.isCurrentlyStudying || false,
        currentTaskName: studyStats.currentStudyTaskName,
        currentStudyStartTime: studyStats.currentStudyStartTime instanceof Timestamp 
            ? studyStats.currentStudyStartTime.toDate() 
            : studyStats.currentStudyStartTime 
                ? new Date(studyStats.currentStudyStartTime) 
                : undefined,
        currentSessionId: studyStats.currentSessionId || undefined
    };
}; 

export const createBuddyStudySession = async (
    senderId: string,
    receiverId: string,
    taskName: string,
    durationSeconds: number
): Promise<string> => {
    const session = {
        user1Id: senderId,
        user2Id: receiverId,
        taskName,
        durationSeconds,
        status: 'pending',
        isActive: false,
        createdAt: new Date(),
    };

    const docRef = await addDoc(collection(db, 'buddyStudySessions'), session);
    return docRef.id;
};

export const acceptBuddyStudySession = async (sessionId: string): Promise<void> => {
    const ref = doc(db, 'buddyStudySessions', sessionId);
    await updateDoc(ref, {
        status: 'accepted',
        isActive: true,
        startTime: new Date()
    });
};

export const endBuddyStudySession = async (sessionId: string, status: BuddySessionStatus): Promise<void> => {
    const ref = doc(db, 'buddyStudySessions', sessionId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const data = snap.data();
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) return;

    const startTime = data.startTime instanceof Timestamp ? data.startTime.toDate() : new Date(data.startTime);
    const now = new Date();
    const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    const duration = Math.min(elapsedSeconds, data.durationSeconds);

    await updateUserStudyStats(currentUserId, duration);

    await updateDoc(ref, {
        isActive: false,
        status: status,
        endTime: new Date()
    });
};

export const getIncomingBuddyStudyRequests = async (userId: string): Promise<BuddyStudySession[]> => {
    const q = query(
        collection(db, "buddyStudySessions"),
        where("user2Id", "==", userId),
        where("status", "==", "pending"),
        where("isActive", "==", false)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        ...(doc.data() as BuddyStudySession),
        id: doc.id,
        startTime: doc.data().startTime?.toDate?.() || undefined,
        endTime: doc.data().endTime?.toDate?.() || undefined,
    }));
};

export const getBuddySessionById = async (sessionId: string): Promise<BuddyStudySession | null> => {
    const ref = doc(db, 'buddyStudySessions', sessionId);
    const snap = await getDoc(ref);
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as BuddyStudySession) : null;
};

export const cancelBuddyStudySession = async (userId1: string, userId2: string): Promise<void> => {
    const session = await getPendingBuddySession(userId1, userId2); // Use the query from earlier
    if (!session) throw new Error("No pending session found");

    const sessionRef = doc(db, 'buddyStudySessions', session.id);
    await updateDoc(sessionRef, { status: 'cancelled' });
};


export const getExistingBuddySession = async (uid1: string, uid2: string): Promise<BuddyStudySession | null> => {
    const q = query(
        collection(db, 'buddyStudySessions'),
        where('isActive', '==', true),
        where('status', 'in', ['pending', 'accepted'])
    );

    const querySnapshot = await getDocs(q);
    const sessions = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as BuddyStudySession))
        .filter(session =>
            (session.user1Id === uid1 && session.user2Id === uid2) ||
            (session.user1Id === uid2 && session.user2Id === uid1)
        );

    return sessions.length ? sessions[0] : null;
};

export const getPendingBuddySession = async (userId1: string, userId2: string) => {
    const sessionsRef = collection(db, 'buddyStudySessions');
    const q = query(
        sessionsRef,
        where('status', '==', 'pending'),
        where('user1Id', 'in', [userId1, userId2]),
        where('user2Id', 'in', [userId1, userId2])
    );

    const snapshot = await getDocs(q);
    const matches = snapshot.docs.map(doc => ({
        ...(doc.data() as BuddyStudySession),
        id: doc.id,
    }));

    // Return the one that matches exactly (user1-user2 or reversed)
    return matches.find(
        s => (s.user1Id === userId1 && s.user2Id === userId2) || (s.user1Id === userId2 && s.user2Id === userId1)
    ) || null;
};

export const fetchUserName = async (uid: string): Promise<string> => {
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists() ? userDoc.data().name || 'Unknown' : 'Unknown';
};

export const rejectBuddyStudySession = async (sessionId: string): Promise<void> => {
    const sessionRef = doc(db, 'buddyStudySessions', sessionId);

    await updateDoc(sessionRef, {
        status: 'rejected',
        isActive: false
    });
};

// Real-time listener for user study data
export const subscribeToUserStudyData = (
    userId: string,
    callback: (studyData: {
        dailySeconds: number;
        isCurrentlyStudying: boolean;
        currentTaskName?: string;
        currentStudyStartTime?: Date;
        currentSessionId?: string;
    } | null) => void
): (() => void) => {
    console.log('Setting up real-time listener for user study data:', userId);
    const userRef = doc(db, 'users', userId);
    
    return onSnapshot(userRef, (docSnap) => {
        console.log('User study data update received for user:', userId);
        try {
            if (!docSnap.exists()) {
                callback(null);
                return;
            }

            const userData = docSnap.data() as User;
            const studyStats = userData.studyStats;
            
            if (!studyStats) {
                callback({
                    dailySeconds: 0,
                    isCurrentlyStudying: false
                });
                return;
            }

            // Check if we need to reset daily counter (new day)
            const today = new Date();
            const lastReset = studyStats.lastDailyReset ? 
                (studyStats.lastDailyReset instanceof Timestamp ? 
                    studyStats.lastDailyReset.toDate() : 
                    new Date(studyStats.lastDailyReset)) : 
                new Date(0);
            
            const isNewDay = today.toDateString() !== lastReset.toDateString();
            
            // If it's a new day, we should still show the current data but know it will be reset
            const studyData = {
                dailySeconds: isNewDay ? 0 : (studyStats.dailyStudySeconds || 0),
                isCurrentlyStudying: studyStats.isCurrentlyStudying || false,
                currentTaskName: studyStats.currentStudyTaskName,
                currentStudyStartTime: studyStats.currentStudyStartTime instanceof Timestamp 
                    ? studyStats.currentStudyStartTime.toDate() 
                    : studyStats.currentStudyStartTime 
                        ? new Date(studyStats.currentStudyStartTime) 
                        : undefined,
                currentSessionId: studyStats.currentSessionId || undefined
            };
            
            console.log('Study data processed for user:', userId, 'isStudying:', studyData.isCurrentlyStudying);
            callback(studyData);
            
        } catch (error) {
            console.error("Error processing user study data update:", error);
            callback(null);
        }
    }, (error) => {
        console.error("Error listening to user study data:", error);
        callback(null);
    });
};