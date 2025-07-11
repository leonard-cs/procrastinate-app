export interface Buddy {
    id: string;
    name: string;
    avatar?: string;
    tasks: {
        completed: number;
        total: number;
    };
    recentTasks: Array<{
        id: string;
        name: string;
        completed: boolean;
        completedAt?: Date;
    }>;
}

export interface BuddyPair {
    userId: string;
    buddyId: string;
    pairedAt: Date;
    invitingAccepted: boolean;
}

export interface GeneralPoke {
    id: string;
    fromUserId: string;
    toUserId: string;
    message: string;
    timestamp: Date;
    read: boolean;
} 