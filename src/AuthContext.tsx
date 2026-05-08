import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, onAuthStateChanged, db, doc, getDoc, setDoc, updateDoc, OperationType, handleFirestoreError, onSnapshot } from './firebase';
import { User } from 'firebase/auth';
import { normalizeString } from './lib/stringUtils';

interface UserProfile {
  uid: string;
  displayName: string;
  displayName_normalized: string;
  email: string;
  photoURL: string;
  bannerURL?: string;
  status?: string;
  bio?: string;
  interests?: string[];
  favoriteGames?: string[];
  socialLinks?: {
    instagram?: string;
    discord?: string;
    github?: string;
  };
  achievements?: string[];
  badges?: string[];
  stats?: {
    ticTacToe?: { wins: number; losses: number; draws: number };
    checkers?: { wins: number; losses: number; draws: number };
    ludo?: { wins: number; losses: number; draws: number };
    hangman?: { 
      wins: number; 
      losses: number; 
      draws: number; 
      total: number;
      totalMistakes?: number;
      themesPlayed?: Record<string, number>;
    };
    snakesLadders?: { wins: number; losses: number };
  };
  score: number;
  theme: 'classic' | 'cyberpunk' | 'forest';
  role: 'admin' | 'moderator' | 'player';
  banned: boolean;
  online: boolean;
  city?: string;
  country?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAuthReady: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      setUser(user);
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
            if (userDoc.exists()) {
              const data = userDoc.data() as UserProfile;
              const expectedNormalized = normalizeString(user.displayName || data.displayName || 'Player');
              
              const updates: any = {};
              if (!data.displayName_normalized || data.displayName_normalized !== expectedNormalized) {
                updates.displayName_normalized = expectedNormalized;
              }
              // Sync displayName if it changed on Google side
              if (user.displayName && user.displayName !== data.displayName) {
                updates.displayName = user.displayName;
              }

              if (Object.keys(updates).length > 0) {
                await updateDoc(userDocRef, updates);
              }
              
              // Force admin role for the specific user email and persist it
              if (user.email === 'lfalvespe@gmail.com' && data.role !== 'admin') {
                await updateDoc(userDocRef, { role: 'admin' });
              }
            } else {
            const newProfile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName || 'Player',
              displayName_normalized: normalizeString(user.displayName || 'Player'),
              email: user.email || '',
              photoURL: user.photoURL || '',
              score: 0,
              theme: 'classic',
              role: user.email === 'lfalvespe@gmail.com' ? 'admin' : 'player',
              banned: false,
              online: true,
            };
            await setDoc(userDocRef, newProfile);
          }

          // Setup real-time listener
          unsubscribeProfile = onSnapshot(userDocRef, (snapshot) => {
            if (snapshot.exists()) {
              setProfile({ uid: user.uid, ...(snapshot.data() as UserProfile) });
            }
          }, (error) => {
             handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          });

        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
      setIsAuthReady(true);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAuthReady }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
