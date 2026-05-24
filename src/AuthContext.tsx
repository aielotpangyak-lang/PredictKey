import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, getDocFromServer, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from './types';
import { generateReferralCode, trackReferral } from './services/referralService';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  blockError: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  refreshProfile: async () => {},
  blockError: null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockError, setBlockError] = useState<string | null>(null);

  const refreshProfile = async () => {
    if (!user) return;
    
    const fetchWithRetry = async (retries = 2, delay = 1000): Promise<any> => {
      try {
        // Try server first if we are having offline issues in preview
        return await getDocFromServer(doc(db, 'users', user.uid));
      } catch (err: any) {
        if (err.message.includes('offline')) {
           // Fallback to cache/default getDoc if server fetch specifically says offline
           return await getDoc(doc(db, 'users', user.uid));
        }
        if (retries > 0) {
          console.warn(`refreshProfile getDoc failed, retrying... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchWithRetry(retries - 1, delay * 2);
        }
        throw err;
      }
    };

    try {
      const userDoc = await fetchWithRetry();
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.isBlocked) {
          setBlockError('Your account is blocked. Kindly contact customer service.');
          await auth.signOut();
          return;
        }
        setProfile({ id: userDoc.id, ...data } as UserProfile);
      }
    } catch (err) {
      console.error('refreshProfile error:', err);
    }
  };

  useEffect(() => {
    // Auth loading safety timeout
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading timed out, forcing unblock');
        setLoading(false);
      }
    }, 15000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser?.email);
      setUser(firebaseUser);
      
      try {
        if (firebaseUser) {
          const fetchWithRetry = async (retries = 2, delay = 1000): Promise<any> => {
            try {
              // Try getting direct from server to bypass "offline" state issues in sandboxed environment
              return await getDocFromServer(doc(db, 'users', firebaseUser.uid));
            } catch (err: any) {
              const msg = err.message.toLowerCase();
              if (msg.includes('offline') || msg.includes('network')) {
                console.warn(`Firestore getDocFromServer failed (${err.message}), trying standard getDoc...`);
                try {
                  return await getDoc(doc(db, 'users', firebaseUser.uid));
                } catch (innerErr) {
                   if (retries > 0) {
                     await new Promise(resolve => setTimeout(resolve, delay));
                     return fetchWithRetry(retries - 1, delay * 2);
                   }
                   throw innerErr;
                }
              }
              if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
                return fetchWithRetry(retries - 1, delay * 2);
              }
              throw err;
            }
          };

          const userDoc = await fetchWithRetry();
          
          const generateShortUid = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let result = '';
            for (let i = 0; i < 6; i++) {
              result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
          };

          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.isBlocked) {
              setBlockError('Your account is blocked. Kindly contact customer service.');
              await auth.signOut();
              return;
            }
            const existingProfile = { id: userDoc.id, ...data } as UserProfile;
            
            // Migration: Add missing fields if they don't exist
            let needsUpdate = false;
            const updatedData: any = { ...data };

            if (!data.referralCode) {
              updatedData.referralCode = generateReferralCode(firebaseUser.email || '');
              needsUpdate = true;
            }
            if (data.referralCount === undefined) {
              updatedData.referralCount = 0;
              needsUpdate = true;
            }
            if (data.walletBalance === undefined) {
              updatedData.walletBalance = 0;
              needsUpdate = true;
            }
            if (!data.claimedRewards) {
              updatedData.claimedRewards = [];
              needsUpdate = true;
            }

            if (needsUpdate) {
              await setDoc(doc(db, 'users', firebaseUser.uid), updatedData, { merge: true });
              setProfile({ id: firebaseUser.uid, ...updatedData } as UserProfile);
            } else {
              setProfile(existingProfile);
            }
          } else {
            // Create default profile for new users
            const shortUid = generateShortUid();
            const referralCode = generateReferralCode(firebaseUser.email || '');
            
            let referredBy = null;
            try {
              const pendingReferralCode = sessionStorage.getItem('pendingReferralCode');
              if (pendingReferralCode) {
                referredBy = await trackReferral(pendingReferralCode, firebaseUser.uid);
                sessionStorage.removeItem('pendingReferralCode');
              }
            } catch (e) {
              console.error('Referral handling error:', e);
            }

            const newProfileData: any = {
              uid: shortUid,
              email: firebaseUser.email || '',
              role: firebaseUser.email === 'aielotpangyak@gmail.com' ? 'admin' : 'user',
              createdAt: serverTimestamp(),
              referralCode,
              referralCount: 0,
              walletBalance: 0,
              claimedRewards: [],
            };
            
            if (referredBy) {
              newProfileData.referredBy = referredBy;
            }
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfileData);
            await setDoc(doc(db, 'users_public', firebaseUser.uid), {
              email: firebaseUser.email || '',
              uid: firebaseUser.uid,
              referralCode: newProfileData.referralCode,
              referredBy: referredBy || null,
              createdAt: serverTimestamp(),
            });
            await setDoc(doc(db, 'leaderboard', firebaseUser.uid), {
              email: firebaseUser.email || '',
              uid: firebaseUser.uid,
              walletBalance: 0,
              createdAt: serverTimestamp(),
            });
            setProfile({ id: firebaseUser.uid, ...newProfileData } as UserProfile);
          }
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error('Auth context error:', err);
      } finally {
        setLoading(false);
        clearTimeout(timeout);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const isAdmin = profile?.role === 'admin' || user?.email === 'aielotpangyak@gmail.com';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, refreshProfile, blockError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
