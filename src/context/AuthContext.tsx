import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { Store, User } from '../types.ts';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: FirebaseUser | null;
  dbUser: User | null;
  stores: Store[];
  activeStore: Store | null;
  idToken: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  setActiveStore: (store: Store | null) => void;
  refreshUserData: () => Promise<void>;
  updateUserPhone: (phoneNumber: string, countryCode: string) => Promise<void>;
  getValidToken: (forceRefresh?: boolean) => Promise<string | null>;
  getAuthHeaders: (includeContentType?: boolean) => Promise<Record<string, string> | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [activeStore, setActiveStore] = useState<Store | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Centralized, safe token retrieval that guarantees a valid, non-undefined JWT
  const getValidToken = async (forceRefresh = false): Promise<string | null> => {
    const current = firebaseUser || auth.currentUser;
    if (!current) return null;
    try {
      const token = await current.getIdToken(forceRefresh);
      if (
        token &&
        typeof token === 'string' &&
        token.trim().length > 20 &&
        token !== 'undefined' &&
        token !== 'null' &&
        token !== '[object Object]'
      ) {
        setIdToken(token);
        return token;
      }
    } catch (e) {
      console.warn('[AuthContext] Error obtaining ID token:', e);
    }
    return null;
  };

  // Centralized helper to build headers without generating Bearer undefined/null
  const getAuthHeaders = async (includeContentType = true): Promise<Record<string, string> | null> => {
    const token = await getValidToken();
    if (!token) return null;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  };

  // Sync with backend API using token
  const syncWithBackend = async (token: string) => {
    if (!token || token === 'undefined' || token.length < 20) return;

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
          if (token && token.length > 20 && token !== 'undefined') {
            setIdToken(token);
            await syncWithBackend(token);
          } else {
            setIdToken(null);
          }
        } catch (e) {
          console.error('Error retrieving ID token on state change:', e);
          setIdToken(null);
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
      if (token && token.length > 20) {
        setIdToken(token);
        await syncWithBackend(token);
      }
    } catch (error: any) {
      console.error('Google Sign-in failed:', error);
      alert('No se pudo completar el inicio de sesión con Google: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
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
    const token = await getValidToken(true);
    if (token) {
      await syncWithBackend(token);
    }
  };

  const updateUserPhone = async (phoneNumber: string, countryCode: string) => {
    const token = await getValidToken();
    if (!token) {
      throw new Error('Debes iniciar sesión para actualizar tu teléfono');
    }

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ phoneNumber, countryCode }),
          });
          if (storeRes.ok) {
            const updatedStore = await storeRes.json();
            setActiveStore(updatedStore);
          }
        }
      } else {
        const err = await res.json().catch(() => ({}));
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
        user: firebaseUser,
        dbUser,
        stores,
        activeStore,
        idToken,
        loading,
        isAuthenticated: !loading && !!firebaseUser,
        loginWithGoogle,
        logout,
        setActiveStore,
        refreshUserData,
        updateUserPhone,
        getValidToken,
        getAuthHeaders,
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
