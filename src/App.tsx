import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { DashboardView, TabType } from './components/Dashboard/DashboardView.tsx';
import { PublicCatalogView } from './components/PublicCatalog/PublicCatalogView.tsx';
import { PhoneOnboardingModal } from './components/PhoneOnboardingModal.tsx';
import { CreateStoreModal } from './components/CreateStoreModal.tsx';
import { Store } from './types.ts';
import { Store as StoreIcon, Plus, AlertCircle, Sparkles } from 'lucide-react';

const AppContent: React.FC = () => {
  const { dbUser, firebaseUser, activeStore, setActiveStore, stores, refreshUserData } = useAuth();
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [currentView, setCurrentView] = useState<'dashboard' | 'catalog'>('dashboard');
  const [dashboardTab, setDashboardTab] = useState<TabType>('products');
  const [isCreateStoreOpen, setIsCreateStoreOpen] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isSubdomainRoute, setIsSubdomainRoute] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Check Subdomain / Tenant Resolution first
  useEffect(() => {
    const resolveTenantAndStores = async () => {
      try {
        const search = window.location.search;
        const tenantRes = await fetch(`/api/resolve-tenant${search}`);
        if (tenantRes.ok) {
          const tenantData = await tenantRes.json();
          if (tenantData.isSubdomainRoute && tenantData.store) {
            // Visitor accessed via unique subdomain or query ?subdomain=...
            setIsSubdomainRoute(true);
            setActiveStore(tenantData.store);
            setCurrentView('catalog');
            document.title = `${tenantData.store.name} — Catálogo Digital`;
            setLoadingInitial(false);
            return;
          }
        }

        // Standard SaaS dashboard flow: fetch public stores list for switcher/showcase
        const res = await fetch('/api/public/all-stores');
        if (res.ok) {
          const list: Store[] = await res.json();
          setAllStores(list);
          if (!activeStore && list.length > 0) {
            setActiveStore(list[0]);
          }
        }
      } catch (err: any) {
        console.error('Failed to initialize stores:', err);
        setErrorMessage('No pudimos conectar con el servidor para cargar las tiendas.');
      } finally {
        setLoadingInitial(false);
      }
    };

    resolveTenantAndStores();
  }, []);

  // Synchronize store when allStores or stores change
  useEffect(() => {
    const source = (dbUser || firebaseUser) && stores.length > 0 ? stores : allStores;
    if (activeStore && source.length > 0) {
      const fresh = source.find((s) => s.id === activeStore.id);
      if (fresh && JSON.stringify(fresh) !== JSON.stringify(activeStore)) {
        setActiveStore(fresh);
      }
    }
  }, [allStores, stores, dbUser, firebaseUser]);

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

  // Determine available stores based on user authentication (Data Isolation)
  const availableStoresForNavbar =
    (dbUser || firebaseUser) && stores.length > 0 ? stores : allStores;

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* Optional Global Error Banner */}
      {errorMessage && (
        <div className="bg-rose-50 border-b border-rose-200 text-rose-800 px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-semibold text-rose-700 hover:underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        onSelectView={setCurrentView}
        onOpenCreateStore={() => setIsCreateStoreOpen(true)}
        availableStores={availableStoresForNavbar}
        onSelectStore={(s) => setActiveStore(s)}
      />

      {/* Subdomain Visitor Notification bar if entered through public link */}
      {isSubdomainRoute && activeStore && currentView === 'catalog' && (
        <div className="bg-neutral-900 text-white px-4 py-1.5 text-xs text-center border-b border-neutral-800 flex items-center justify-center gap-2">
          <Sparkles className="h-3 w-3 text-amber-400" />
          <span>Estás viendo el catálogo oficial de <strong>{activeStore.name}</strong></span>
          <button
            onClick={() => {
              setIsSubdomainRoute(false);
              setCurrentView('dashboard');
            }}
            className="ml-2 underline text-neutral-300 hover:text-white"
          >
            Ir al panel de administración
          </button>
        </div>
      )}

      {/* Main Viewport */}
      <div className="flex-1">
        {loadingInitial ? (
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
