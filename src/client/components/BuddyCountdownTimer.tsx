import React, { useEffect, useRef, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { endBuddyStudySession } from '../../services/StudyService';
import { BuddyStudySession } from '../types/User';

interface BuddyCountdownTimerProps {
    session: BuddyStudySession;
    onComplete?: () => void;
}

const BuddyCountdownTimer: React.FC<BuddyCountdownTimerProps> = ({ session, onComplete }) => {
    const [remainingSeconds, setRemainingSeconds] = useState<number>(session.durationSeconds);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const hasEndedRef = useRef<boolean>(false);

    useEffect(() => {
        if (!session.startTime) return;

        const startTime =
        session.startTime instanceof Timestamp
            ? session.startTime.toDate()
            : new Date(session.startTime);

        const updateRemaining = () => {
            const now = new Date();
            const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
            const newRemaining = session.durationSeconds - elapsed;

            if (newRemaining <= 0) {
                setRemainingSeconds(0);
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }

                if (!hasEndedRef.current) {
                    hasEndedRef.current = true;
                    endBuddyStudySession(session.id, "completed")
                        .catch((err) => console.error('Failed to end session:', err))
                        .finally(() => {
                        if (onComplete) onComplete();
                        });
                }
            } else {
                setRemainingSeconds(newRemaining);
            }
        };

        updateRemaining(); // Sync immediately
        intervalRef.current = setInterval(updateRemaining, 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [session]);

    const formatTime = (seconds: number): string => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    };

    return (
        <div className="bg-blue-50 p-4 rounded-lg shadow-md text-center">
            <h2 className="text-xl font-bold text-blue-700 mb-2">Buddy Study Session</h2>
            <p className="text-sm text-gray-600 mb-4">Task: {session.taskName}</p>
            <div className="text-4xl font-mono text-blue-800 mb-2">{formatTime(remainingSeconds)}</div>
            {remainingSeconds > 0 ? (
                <p className="text-sm text-green-600">Study in progress...</p>
            ) : (
                <p className="text-sm text-red-600">Time's up! Session ended.</p>
            )}
        </div>
    );
};

export default BuddyCountdownTimer;