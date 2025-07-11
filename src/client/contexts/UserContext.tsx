import { getAuth, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";

// User can be undefined (loading), null (not authenticated), or FirebaseUser (authenticated)
export const UserContext = createContext<FirebaseUser | null | undefined>(undefined);

export function useUserContext() {
  const user = useContext(UserContext);
  // if (!user) throw new Error('useUserContext must be used within a UserProvider');
  return user;
};

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null | undefined>(undefined);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser); // This will be null if not authenticated, or FirebaseUser if authenticated
    });
    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={user}>
      {children}
    </UserContext.Provider>
  );
}