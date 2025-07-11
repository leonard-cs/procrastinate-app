import React, { useState, useEffect } from 'react';
import { getUserDailyStudyData, startDailyStudySession, endDailyStudySession, 
    createBuddyStudySession, acceptBuddyStudySession, endBuddyStudySession,
    getIncomingBuddyStudyRequests, getBuddySessionById, cancelBuddyStudySession,
    getExistingBuddySession, fetchUserName, 
    rejectBuddyStudySession, subscribeToUserStudyData} from '../../services/StudyService';
import { useUserContext } from '../contexts/UserContext';
import { useBuddyContext } from '../contexts/BuddyContext';
import { useTaskContext } from '../contexts/TaskContext';
import { BuddyStudySession } from '../types/User';
import BuddyCountdownTimer from './BuddyCountdownTimer';
import { doc, getDoc, query, collection, where, limit, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

type StudyMode = 'solo' | 'buddy';

interface DailyStudyData {
    dailySeconds: number;
    isCurrentlyStudying: boolean;
    currentTaskName?: string;
    currentStudyStartTime?: Date;
    currentSessionId?: string;
}

interface DailyStudyTrackerProps {
  studyMode: StudyMode
  setStudyMode: React.Dispatch<React.SetStateAction<'solo' | 'buddy'>>;
}

const DailyStudyTracker: React.FC<DailyStudyTrackerProps> = ({ studyMode, setStudyMode }) => {
    const user = useUserContext();
    const { currentBuddy } = useBuddyContext();
    const { tasks } = useTaskContext();
    
    const [userStudyData, setUserStudyData] = useState<DailyStudyData>({
        dailySeconds: 0,
        isCurrentlyStudying: false
    });
    
    const [buddyStudyData, setBuddyStudyData] = useState<DailyStudyData>({
        dailySeconds: 0,
        isCurrentlyStudying: false
    });

    const [taskName, setTaskName] = useState('');
    const [selectedTask, setSelectedTask] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [currentSessionTime, setCurrentSessionTime] = useState(0);
    const [localBuddyDailySeconds, setLocalBuddyDailySeconds] = useState(0);
    const [localDailySeconds, setLocalDailySeconds] = useState(0);
    const [buddyTaskName, setBuddyTaskName] = useState('');
    const [buddyDuration, setBuddyDuration] = useState(30); // in minutes
    const [remainingTime, setRemainingTime] = useState<number | null>(null);
    const [activeBuddySession, setActiveBuddySession] = useState<BuddyStudySession | null>(null);
    const [buddySessionId, setBuddySessionId] = useState<string | null>(null);
    const [incomingRequests, setIncomingRequests] = useState<BuddyStudySession[]>([]);
    const [requestSent, setRequestSent] = useState(false);
    const [sessionAccepted, setSessionAccepted] = useState(false);
    const [sessionPending, setSessionPending] = useState(false);
    const [buddySession, setBuddySession] = useState<BuddyStudySession | null>(null);

    const resetBuddySessionUI = () => {
        setBuddySession(null);
        setBuddySessionId(null);
        setActiveBuddySession(null);
        setRemainingTime(null);
        setBuddyTaskName('');
        setSessionAccepted(false);
    };

    // Set up real-time listeners for study data
    useEffect(() => {
        if (!user?.uid) {
            setUserStudyData({
                dailySeconds: 0,
                isCurrentlyStudying: false
            });
            return;
        }

        console.log('Setting up real-time listener for user study data:', user.uid);
        const unsubscribe = subscribeToUserStudyData(user.uid, (data) => {
            if (data) {
                setUserStudyData(data);
                setCurrentSessionId(data.currentSessionId || null);
                if (!data.isCurrentlyStudying) {
                    setLocalDailySeconds(data.dailySeconds);
                }
                if (data.currentTaskName) {
                    setTaskName(data.currentTaskName);
                }
            }
        });

        return () => {
            console.log('Cleaning up user study data listener for:', user.uid);
            unsubscribe();
        };
    }, [user?.uid]);

    useEffect(() => {
        if (!currentBuddy?.id) {
            setBuddyStudyData({
                dailySeconds: 0,
                isCurrentlyStudying: false
            });
            return;
        }

        console.log('Setting up real-time listener for buddy study data:', currentBuddy.id);
        const unsubscribe = subscribeToUserStudyData(currentBuddy.id, (data) => {
            if (data) {
                setBuddyStudyData(data);
                setLocalBuddyDailySeconds(data.dailySeconds);
            }
        });

        return () => {
            console.log('Cleaning up buddy study data listener for:', currentBuddy.id);
            unsubscribe();
        };
    }, [currentBuddy?.id]);

    // Show custom input when there are no incomplete tasks
    useEffect(() => {
        const incompleteTasks = tasks.filter(task => !task.completed);
        if (incompleteTasks.length === 0) {
            setShowCustomInput(true);
        }
    }, [tasks]);

    // Update current session timer
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (userStudyData.isCurrentlyStudying && userStudyData.currentStudyStartTime) {
        interval = setInterval(() => {
            const now = new Date();
            const startTime = new Date(userStudyData.currentStudyStartTime!); // now safe
            const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
            setCurrentSessionTime(elapsedSeconds);
        }, 1000);
        } else {
            setCurrentSessionTime(0);
        }

        return () => clearInterval(interval);
    }, [userStudyData.isCurrentlyStudying, userStudyData.currentStudyStartTime]);

    // Periodic refresh no longer needed since we have real-time listeners
    // Keep this commented out as backup in case real-time listeners fail
    /*
    useEffect(() => {
        const interval = setInterval(() => {
            if (user?.uid) loadUserStudyData();
            if (currentBuddy?.id) loadBuddyStudyData();
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(interval);
    }, [user?.uid, currentBuddy?.id]);
    */

    useEffect(() => {
        const checkDateRollover = () => {
            const now = new Date().toDateString();
            const lastSeenDate = localStorage.getItem('lastSeenDate');

            if (lastSeenDate !== now) {
                localStorage.setItem('lastSeenDate', now);
                setLocalDailySeconds(0);
                loadUserStudyData(); // refresh backend + frontend timer
            }
        };

        const interval = setInterval(checkDateRollover, 60 * 1000); // check every 1 min
        checkDateRollover(); // also run immediately

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (activeBuddySession && remainingTime !== null) {
            const interval = setInterval(() => {
                setRemainingTime((prev) => {
                    if (prev !== null && prev > 0) {
                        return prev - 1;
                    } else {
                        clearInterval(interval);
                        handleEndBuddySession(); // auto-end when time is up
                        return 0;
                    }
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [activeBuddySession, remainingTime]);

    useEffect(() => {
        if (!user?.uid) return;

        const q = query(
            collection(db, 'buddyStudySessions'),
            where('user2Id', '==', user.uid),
            where('isActive', '==', false)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const sessions: BuddyStudySession[] = await Promise.all(
                snapshot.docs.map(async (doc) => {
                    const data = doc.data();
                    const name = await fetchUserName(data.user1Id);

                    return {
                        ...(data as BuddyStudySession),
                        id: doc.id,
                        user1Name: name,
                        startTime: data.startTime?.toDate?.(),
                        endTime: data.endTime?.toDate?.(),
                    };
                })
            );

            setIncomingRequests(
                sessions.filter((s) => s.status === 'pending')
            );
        });

        return () => unsubscribe();
    }, [user?.uid]);

    useEffect(() => {
        const checkPendingRequest = async () => {
            if (!user?.uid || !currentBuddy?.id) return;

            const q = query(
                collection(db, 'buddyStudySessions'),
                where('user1Id', '==', user.uid),
                where('user2Id', '==', currentBuddy.id),
                where('status', '==', 'pending'),
                where('isActive', '==', false),
                limit(1)
            );

            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                setBuddySessionId(doc.id);
                setSessionPending(true);
            }
        };

        checkPendingRequest();
    }, [user, currentBuddy]);

    useEffect(() => {
        const fetchSession = async () => {
            if (!user || !currentBuddy) return;

            try {
                const session = await getExistingBuddySession(user.uid, currentBuddy.id);

                if (!session || session.status === 'cancelled' || session.status === 'completed' || session.status === 'rejected') {
                    setBuddySession(null);
                    setActiveBuddySession(null);
                    setBuddySessionId(null);
                    setSessionAccepted(false);
                    return;
                }

                setBuddySession(session);
                setBuddySessionId(session.id);

                if (session.status === 'accepted') {
                    setSessionAccepted(true); // 💡 ensure sender updates this
                    setActiveBuddySession(session);
                    setRemainingTime(session.durationSeconds);
                }
            } catch (err) {
                console.error("Error fetching buddy session", err);
            }
        };

        fetchSession();
    }, [user, currentBuddy]);

    useEffect(() => {
        if (!buddySessionId) return;

        const sessionRef = doc(db, 'buddyStudySessions', buddySessionId);

        const unsubscribe = onSnapshot(sessionRef, (docSnap) => {
            if (!docSnap.exists()) {
                console.warn('Session document no longer exists.');
                resetBuddySessionUI();
                return;
            }

            const handleSessionUpdate = async () => {
                const data = docSnap.data();
                if (!data) return;

                const name = await fetchUserName(data.user1Id);

                const session: BuddyStudySession & { user1Name?: string } = {
                    id: docSnap.id,
                    user1Id: data.user1Id,
                    user1Name: name,
                    user2Id: data.user2Id,
                    taskName: data.taskName,
                    durationSeconds: data.durationSeconds,
                    status: data.status,
                    isActive: data.isActive,
                    startTime: data.startTime?.toDate?.(),
                    endTime: data.endTime?.toDate?.(),
                };

                if (session.status === 'completed' || session.status === 'cancelled' || session.status === 'rejected') {
                    resetBuddySessionUI();
                }

                setBuddySession(session);

                if (session.status === 'accepted') {
                    setSessionAccepted(true);
                    setActiveBuddySession(session);
                    setRemainingTime(session.durationSeconds);
                }
            };

            handleSessionUpdate();
        });

        return () => unsubscribe(); // Clean up listener
    }, [buddySessionId]);

    useEffect(() => {
        const enrichRequests = async () => {
            const enriched = await Promise.all(
                incomingRequests.map(async (req) => {
                    const name = await fetchUserName(req.user1Id);
                    return { ...req, user1Name: name };
                })
            );
            setIncomingRequests(enriched);
        };

        if (incomingRequests.length > 0) {
            enrichRequests();
        }
    }, [incomingRequests]);

    const loadUserStudyData = async () => {
        if (!user?.uid) return;
        
        try {
            const data = await getUserDailyStudyData(user.uid);
            if (data) {
                setUserStudyData(data);
                setCurrentSessionId(data.currentSessionId || null);
                if (!data.isCurrentlyStudying) {
                    setLocalDailySeconds(data.dailySeconds);
                }
                if (data.currentTaskName) {
                    setTaskName(data.currentTaskName);
                }
            }
        } catch (error) {
            console.error('Error loading user study data:', error);
        }
    };

    const loadBuddyStudyData = async () => {
        if (!currentBuddy?.id) return;
        
        try {
            const data = await getUserDailyStudyData(currentBuddy.id);
            if (data) {
                setBuddyStudyData(data);
                setLocalBuddyDailySeconds(data.dailySeconds);
            }
        } catch (error) {
            console.error('Error loading buddy study data:', error);
        }
    };

    const startStudying = async () => {
        if (!user?.uid || !taskName.trim()) return;
        
        try {
            setIsLoading(true);
            const sessionId = await startDailyStudySession(user.uid, taskName.trim());
            const now = new Date();

            setCurrentSessionId(sessionId);
            setUserStudyData(prev => ({
                ...prev,
                isCurrentlyStudying: true,
                currentStudyStartTime: now,
                currentTaskName: taskName.trim(),
            }));
        } catch (error) {
            console.error('Error starting study session:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const stopStudying = async () => {
        if (!user?.uid || !currentSessionId) {
        console.warn("Missing user or session ID", user?.uid, currentSessionId);
            return;
        }

        try {
            const durationSeconds = currentSessionTime;
            setIsLoading(true);
            await endDailyStudySession(user.uid, currentSessionId);
            setCurrentSessionId(null);
            setTaskName('');
            setCurrentSessionTime(0);
            setUserStudyData(prev => ({
                ...prev,
                isCurrentlyStudying: false,
                currentStudyStartTime: undefined,
                currentTaskName: undefined
            }));
            // No need to manually reload - real-time listener will update automatically
        } catch (error) {
            console.error('Error ending study session:', error);
            alert('Failed to end study session. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendBuddyRequest = async () => {
        try {
            setIsLoading(true);

            if (!user || !currentBuddy) return;

            const durationInSeconds = buddyDuration * 60;

            const sessionId = await createBuddyStudySession(
                user.uid,
                currentBuddy.id,
                buddyTaskName,
                durationInSeconds
            );
            setBuddySessionId(sessionId);
            const session = await getBuddySessionById(sessionId);
            setBuddySession(session);

            const sessionDoc = await getDoc(doc(db, 'buddyStudySessions', sessionId));
            const sessionData = sessionDoc.data();

            if (sessionData) {
                setActiveBuddySession({
                    id: sessionDoc.id,
                    ...sessionData,
                    startTime: sessionData.startTime?.toDate?.() ?? undefined,
                    endTime: sessionData.endTime?.toDate?.() ?? undefined
                } as BuddyStudySession);
            }
        } catch (err) {
            console.error('Failed to send buddy request', err);
            alert('Failed to send buddy request. Please check permissions or try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelRequest = async () => {
        if (!user || !currentBuddy) return;

        try {
            await cancelBuddyStudySession(user.uid, currentBuddy.id);

            // Delay slightly to let Firestore propagate changes
            await new Promise((res) => setTimeout(res, 500));

            const newSession = await getExistingBuddySession(user.uid, currentBuddy.id);
            if (!newSession || ['cancelled', 'rejected', 'completed'].includes(newSession.status)) {
                setBuddySession(null);
                setBuddySessionId(null);
                setSessionPending(false);
                setSessionAccepted(false);
                setActiveBuddySession(null);
                setRemainingTime(null);
            } else {
                setBuddySession(newSession);
                setBuddySessionId(newSession.id);
                if (newSession.status === 'pending') setSessionPending(true);
            }
        } catch (err) {
            console.error("Failed to cancel request", err);
        }
    };

    const handleAcceptBuddySession = async (sessionId: string) => {
        try {
            await acceptBuddyStudySession(sessionId);

            // Fetch session details from Firestore
            const sessionDoc = await getDoc(doc(db, 'buddyStudySessions', sessionId));
            if (!sessionDoc.exists()) {
                console.error('Session not found');
                return;
            }

            const sessionData = sessionDoc.data();
            if (!sessionData) return;

            const session: BuddyStudySession = {
                id: sessionDoc.id,
                user1Id: sessionData.user1Id,
                user1Name: await fetchUserName(sessionData.user1Id),
                user2Id: sessionData.user2Id,
                taskName: sessionData.taskName,
                durationSeconds: sessionData.durationSeconds,
                status: sessionData.status,
                isActive: sessionData.isActive,
                startTime: sessionData.startTime?.toDate?.() ?? new Date(),
                endTime: sessionData.endTime?.toDate?.() ?? undefined
            };

            setIncomingRequests(prev =>
                prev.filter(req => req.id !== sessionId)
            );

            setBuddySession(session);
            setBuddySessionId(session.id);
            setSessionAccepted(true);
            setRemainingTime(session.durationSeconds);
            setActiveBuddySession(session);
        } catch (err) {
            console.error('Failed to accept session', err);
        }
    };

    const handleRejectBuddySession = async (sessionId: string) => {
        if (!user || !currentBuddy) return;
        try {
            await rejectBuddyStudySession(sessionId);
            setIncomingRequests(prev => prev.filter(req => req.id !== sessionId));
        } catch (err) {
            console.error("Failed to reject session", err);
        }
    };

    useEffect(() => {
        const fetchPendingOutgoingBuddyRequest = async () => {
            if (!user?.uid || !currentBuddy?.id) return;

            const q = query(
                collection(db, 'buddyStudySessions'),
                where('user1Id', '==', user.uid),
                where('user2Id', '==', currentBuddy.id),
                where('status', '==', 'pending'),
                where('isActive', '==', false)
            );

            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                setBuddySessionId(doc.id);
                setSessionPending(true);
            } else {
                setSessionPending(false);
            }
        };

        fetchPendingOutgoingBuddyRequest();
    }, [user, currentBuddy]);

    useEffect(() => {
        const fetchIncomingRequests = async () => {
            if (!user?.uid) return;

            const q = query(
                collection(db, 'buddyStudySessions'),
                where('user2Id', '==', user.uid),
                where('status', '==', 'pending'),
                where('isActive', '==', false)
            );

            const snapshot = await getDocs(q);
            const sessions: BuddyStudySession[] = snapshot.docs.map(doc => ({
                ...(doc.data() as BuddyStudySession),
                id: doc.id,
                startTime: doc.data().startTime?.toDate?.(),
                endTime: doc.data().endTime?.toDate?.(),
            }));

            setIncomingRequests(sessions);
        };

        fetchIncomingRequests();
    }, [user]);

    const handleEndBuddySession = async () => {
        try {
            if (buddySessionId) {
                await endBuddyStudySession(buddySessionId, "completed");
            }
        } catch (err) {
            console.error('Failed to end buddy session', err);
        } finally {
            setActiveBuddySession(null);
            setRemainingTime(null);
            setBuddySessionId(null);
            setBuddySession(null);
            setBuddyTaskName('');
            setSessionAccepted(false);
        }
    };

    useEffect(() => {
        const fetchBuddySession = async () => {
            if (!user || !currentBuddy) return;

            const session = await getExistingBuddySession(user.uid, currentBuddy.id);
            setBuddySession(session);
        };

        fetchBuddySession();
    }, [user, currentBuddy]);

    const formatTime = (minutes: number): string => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    const formatSessionTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const displayedDailySeconds = userStudyData.dailySeconds + (userStudyData.isCurrentlyStudying ? currentSessionTime : 0);


    if (!user) {
        return null;
    }

    return (
        <div className="mb-6">
        <div className="flex justify-center gap-4 mb-4">
            <button
            onClick={() => setStudyMode('solo')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                studyMode === 'solo'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            >
            Solo Mode
            </button>
            <button
            onClick={() => setStudyMode('buddy')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                studyMode === 'buddy'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            >
            Buddy Mode
            </button>
        </div>

        {/* Content changes depending on mode */}
        {studyMode === 'solo' ? (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Daily Study Tracker</h2>
                    <p className="text-gray-600">Track your daily study progress with your buddy!</p>
                </div>

                {/* Study Progress Cards */}
                <div className="grid grid-cols-2 gap-3 sm:gap-6 mb-6">
                    {/* Your Progress */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 sm:p-6 border border-blue-200">
                        <div className="flex items-center justify-between mb-2 sm:mb-4">
                            <h3 className="text-sm sm:text-lg font-semibold text-blue-800">You</h3>
                            <div className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                                userStudyData.isCurrentlyStudying 
                                    ? 'bg-green-500 text-white' 
                                    : 'bg-gray-200 text-gray-600'
                            }`}>
                                <span className="hidden sm:inline">{userStudyData.isCurrentlyStudying ? '🟢 Studying' : '⭕ Not Studying'}</span>
                                <span className="sm:hidden">{userStudyData.isCurrentlyStudying ? '🟢' : '⭕'}</span>
                            </div>
                        </div>
                        
                        <div className="text-center">
                            <div className="text-2xl sm:text-4xl font-bold text-blue-600 mb-1 sm:mb-2">
                                {formatTime(Math.floor(displayedDailySeconds / 60))}
                            </div>
                            <p className="text-blue-600 text-xs sm:text-sm mb-2 sm:mb-4">studied today</p>
                            
                            {userStudyData.isCurrentlyStudying && (
                                <div className="bg-white rounded-lg p-2 sm:p-3 mb-2 sm:mb-4">
                                    <p className="text-xs sm:text-sm text-gray-600 mb-1">Current session</p>
                                    <p className="text-lg sm:text-xl font-bold text-green-600">
                                        {formatSessionTime(currentSessionTime)}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1 truncate">
                                        {userStudyData.currentTaskName}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Buddy's Progress */}
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 sm:p-6 border border-green-200">
                        <div className="flex items-center justify-between mb-2 sm:mb-4">
                            <h3 className="text-sm sm:text-lg font-semibold text-green-800 truncate">
                                {currentBuddy ? currentBuddy.name : 'No Buddy'}
                            </h3>
                            {currentBuddy && (
                                <div className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                                    buddyStudyData.isCurrentlyStudying 
                                        ? 'bg-green-500 text-white' 
                                        : 'bg-gray-200 text-gray-600'
                                }`}>
                                    <span className="hidden sm:inline">{buddyStudyData.isCurrentlyStudying ? '🟢 Studying' : '⭕ Not Studying'}</span>
                                    <span className="sm:hidden">{buddyStudyData.isCurrentlyStudying ? '🟢' : '⭕'}</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="text-center">
                            {currentBuddy ? (
                                <>
                                    <div className="text-2xl sm:text-4xl font-bold text-green-600 mb-1 sm:mb-2">
                                        {formatTime(Math.floor(localBuddyDailySeconds / 60))}
                                    </div>
                                    <p className="text-green-600 text-xs sm:text-sm mb-2 sm:mb-4">studied today</p>
                                    
                                    {buddyStudyData.isCurrentlyStudying && buddyStudyData.currentTaskName && (
                                        <div className="bg-white rounded-lg p-2 sm:p-3">
                                            <p className="text-xs sm:text-sm text-gray-600 mb-1">Currently studying</p>
                                            <p className="text-xs sm:text-sm font-medium text-gray-800 truncate">
                                                {buddyStudyData.currentTaskName}
                                            </p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-gray-500 text-center py-4 sm:py-8 text-xs sm:text-sm">
                                    Choose a buddy to see their daily progress!
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Study Control */}
                <div className="border-t border-gray-200 pt-6">
                    {!userStudyData.isCurrentlyStudying ? (
                        <div className="text-center">
                            <div className="max-w-md mx-auto mb-4">
                                {tasks.length > 0 && !showCustomInput ? (
                                    <div className="space-y-3">
                                        <label className="block text-sm font-medium text-gray-700">
                                            What are you studying?
                                        </label>
                                        <select
                                            value={selectedTask}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (value === 'other') {
                                                    setShowCustomInput(true);
                                                    setSelectedTask('');
                                                    setTaskName('');
                                                } else {
                                                    setSelectedTask(value);
                                                    setTaskName(value);
                                                }
                                            }}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            disabled={isLoading}
                                        >
                                            <option value="">Select a task...</option>
                                            {tasks
                                                .filter(task => !task.completed)
                                                .map(task => (
                                                    <option key={task.id} value={task.name}>
                                                        {task.name}
                                                    </option>
                                                ))
                                            }
                                            <option value="other">Other (enter custom task)</option>
                                        </select>
                                        {selectedTask && selectedTask !== 'other' && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowCustomInput(true);
                                                    setSelectedTask('');
                                                    setTaskName('');
                                                }}
                                                className="text-sm text-blue-600 hover:text-blue-800 underline"
                                            >
                                                Enter a different task instead
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <label className="block text-sm font-medium text-gray-700">
                                            What are you studying?
                                        </label>
                                        <input
                                            type="text"
                                            value={taskName}
                                            onChange={(e) => setTaskName(e.target.value)}
                                            placeholder="Enter your study task..."
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            disabled={isLoading}
                                        />
                                        {tasks.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowCustomInput(false);
                                                    setTaskName('');
                                                    setSelectedTask('');
                                                }}
                                                className="text-sm text-blue-600 hover:text-blue-800 underline"
                                            >
                                                Choose from your tasks instead
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            <button
                                onClick={startStudying}
                                disabled={isLoading || !taskName.trim()}
                                className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center mx-auto"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Starting...
                                    </>
                                ) : (
                                    <>
                                        <span className="mr-2">▶️</span>
                                        Start Studying
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="text-center">
                            <button
                                onClick={stopStudying}
                                disabled={isLoading}
                                className="px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center mx-auto"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Stopping...
                                    </>
                                ) : (
                                    <>
                                        <span className="mr-2">⏹️</span>
                                        Stop Studying
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        ) : (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Buddy Study Session</h2>
                    <p className="text-gray-600">Coordinate a study countdown with your buddy!</p>
                </div>

                {(!buddySession || ['cancelled', 'completed', 'rejected'].includes(buddySession.status)) && (
                    <div className="space-y-4 mb-6">
                        <div>
                        <label className="block text-sm font-medium text-gray-700">Study Task</label>
                            <input
                                type="text"
                                value={buddyTaskName}
                                onChange={(e) => setBuddyTaskName(e.target.value)}
                                placeholder="e.g. Review Calculus"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
                            <input
                                type="number"
                                value={buddyDuration}
                                onChange={(e) => setBuddyDuration(Number(e.target.value))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                                min={1}
                            />
                        </div>
                    </div>
                    )}

                {/* Buttons */}
                <div className="text-center">
                    {!buddySession || buddySession.status === 'rejected' || buddySession.status === 'completed' ? (
                        // No session or session has completed — allow new request
                        <button
                            onClick={handleSendBuddyRequest}
                            disabled={!buddyTaskName || !buddyDuration || isLoading}
                            className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                        >
                            {isLoading ? 'Sending Request...' : '📨 Send Study Request'}
                        </button>
                    ) : buddySession.status === 'pending' ? (
                        // Request has been sent and is pending
                        <button
                            onClick={handleCancelRequest}
                            className="px-8 py-3 bg-yellow-500 text-white font-bold rounded-lg hover:bg-yellow-600 transition-colors"
                        >
                            ❌ Cancel Request
                        </button>
                    ) : buddySession.status === 'accepted' ? (
                        // Optional: handle 'accepted' status if needed
                        null
                    ) : null}
                </div>

                {incomingRequests.length > 0 && (
                    <div className="mt-6 space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 text-center">
                            Incoming Study Requests
                        </h3>
                        {incomingRequests.map((session) => (
                            <div
                                key={session.id}
                                className="bg-yellow-100 p-4 rounded-lg shadow flex items-center justify-between flex-no-wrap gap-4"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-800">
                                        <strong>{session.user1Name || 'Your Buddy'}</strong> wants to study: <em>{session.taskName}</em>
                                    </p>
                                    <p className="text-xs text-gray-500">Duration: {Math.floor(session.durationSeconds / 60)} min</p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleAcceptBuddySession(session.id)}
                                        className="w-10 h-10 bg-yellow-0 text-white text-xl rounded-full hover:bg-yellow-300 flex items-center justify-center transition"
                                        aria-label="Accept request"
                                        title="Accept request"
                                    >
                                        <img src={`/icons/AcceptButton.png`} alt="Accept" className="w-full h-full object-contain" />
                                    </button>
                                    <button
                                        onClick={() => handleRejectBuddySession(session.id)}
                                        className="w-10 h-10 bg-yellow-0 text-white text-xl rounded-full hover:bg-yellow-300 flex items-center justify-center transition"
                                        aria-label="Reject request"
                                        title="Reject request"
                                    >
                                        <img src={`/icons/RejectButton.png`} alt="Reject" className="w-full h-full object-contain" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {sessionAccepted && activeBuddySession && (
                    <div className="mt-8">
                        <BuddyCountdownTimer
                            session={activeBuddySession}
                            onComplete={() => {
                                setActiveBuddySession(null);
                                setBuddySession(null);
                                setBuddySessionId(null);
                                setBuddyTaskName('');
                                setSessionAccepted(false);
                            }}
                        />
                        <div className="text-center mt-4">
                            <button
                                onClick={handleEndBuddySession}
                                className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700"
                            >
                                ⏹️ End Session
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}
        </div>
   );
};

export default DailyStudyTracker; 