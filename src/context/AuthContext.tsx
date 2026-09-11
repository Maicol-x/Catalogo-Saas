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
  loginAsDemoMerchant: (subdomain?: string) => Promise<void>;
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
        setStores(data.stores || []);
        if (data.stores && data.stores.length > 0) {
          setActiveStore((prev) => prev || data.stores[0]);
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

  // Demo fallback merchant for instant evaluation
  const loginAsDemoMerchant = async (subdomain = 'elmolino') => {
    setLoading(true);
    try {
      const res = await fetch('/api/public/all-stores');
      const all = await res.json();
      const targetStore = all.find((s: Store) => s.subdomain === subdomain) || all[0];

      if (targetStore) {
        const mockDbUser: User = {
          id: targetStore.userId,
          uid: targetStore.userUid,
          email: 'comercio.demo@catalogo.app',
          name: 'Comerciante Demo',
          phoneNumber: targetStore.phoneNumber || '5512345678',
          countryCode: targetStore.countryCode || '+52',
          createdAt: targetStore.createdAt,
        };
        setDbUser(mockDbUser);
        const userStores = all.filter((s: Store) => s.userUid === targetStore.userUid);
        setStores(userStores);
        setActiveStore(targetStore);
      }
    } catch (err) {
      console.error('Error loading demo merchant:', err);
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
    } else if (dbUser) {
      // Refresh for demo session
      try {
        const res = await fetch('/api/public/all-stores');
        const all: Store[] = await res.json();
        const userStores = all.filter((s) => s.userUid === dbUser.uid);
        setStores(userStores);
        if (activeStore) {
          const current = userStores.find((s) => s.id === activeStore.id);
          if (current) setActiveStore(current);
        }
      } catch (e) {
        console.error('Refresh error:', e);
      }
    }
  };

  const updateUserPhone = async (phoneNumber: string, countryCode: string) => {
    if (!dbUser) return;

    if (idToken) {
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
      }
    } else {
      // local demo update
      setDbUser((prev) => (prev ? { ...prev, phoneNumber, countryCode } : null));
      if (activeStore) {
        setActiveStore((prev) => (prev ? { ...prev, phoneNumber, countryCode } : null));
      }
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
        loginAsDemoMerchant,
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
