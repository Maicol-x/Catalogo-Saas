import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { Store, User } from '../types.ts';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  dbUser: User | null;
  stores: Store[];
  activeStore: Store | null;
  idToken: string | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setActiveStore: (store: Store | null) => void;
  refreshUserData: () => Promise<void>;
  updateUserPhone: (phoneNumber: string, countryCode: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [activeStore, setActiveStore] = useState<Store | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync with backend API using token
  const syncWithBackend = async (token: string) => {
    try {
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setDbUser(data.user);
        const userStores: Store[] = data.stores || [];
        setStores(userStores);
        if (userStores.length > 0) {
          setActiveStore((prev) => {
            if (prev && userStores.some((s) => s.id === prev.id)) {
              return userStores.find((s) => s.id === prev.id) || userStores[0];
            }
            return userStores[0];
          });
        }
      }
    } catch (err) {
      console.error('Failed to sync user with backend:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const token = await user.getIdToken();
          setIdToken(token);
          await syncWithBackend(token);
        } catch (e) {
          console.error('Error retrieving ID token:', e);
        }
      } else {
        setIdToken(null);
        setDbUser(null);
        setStores([]);
        setActiveStore(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleAuthProvider);
      const token = await result.user.getIdToken();
      setIdToken(token);
      await syncWithBackend(token);
    } catch (error: any) {
      console.error('Google Sign-in failed:', error);
      alert('No se pudo completar el inicio de sesión con Google: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (firebaseUser) {
        await signOut(auth);
      }
      setFirebaseUser(null);
      setDbUser(null);
      setStores([]);
      setActiveStore(null);
      setIdToken(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const refreshUserData = async () => {
    if (idToken) {
      await syncWithBackend(idToken);
    }
  };

  const updateUserPhone = async (phoneNumber: string, countryCode: string) => {
    if (!idToken) return;

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ phoneNumber, countryCode }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDbUser(updated);
        // Also update phone on current active store if it lacked one
        if (activeStore && !activeStore.phoneNumber) {
          const storeRes = await fetch(`/api/stores/${activeStore.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ phoneNumber, countryCode }),
          });
          if (storeRes.ok) {
            const updatedStore = await storeRes.json();
            setActiveStore(updatedStore);
          }
        }
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar teléfono');
      }
    } catch (e) {
      console.error('Update phone error:', e);
      throw e;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        dbUser,
        stores,
        activeStore,
        idToken,
        loading,
        loginWithGoogle,
        logout,
        setActiveStore,
        refreshUserData,
        updateUserPhone,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
