import { useState, useEffect } from 'react';
import { BuddyService } from '../../services/BuddyService';
import { GeneralPoke } from '../types/Buddy';
import { useUserContext } from '../contexts/UserContext';
import { Unsubscribe } from 'firebase/firestore';

export const useRealtimePokes = () => {
  const user = useUserContext();
  const [unreadPokes, setUnreadPokes] = useState<GeneralPoke[]>([]);
  const [latestPoke, setLatestPoke] = useState<GeneralPoke | null>(null);

  useEffect(() => {
    if (!user) {
      setUnreadPokes([]);
      setLatestPoke(null);
      return;
    }

    console.log('useRealtimePokes: Setting up real-time poke listener for user:', user.uid);
    let unsubscribe: Unsubscribe;

    // Subscribe to real-time unread pokes
    unsubscribe = BuddyService.subscribeToUnreadGeneralPokes(user.uid, (pokes) => {
      setUnreadPokes(pokes);
      // Set the latest poke as the first one (most recent due to desc order)
      setLatestPoke(pokes.length > 0 ? pokes[0] : null);
    });

    return () => {
      console.log('useRealtimePokes: Cleaning up poke listener for user:', user.uid);
      unsubscribe();
    };
  }, [user]);

  const markPokeAsRead = async (pokeId: string) => {
    try {
      await BuddyService.markGeneralPokeAsRead(pokeId);
      // Real-time listener will automatically update the state
    } catch (error) {
      console.error('Error marking poke as read:', error);
      throw error;
    }
  };

  const dismissLatestPoke = async () => {
    if (latestPoke) {
      await markPokeAsRead(latestPoke.id);
    }
  };

  return {
    unreadPokes,
    latestPoke,
    markPokeAsRead,
    dismissLatestPoke,
    hasUnreadPokes: unreadPokes.length > 0,
    unreadCount: unreadPokes.length
  };
}; 