import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, onAuthStateChanged, db, doc, getDoc, setDoc, updateDoc, OperationType, handleFirestoreError } from './firebase';
import { User } from 'firebase/auth';

interface UserProfile {
  uid: string;
  displayName: string;
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            // Force admin role for the specific user email and persist it
            if (user.email === 'lfalvespe@gmail.com' && data.role !== 'admin') {
              data.role = 'admin';
              await updateDoc(doc(db, 'users', user.uid), { role: 'admin' });
            }
            setProfile({ uid: user.uid, ...data });
          } else {
            const newProfile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName || 'Player',
              email: user.email || '',
              photoURL: user.photoURL || '',
              score: 0,
              theme: 'classic',
              role: user.email === 'lfalvespe@gmail.com' ? 'admin' : 'player',
              banned: false,
              online: true,
            };
            await setDoc(doc(db, 'users', user.uid), newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAuthReady }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
