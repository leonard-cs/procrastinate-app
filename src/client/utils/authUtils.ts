import { User } from 'firebase/auth';
import { auth } from '../../firebaseConfig';

export const ensureUserAuthenticated = (): User => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated');
  }

  return user;
};