import React, { useState } from 'react';
import {
  Store as StoreIcon,
  Plus,
  ExternalLink,
  ChevronDown,
  LogOut,
  Sparkles,
  LayoutDashboard,
  Eye,
  Check,
  Copy,
  Phone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { Store } from '../types.ts';
import { getStoreCatalogUrl, formatStoreAddress, getBaseDomain } from '../lib/domainConfig.ts';

interface Props {
  currentView: 'dashboard' | 'catalog';
  onSelectView: (view: 'dashboard' | 'catalog') => void;
  onOpenCreateStore: () => void;
  availableStores: Store[];
  onSelectStore: (store: Store) => void;
}

export const Navbar: React.FC<Props> = ({
  currentView,
  onSelectView,
  onOpenCreateStore,
  availableStores,
  onSelectStore,
}) => {
  const { dbUser, firebaseUser, activeStore, loginWithGoogle, logout } = useAuth();
  const [storeMenuOpen, setStoreMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const catalogUrl = activeStore
    ? getStoreCatalogUrl(activeStore)
    : `https://mitienda.${getBaseDomain()}`;

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(catalogUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand & Store Selector */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-white font-bold text-base shadow-xs">
                C
              </div>
              <span className="font-bold text-base tracking-tight text-neutral-900 hidden sm:inline">
                Catálogo<span className="text-neutral-400 font-light">SaaS</span>
              </span>
            </div>

            <div className="h-5 w-px bg-neutral-200 hidden sm:block" />

            {/* Tenant Selector Dropdown */}
            <div className="relative">
              <button
                id="tenant-switcher-btn"
                onClick={() => setStoreMenuOpen(!storeMenuOpen)}
                className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 transition shadow-xs"
              >
                <StoreIcon className="h-3.5 w-3.5 text-neutral-500" />
                <span className="max-w-[140px] truncate">
                  {activeStore ? activeStore.name : 'Seleccionar Tienda'}
                </span>
                <ChevronDown className="h-3 w-3 text-neutral-400" />
              </button>

              {storeMenuOpen && (
                <div
                  className="absolute left-0 mt-2 w-72 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100"
                  onMouseLeave={() => setStoreMenuOpen(false)}
                >
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Mis Catálogos / Tiendas
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {availableStores.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          onSelectStore(s);
                          setStoreMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-left transition ${
                          activeStore?.id === s.id
                            ? 'bg-neutral-900 text-white font-semibold'
                            : 'text-neutral-700 hover:bg-neutral-100'
                        }`}
                      >
                        <div className="truncate">
                          <p className="truncate">{s.name}</p>
                          <p
                            className={`text-[10px] font-mono ${
                              activeStore?.id === s.id ? 'text-neutral-300' : 'text-neutral-400'
                            }`}
                          >
                            {formatStoreAddress(s)}
                          </p>
                        </div>
                        {activeStore?.id === s.id && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </button>
                    ))}
                  </div>

                  <div className="mt-2 pt-2 border-t border-neutral-100">
                    <button
                      onClick={() => {
                        setStoreMenuOpen(false);
                        onOpenCreateStore();
                      }}
                      className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900 hover:bg-neutral-100 transition"
                    >
                      <Plus className="h-4 w-4" />
                      Crear nueva tienda / catálogo
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Store URL Badge */}
            {activeStore && (
              <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50/80 px-2.5 py-1 text-xs font-mono text-neutral-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>{formatStoreAddress(activeStore)}</span>
                <button
                  onClick={handleCopyUrl}
                  title="Copiar dirección web"
                  className="rounded p-0.5 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 transition ml-0.5"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            )}
          </div>

          {/* Center Mode Switcher */}
          <div className="flex items-center rounded-xl bg-neutral-100 p-1 border border-neutral-200/80">
            <button
              id="view-dashboard-btn"
              onClick={() => onSelectView('dashboard')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                currentView === 'dashboard'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard
            </button>
            <button
              id="view-catalog-btn"
              onClick={() => onSelectView('catalog')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                currentView === 'catalog'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              Ver Catálogo
            </button>
          </div>

          {/* Right Account & Actions */}
          <div className="flex items-center gap-2.5">
            {dbUser || firebaseUser ? (
              <div className="relative">
                <button
                  id="user-menu-btn"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-xl border border-neutral-200 p-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-white font-semibold text-xs">
                    {(firebaseUser?.displayName || dbUser?.name || dbUser?.email || 'U')[0].toUpperCase()}
                  </div>
                  <span className="hidden md:inline font-medium max-w-[120px] truncate text-neutral-800">
                    {firebaseUser?.displayName || dbUser?.name || dbUser?.email}
                  </span>
                  <ChevronDown className="h-3 w-3 text-neutral-400" />
                </button>

                {userMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-64 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100"
                    onMouseLeave={() => setUserMenuOpen(false)}
                  >
                    <div className="p-3 border-b border-neutral-100">
                      <p className="text-xs font-bold text-neutral-900 truncate">
                        {firebaseUser?.displayName || dbUser?.name || 'Comerciante'}
                      </p>
                      <p className="text-[11px] text-neutral-500 font-mono truncate">
                        {firebaseUser?.email || dbUser?.email}
                      </p>
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-neutral-600">
                        <Phone className="h-3 w-3 text-emerald-600" />
                        <span>
                          {dbUser?.phoneNumber ? `WhatsApp: ${dbUser.countryCode || '+52'} ${dbUser.phoneNumber}` : 'Sin WhatsApp configurado'}
                        </span>
                      </div>
                    </div>

                    <div className="p-1 space-y-1">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 text-left font-medium cursor-pointer"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  id="btn-google-login"
                  onClick={loginWithGoogle}
                  className="flex items-center gap-2 rounded-xl bg-neutral-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-neutral-800 transition cursor-pointer"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Iniciar con Google</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
