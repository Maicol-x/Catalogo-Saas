import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Phone,
  QrCode,
  Share2,
  ExternalLink,
  ChevronDown,
  X,
  Sparkles,
  ShoppingBag,
  Check,
  Copy,
} from 'lucide-react';
import { Store, Product, Feature } from '../../types.ts';
import { generateWhatsAppLink } from '../../lib/countryCodes.ts';
import { ProductDetailModal } from './ProductDetailModal.tsx';
import QRCode from 'qrcode';

interface Props {
  store: Store;
}

export const PublicCatalogView: React.FC<Props> = ({ store }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFeatureValueIds, setSelectedFeatureValueIds] = useState<number[]>([]);

  // Modals
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  const catalogUrl = `https://${store.subdomain}.catalogo.app`;

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/catalog/${store.subdomain}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setFeatures(data.features || []);
      }
    } catch (err) {
      console.error('Failed to load catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [store.subdomain]);

  useEffect(() => {
    QRCode.toDataURL(catalogUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: store.primaryColor || '#000000',
        light: '#ffffff',
      },
    }).then(setQrCodeDataUrl);
  }, [catalogUrl, store.primaryColor]);

  // Client-side instant filtering
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search match
      const matchSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.summary && p.summary.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchSearch) return false;

      // Dynamic features match
      if (selectedFeatureValueIds.length > 0) {
        const prodFeatureIds = new Set(p.featureValueIds || []);
        const hasAllSelected = selectedFeatureValueIds.every((id) => prodFeatureIds.has(id));
        if (!hasAllSelected) return false;
      }

      return true;
    });
  }, [products, searchQuery, selectedFeatureValueIds]);

  const toggleFeatureValue = (valId: number) => {
    if (selectedFeatureValueIds.includes(valId)) {
      setSelectedFeatureValueIds(selectedFeatureValueIds.filter((id) => id !== valId));
    } else {
      setSelectedFeatureValueIds([...selectedFeatureValueIds, valId]);
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedFeatureValueIds([]);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(catalogUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div
      id="public-catalog-container"
      className="min-h-screen transition-colors duration-200"
      style={{
        backgroundColor: store.backgroundColor || '#fafafa',
        fontFamily: store.font || 'inherit',
      }}
    >
      {/* Simulated Subdomain Browser Bar */}
      <div className="bg-neutral-900 text-white px-4 py-2 border-b border-neutral-800 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-neutral-400">Catálogo Público Multi-tenant:</span>
            <span className="font-mono font-bold text-amber-400">{catalogUrl}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1 text-neutral-300 hover:text-white transition cursor-pointer"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedLink ? '¡Enlace copiado!' : 'Copiar URL'}</span>
            </button>
            <button
              onClick={() => setShowQrModal(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-neutral-800 px-2.5 py-1 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 transition cursor-pointer"
            >
              <QrCode className="h-3.5 w-3.5" />
              Ver Código QR
            </button>
          </div>
        </div>
      </div>

      {/* Hero Cover Banner if present */}
      {store.coverUrl && (
        <div className="relative h-48 sm:h-64 w-full overflow-hidden bg-neutral-900">
          <img
            src={store.coverUrl}
            alt={store.name}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}

      {/* Catalog Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-neutral-200">
          <div className="flex items-start sm:items-center gap-4">
            {store.logoUrl ? (
              <img
                src={store.logoUrl}
                alt={store.name}
                referrerPolicy="no-referrer"
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover border-2 border-white shadow-md shrink-0"
              />
            ) : (
              <div
                className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl font-black text-2xl text-white shadow-md shrink-0"
                style={{ backgroundColor: store.primaryColor || '#09090b' }}
              >
                {store.name[0]}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                  {store.name}
                </h1>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-neutral-600 max-w-xl leading-relaxed">
                {store.welcomeMessage || 'Explora nuestros productos y haz tus pedidos al instante por WhatsApp.'}
              </p>
            </div>
          </div>

          {/* WhatsApp Direct Link CTA */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href={`https://wa.me/${store.phoneNumber || ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-md transition hover:scale-105 active:scale-95"
              style={{ backgroundColor: store.primaryColor || '#10b981' }}
            >
              <Phone className="h-4 w-4" />
              <span>Contactar por WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Search & Dynamic Filter Controls */}
        <div className="mt-8 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar en el catálogo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-neutral-300 bg-white pl-10 pr-4 py-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 outline-none shadow-xs focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Results count & clear */}
            <div className="flex items-center gap-3 text-xs text-neutral-500 w-full sm:w-auto justify-between sm:justify-end">
              <span>
                Mostrando <strong>{filteredProducts.length}</strong> de {products.length} productos
              </span>
              {(searchQuery || selectedFeatureValueIds.length > 0) && (
                <button
                  onClick={clearAllFilters}
                  className="font-semibold text-neutral-800 hover:underline cursor-pointer"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>

          {/* Dynamic Feature Filters Bar */}
          {features.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-700 mr-1">
                <Filter className="h-3.5 w-3.5 text-neutral-500" />
                Filtros:
              </div>

              {features.map((feat) => {
                if (!feat.values || feat.values.length === 0) return null;
                return (
                  <div key={feat.id} className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider ml-1">
                      {feat.name}:
                    </span>
                    {feat.values.map((v) => {
                      const isSelected = selectedFeatureValueIds.includes(v.id);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => toggleFeatureValue(v.id)}
                          className={`rounded-xl px-3 py-1 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                            isSelected
                              ? 'bg-neutral-900 text-white shadow-xs'
                              : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                          {v.value}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Product Cards Grid */}
        <div className="mt-8">
          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-3 border-neutral-900 border-t-transparent" />
              <p className="mt-3 text-xs text-neutral-500 font-medium">Cargando catálogo...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center rounded-3xl border border-dashed border-neutral-300 bg-white/60 p-8">
              <ShoppingBag className="mx-auto h-10 w-10 text-neutral-400 mb-2" />
              <h3 className="text-base font-bold text-neutral-900">No encontramos productos</h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                No hay artículos que coincidan con tu búsqueda o filtros seleccionados.
              </p>
              <button
                onClick={clearAllFilters}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition"
              >
                Restablecer filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((prod) => {
                const mainImg =
                  prod.images[0] ||
                  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';

                const prodWhatsAppUrl = generateWhatsAppLink({
                  countryCode: store.countryCode,
                  phoneNumber: store.phoneNumber,
                  storeName: store.name,
                  productName: prod.name,
                  price: prod.price,
                  currency: store.currency || 'USD',
                  quantity: 1,
                  optionsText: prod.featureValues?.map((f) => f.value).join(', '),
                });

                return (
                  <div
                    key={prod.id}
                    id={`product-card-${prod.id}`}
                    onClick={() => setSelectedProduct(prod)}
                    className="group rounded-3xl border border-neutral-200/80 bg-white p-4 shadow-xs transition-all duration-200 hover:shadow-lg hover:border-neutral-300 cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      {/* Image container with subtle hover zoom */}
                      <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-neutral-100 mb-3.5">
                        <img
                          src={mainImg}
                          alt={prod.name}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {prod.images.length > 1 && (
                          <span className="absolute bottom-2 right-2 rounded-lg bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-white">
                            +{prod.images.length - 1} fotos
                          </span>
                        )}
                      </div>

                      {/* Feature Tags */}
                      {prod.featureValues && prod.featureValues.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {prod.featureValues.slice(0, 3).map((fv) => (
                            <span
                              key={fv.id}
                              className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-700"
                            >
                              {fv.value}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Title & summary */}
                      <h3 className="font-bold text-sm text-neutral-900 group-hover:text-neutral-700 transition line-clamp-1">
                        {prod.name}
                      </h3>
                      {prod.summary && (
                        <p className="mt-1 text-xs text-neutral-500 line-clamp-2 leading-relaxed font-normal">
                          {prod.summary}
                        </p>
                      )}
                    </div>

                    {/* Price & WhatsApp Button */}
                    <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-neutral-400 block leading-none">
                          Precio
                        </span>
                        <span className="text-base font-black text-neutral-900">
                          {store.currency || '$'} {prod.price}
                        </span>
                      </div>

                      <a
                        href={prodWhatsAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Comprar directo por WhatsApp"
                        className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:scale-105 active:scale-95 shrink-0"
                        style={{ backgroundColor: store.primaryColor || '#10b981' }}
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span>Pedir</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          store={store}
          allProducts={products}
          onClose={() => setSelectedProduct(null)}
          onSelectSimilarProduct={(sim) => setSelectedProduct(sim)}
        />
      )}

      {/* Floating QR Modal for Mobile Visitors */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-neutral-200 text-center animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 mb-3 border-b border-neutral-100">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Código QR del Catálogo
              </span>
              <button
                onClick={() => setShowQrModal(false)}
                className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <h3 className="text-base font-bold text-neutral-900">{store.name}</h3>
            <p className="text-xs text-neutral-500 mt-0.5 font-mono">{catalogUrl}</p>

            <div className="my-4 mx-auto w-52 h-52 p-2 bg-white rounded-2xl border border-neutral-200 shadow-xs flex items-center justify-center">
              {qrCodeDataUrl && (
                <img src={qrCodeDataUrl} alt="QR Code" className="w-full h-full object-contain" />
              )}
            </div>

            <p className="text-xs text-neutral-600">
              Escanea con tu celular para abrir este catálogo móvil y pedir por WhatsApp.
            </p>

            <button
              onClick={handleCopyLink}
              className="mt-4 w-full rounded-xl bg-neutral-900 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 transition"
            >
              {copiedLink ? '¡Enlace copiado!' : 'Copiar enlace al portapapeles'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
