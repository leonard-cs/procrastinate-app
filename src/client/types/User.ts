export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    studyStats: {
        totalSecondsStudied: number;
        totalHoursStudied: number;
        studySessionsCompleted: number;
        lastStudyDate?: Date;
        dailyStudySeconds: number;
        lastDailyReset?: Date;
        isCurrentlyStudying: boolean;
        currentStudyStartTime?: Date;
        currentStudyTaskName?: string;
        currentSessionId?: string;
    };
    createdAt: Date;
}

export interface StudySession {
    id: string;
    userId: string;
    buddyId?: string;
    taskName: string;
    startTime: Date;
    endTime?: Date;
    durationSeconds?: number;
    isActive: boolean;
    isSharedSession: boolean;
}

export type BuddySessionStatus = 'pending' | 'accepted' | 'cancelled' | 'completed' | 'rejected';

export interface BuddyStudySession {
  id: string;
  user1Id: string;
  user1Name: string;
  user2Id: string;
  taskName: string;
  durationSeconds: number;
  status: BuddySessionStatus;
  isActive: boolean;
  startTime?: Date;
  endTime?: Date;
}