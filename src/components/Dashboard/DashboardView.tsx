import React, { useState } from 'react';
import {
  Package,
  Sliders,
  Palette,
  QrCode,
  Star,
  ExternalLink,
  Phone,
  Store as StoreIcon,
  CheckCircle,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { Store } from '../../types.ts';
import { ProductsTab } from './ProductsTab.tsx';
import { FeaturesTab } from './FeaturesTab.tsx';
import { BrandingTab } from './BrandingTab.tsx';
import { QrTab } from './QrTab.tsx';
import { ReviewsTab } from './ReviewsTab.tsx';
import { SubscriptionTab } from './SubscriptionTab.tsx';
import { getStoreCatalogUrl, formatStoreAddress } from '../../lib/domainConfig.ts';

interface Props {
  store: Store;
  onStoreUpdated: (store: Store) => void;
  onViewCatalog: () => void;
  onOpenPhoneSettings?: () => void;
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
}

export type TabType = 'products' | 'features' | 'branding' | 'qr' | 'reviews' | 'subscription';

export const DashboardView: React.FC<Props> = ({
  store,
  onStoreUpdated,
  onViewCatalog,
  onOpenPhoneSettings,
  activeTab: controlledTab,
  onTabChange,
}) => {
  const [internalTab, setInternalTab] = useState<TabType>('products');
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = onTabChange ?? setInternalTab;

  const catalogUrl = getStoreCatalogUrl(store);
  const displayAddress = formatStoreAddress(store);

  return (
    <div id="dashboard-view" className="min-h-screen bg-neutral-50 pb-16">
      {/* Store Header Banner */}
      <div className="bg-white border-b border-neutral-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {store.logoUrl ? (
                <img
                  src={store.logoUrl}
                  alt={store.name}
                  referrerPolicy="no-referrer"
                  className="h-14 w-14 rounded-2xl object-cover border border-neutral-200 shadow-xs shrink-0"
                />
              ) : (
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl text-white font-bold text-xl shadow-xs shrink-0"
                  style={{ backgroundColor: store.primaryColor || '#09090b' }}
                >
                  {store.name[0]}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-neutral-900">
                    {store.name}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    En línea
                  </span>
                  <button
                    onClick={() => setActiveTab('subscription')}
                    className="inline-flex items-center gap-1 rounded-full bg-neutral-900 px-2.5 py-0.5 text-[10px] font-bold text-white hover:bg-neutral-800 transition cursor-pointer"
                  >
                    <Sparkles className="h-2.5 w-2.5 text-amber-400" />
                    Plan {((store.plan as string) || 'FREE').toUpperCase()}
                  </button>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                  <span className="font-mono text-neutral-700 font-medium">{displayAddress}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-emerald-600" />
                    {store.phoneNumber ? `${store.countryCode || '+52'} ${store.phoneNumber}` : (
                      <button
                        onClick={onOpenPhoneSettings}
                        className="text-amber-700 font-semibold underline cursor-pointer"
                      >
                        Configurar WhatsApp
                      </button>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* View live catalog CTA */}
            <div className="flex items-center gap-2.5">
              <button
                id="btn-preview-catalog"
                onClick={onViewCatalog}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-800 shadow-xs hover:bg-neutral-50 transition cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5 text-neutral-500" />
                Ver Catálogo Digital
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6 flex overflow-x-auto border-b border-neutral-200 gap-1 sm:gap-2">
            <button
              id="tab-products"
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'products'
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:border-neutral-300'
              }`}
            >
              <Package className="h-4 w-4" />
              Productos & Inventario
            </button>

            <button
              id="tab-features"
              onClick={() => setActiveTab('features')}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'features'
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:border-neutral-300'
              }`}
            >
              <Sliders className="h-4 w-4" />
              Características & Filtros
            </button>

            <button
              id="tab-branding"
              onClick={() => setActiveTab('branding')}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'branding'
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:border-neutral-300'
              }`}
            >
              <Palette className="h-4 w-4" />
              Marca & Dominio
            </button>

            <button
              id="tab-qr"
              onClick={() => setActiveTab('qr')}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'qr'
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:border-neutral-300'
              }`}
            >
              <QrCode className="h-4 w-4" />
              Código QR & Afiche
            </button>

            <button
              id="tab-reviews"
              onClick={() => setActiveTab('reviews')}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'reviews'
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:border-neutral-300'
              }`}
            >
              <Star className="h-4 w-4" />
              Reseñas de Clientes
            </button>

            <button
              id="tab-subscription"
              onClick={() => setActiveTab('subscription')}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'subscription'
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:border-neutral-300'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              Planes & Facturación
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {activeTab === 'products' && (
          <ProductsTab
            store={store}
            onNavigateToSubscription={() => setActiveTab('subscription')}
          />
        )}
        {activeTab === 'features' && <FeaturesTab store={store} />}
        {activeTab === 'branding' && (
          <BrandingTab
            store={store}
            onStoreUpdated={onStoreUpdated}
            onNavigateToSubscription={() => setActiveTab('subscription')}
          />
        )}
        {activeTab === 'qr' && <QrTab store={store} />}
        {activeTab === 'reviews' && <ReviewsTab store={store} />}
        {activeTab === 'subscription' && (
          <SubscriptionTab store={store} onStoreUpdated={onStoreUpdated} />
        )}
      </main>
    </div>
  );
};
