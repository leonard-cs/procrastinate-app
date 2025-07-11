import React, { useState, useEffect } from 'react';
import { StudySession } from '../types/User';
import { createStudySession, endStudySession, getActiveStudySession } from '../../services/StudyService';
import { useUserContext } from '../contexts/UserContext';

interface StudyTimerProps {
    userId: string;
    buddyId?: string;
    buddyName?: string;
    onStudyComplete: (session: StudySession) => void;
}

const StudyTimer: React.FC<StudyTimerProps> = ({ 
    userId, 
    buddyId, 
    buddyName, 
    onStudyComplete 
}) => {
    const user = useUserContext();
    const [isActive, setIsActive] = useState(false);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [currentSession, setCurrentSession] = useState<StudySession | null>(null);
    const [taskName, setTaskName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [requestSent, setRequestSent] = useState(false);

    // Check for existing active session on component mount
    useEffect(() => {
        checkForActiveSession();
    }, [user]);

    // Timer effect
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        
        if (isActive && currentSession) {
            interval = setInterval(() => {
                const startTime = new Date(currentSession.startTime).getTime();
                const now = new Date().getTime();
                setTimeElapsed(Math.floor((now - startTime) / 1000));
            }, 1000);
        } else if (!isActive) {
            if (interval) clearInterval(interval);
        }
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, currentSession]);

    const checkForActiveSession = async () => {
        if (!user?.uid) {
            return; // User not authenticated yet
        }

        try {
            const activeSession = await getActiveStudySession(user.uid);
            if (activeSession) {
                setCurrentSession(activeSession);
                setTaskName(activeSession.taskName);
                setIsActive(true);
                
                // Calculate elapsed time
                const startTime = new Date(activeSession.startTime).getTime();
                const now = new Date().getTime();
                setTimeElapsed(Math.floor((now - startTime) / 1000));
            }
        } catch (error) {
            console.error('Error checking for active session:', error);
        }
    };

    const startSoloTimer = async () => {
        if (!taskName.trim()) {
            // alert('Please enter a task name to start studying');
            return;
        }

        // Check if user context is still loading
        if (user === undefined) {
            // alert('Please wait while we verify your authentication...');
            return;
        }

        if (!user || !user.uid) {
            // alert('You must be logged in to start a study session. Please log in and try again.');
            return;
        }

        console.log('Starting study session for user:', user.uid, 'task:', taskName);
        setIsLoading(true);
        try {
            const sessionId = await createStudySession(user.uid, taskName);
            console.log('Study session created with ID:', sessionId);
            
            const newSession: StudySession = {
                id: sessionId,
                userId: user.uid,
                taskName,
                startTime: new Date(),
                isActive: true,
                isSharedSession: false
            };
            
            setCurrentSession(newSession);
            setIsActive(true);
            setTimeElapsed(0);
            console.log('Study session started successfully');
        } catch (error) {
            console.error('Error starting study session:', error);
            
            // More detailed error handling
            let errorMessage = 'Failed to start study session. ';
            
            if (error instanceof Error) {
                if (error.message.includes('auth')) {
                    errorMessage += 'Authentication issue. Please try logging in again.';
                } else if (error.message.includes('permission')) {
                    errorMessage += 'Permission denied. Please check your account settings.';
                } else if (error.message.includes('network')) {
                    errorMessage += 'Network error. Please check your connection.';
                } else {
                    errorMessage += `Error: ${error.message}`;
                }
            } else {
                errorMessage += 'Please try again.';
            }
            
            // alert(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const stopTimer = async () => {
        if (!currentSession) return;

        setIsLoading(true);
        try {
            await endStudySession(currentSession.id);
            
            const completedSession = {
                ...currentSession,
                endTime: new Date(),
                durationMinutes: Math.floor(timeElapsed / 60),
                isActive: false
            };
            
            onStudyComplete(completedSession);
            
            setIsActive(false);
            setCurrentSession(null);
            setTimeElapsed(0);
            setTaskName('');
        } catch (error) {
            console.error('Error ending study session:', error);
            // alert('Failed to end study session. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div>
            {/* Study Session Requests */}

            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                        {buddyId ? `Study Together with ${buddyName}` : 'Study Timer'}
                    </h3>
                    <div className="flex items-center justify-center mb-4">
                        <span className="text-4xl mr-2">📚</span>
                        <span className="text-2xl">⏱️</span>
                        {buddyId && (
                            <>
                                <span className="text-2xl mx-2">👥</span>
                                <span className="text-sm text-gray-600">Request to Study Together</span>
                            </>
                        )}
                    </div>
                </div>

                {!isActive ? (
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="taskName" className="block text-sm font-medium text-gray-700 mb-2">
                                What are you studying?
                            </label>
                            <input
                                type="text"
                                id="taskName"
                                value={taskName}
                                onChange={(e) => setTaskName(e.target.value)}
                                placeholder="Enter your study task..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isLoading}
                            />
                        </div>

                        {requestSent && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                                <p className="text-green-800 font-medium">
                                    ✅ Study request sent to {buddyName}!
                                </p>
                                <p className="text-green-600 text-sm mt-1">
                                    Waiting for them to accept...
                                </p>
                            </div>
                        )}

                        <div className="flex space-x-2">
                            {buddyId ? (
                                <>
                                    <button
                                        onClick={startSoloTimer}
                                        disabled={isLoading || !taskName.trim() || user === undefined || !user}
                                        className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                                    >
                                        {isLoading ? 'Starting...' : user === undefined ? 'Loading...' : 'Study Solo'}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={startSoloTimer}
                                    disabled={isLoading || !taskName.trim() || user === undefined || !user}
                                    className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                                >
                                    {isLoading ? 'Starting...' : user === undefined ? 'Loading...' : 'Start Study Session'}
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center space-y-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm text-gray-600 mb-2">Currently studying:</p>
                            <p className="font-semibold text-gray-800">{taskName}</p>
                            {currentSession?.isSharedSession && (
                                <p className="text-sm text-blue-600 mt-1">
                                    📝 Studying with {buddyName}
                                </p>
                            )}
                        </div>
                        
                        <div className="text-6xl font-mono font-bold text-blue-600 my-6">
                            {formatTime(timeElapsed)}
                        </div>
                        
                        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 mb-4">
                            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                            <span>Study session in progress</span>
                        </div>
                        
                        <button
                            onClick={stopTimer}
                            disabled={isLoading}
                            className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                        >
                            {isLoading ? 'Ending...' : 'End Study Session'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudyTimer; 