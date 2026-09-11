import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { DashboardView, TabType } from './components/Dashboard/DashboardView.tsx';
import { PublicCatalogView } from './components/PublicCatalog/PublicCatalogView.tsx';
import { PhoneOnboardingModal } from './components/PhoneOnboardingModal.tsx';
import { CreateStoreModal } from './components/CreateStoreModal.tsx';
import { Store } from './types.ts';
import { Store as StoreIcon, Plus, Sparkles, Phone, ExternalLink } from 'lucide-react';

const AppContent: React.FC = () => {
  const { dbUser, activeStore, setActiveStore, stores, refreshUserData } = useAuth();
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [currentView, setCurrentView] = useState<'dashboard' | 'catalog'>('dashboard');
  const [dashboardTab, setDashboardTab] = useState<TabType>('products');
  const [isCreateStoreOpen, setIsCreateStoreOpen] = useState(false);
  const [loadingStores, setLoadingStores] = useState(true);

  // Fetch all public stores for multi-tenant switching
  const fetchStores = async () => {
    try {
      const res = await fetch('/api/public/all-stores');
      if (res.ok) {
        const list: Store[] = await res.json();
        setAllStores(list);
        if (!activeStore && list.length > 0) {
          setActiveStore(list[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load stores:', err);
    } finally {
      setLoadingStores(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  // Synchronize active store if allStores updates
  useEffect(() => {
    if (activeStore) {
      const fresh = allStores.find((s) => s.id === activeStore.id);
      if (fresh && JSON.stringify(fresh) !== JSON.stringify(activeStore)) {
        setActiveStore(fresh);
      }
    } else if (allStores.length > 0) {
      setActiveStore(allStores[0]);
    }
  }, [allStores]);

  const handleStoreCreated = (newStore: Store) => {
    setAllStores((prev) => [newStore, ...prev]);
    setActiveStore(newStore);
    refreshUserData();
  };

  const handleStoreUpdated = (updated: Store) => {
    setAllStores((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setActiveStore(updated);
    refreshUserData();
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        onSelectView={setCurrentView}
        onOpenCreateStore={() => setIsCreateStoreOpen(true)}
        availableStores={allStores}
        onSelectStore={(s) => setActiveStore(s)}
      />

      {/* Main Viewport */}
      <div className="flex-1">
        {loadingStores ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
            <p className="mt-3 text-xs text-neutral-500 font-medium">Iniciando plataforma de catálogos...</p>
          </div>
        ) : activeStore ? (
          currentView === 'dashboard' ? (
            <DashboardView
              store={activeStore}
              onStoreUpdated={handleStoreUpdated}
              onViewCatalog={() => setCurrentView('catalog')}
              activeTab={dashboardTab}
              onTabChange={setDashboardTab}
              onOpenPhoneSettings={() => setDashboardTab('branding')}
            />
          ) : (
            <PublicCatalogView store={activeStore} />
          )
        ) : (
          /* Empty state if no stores exist */
          <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
            <div className="h-14 w-14 rounded-2xl bg-neutral-900 text-white flex items-center justify-center mb-4 shadow-md">
              <StoreIcon className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900">
              Crea tu primer catálogo digital
            </h2>
            <p className="mt-2 text-xs text-neutral-600 leading-relaxed">
              Comienza a vender tus productos por WhatsApp con un subdominio profesional y código QR listo para imprimir.
            </p>
            <button
              onClick={() => setIsCreateStoreOpen(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-neutral-800 transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Crear Catálogo Ahora
            </button>
          </div>
        )}
      </div>

      {/* WhatsApp Phone Onboarding Modal (Required for merchants with no phone number) */}
      <PhoneOnboardingModal
        onGoToSettings={() => {
          setCurrentView('dashboard');
          setDashboardTab('branding');
        }}
      />

      {/* Create New Store Modal */}
      <CreateStoreModal
        isOpen={isCreateStoreOpen}
        onClose={() => setIsCreateStoreOpen(false)}
        onStoreCreated={handleStoreCreated}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
