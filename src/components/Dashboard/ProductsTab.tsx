import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Check,
  Eye,
  EyeOff,
  MoveUp,
  MoveDown,
  X,
  AlertTriangle,
  Sparkles,
  Upload,
  ArrowUpRight,
} from 'lucide-react';
import { Product, Store, Feature, SubscriptionPlan } from '../../types.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatStoreAddress } from '../../lib/domainConfig.ts';
import { PLAN_CONFIGS } from '../../lib/plans.ts';

interface Props {
  store: Store;
  onNavigateToSubscription?: () => void;
}

const SAMPLE_IMAGE_PRESETS = [
  'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
];

export const ProductsTab: React.FC<Props> = ({ store, onNavigateToSubscription }) => {
  const { idToken } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [selectedFeatureValueIds, setSelectedFeatureValueIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchProductsAndFeatures = async () => {
    setLoading(true);
    try {
      const headers = idToken ? { Authorization: `Bearer ${idToken}` } : {};

      // Fetch products
      const prodRes = await fetch(`/api/stores/${store.id}/products`, { headers });
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData);
      }

      // Fetch features for this store
      const featRes = await fetch(`/api/stores/${store.id}/features`, { headers });
      if (featRes.ok) {
        const featData = await featRes.json();
        setFeatures(featData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsAndFeatures();
  }, [store.id, idToken]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setPrice('');
    setSummary('');
    setDescription('');
    setIsActive(true);
    setImages([]);
    setNewImageUrl('');
    setSelectedFeatureValueIds([]);
    setIsModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setPrice(prod.price);
    setSummary(prod.summary || '');
    setDescription(prod.description || '');
    setIsActive(prod.isActive);
    setImages([...prod.images]);
    setNewImageUrl('');
    setSelectedFeatureValueIds([...prod.featureValueIds]);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (prod: Product) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      };
      const res = await fetch(`/api/stores/${store.id}/products/${prod.id}/toggle-active`, {
        method: 'PATCH',
        headers,
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === prod.id ? { ...p, isActive: !p.isActive } : p))
        );
      }
    } catch (e) {
      console.error('Error toggling status:', e);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const headers = idToken ? { Authorization: `Bearer ${idToken}` } : {};
      const res = await fetch(`/api/stores/${store.id}/products/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        setDeleteConfirmId(null);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'No se pudo eliminar el producto.');
      }
    } catch (e: any) {
      console.error('Error deleting product:', e);
      alert('Error de conexión al eliminar el producto: ' + (e.message || ''));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (images.length >= planConfig.maxImagesPerProduct) {
      alert(`Tu plan actual (${planConfig.name}) permite un máximo de ${planConfig.maxImagesPerProduct} imagen(es) por producto. Actualiza a Pro para añadir galería de fotos completa.`);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede exceder 5MB.');
      return;
    }

    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
          body: JSON.stringify({
            imageBase64: base64Data,
            fileData: base64Data,
            fileName: file.name,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          handleAddImage(data.url);
        } else {
          const err = await res.json().catch(() => ({}));
          alert(err.error || 'Error al subir la imagen.');
        }
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('Upload failed:', err);
      alert('Error al procesar el archivo.');
      setUploadingImage(false);
    }
  };

  const handleAddImage = (urlToAdd: string) => {
    const trimmed = urlToAdd.trim();
    if (!trimmed) return;
    if (images.length >= planConfig.maxImagesPerProduct) {
      alert(`Tu plan actual (${planConfig.name}) permite un máximo de ${planConfig.maxImagesPerProduct} imagen(es) por producto. Actualiza a Pro para galería de fotos.`);
      return;
    }
    if (!images.includes(trimmed)) {
      setImages([...images, trimmed]);
      setNewImageUrl('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    const newImgs = [...images];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newImgs.length) return;
    const temp = newImgs[index];
    newImgs[index] = newImgs[targetIdx];
    newImgs[targetIdx] = temp;
    setImages(newImgs);
  };

  const toggleFeatureValue = (valueId: number) => {
    if (selectedFeatureValueIds.includes(valueId)) {
      setSelectedFeatureValueIds(selectedFeatureValueIds.filter((id) => id !== valueId));
    } else {
      setSelectedFeatureValueIds([...selectedFeatureValueIds, valueId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) return;
    setSubmitting(true);

    const payload = {
      name: name.trim(),
      price: parseFloat(price).toFixed(2),
      summary: summary.trim(),
      description: description.trim(),
      isActive,
      images,
      featureValueIds: selectedFeatureValueIds,
    };

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      };

      if (editingProduct) {
        const res = await fetch(`/api/stores/${store.id}/products/${editingProduct.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = await res.json();
          setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          setIsModalOpen(false);
        } else {
          const err = await res.json().catch(() => ({}));
          alert(err.error || 'Error al actualizar el producto.');
        }
      } else {
        const res = await fetch(`/api/stores/${store.id}/products`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json();
          setProducts((prev) => [created, ...prev]);
          setIsModalOpen(false);
        } else {
          const err = await res.json().catch(() => ({}));
          alert(err.error || 'Error al guardar el nuevo producto.');
        }
      }
    } catch (err: any) {
      console.error('Save product failed:', err);
      alert('Error de conexión al guardar: ' + (err.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.summary && p.summary.toLowerCase().includes(search.toLowerCase()))
  );

  const currentPlan = (store.plan as SubscriptionPlan) || 'free';
  const planConfig = PLAN_CONFIGS[currentPlan] || PLAN_CONFIGS.free;
  const isAtProductLimit = planConfig.maxProducts !== -1 && products.length >= planConfig.maxProducts;

  const displayAddress = formatStoreAddress(store);

  return (
    <div id="products-management-tab" className="space-y-6">
      {/* Plan limit warning banner */}
      {isAtProductLimit && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                Límite de catálogo alcanzado ({products.length}/{planConfig.maxProducts} productos)
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Tu plan actual ({planConfig.name}) permite hasta {planConfig.maxProducts} artículos. Para agregar productos ilimitados y múltiples imágenes, actualiza al Plan Pro.
              </p>
            </div>
          </div>
          {onNavigateToSubscription && (
            <button
              onClick={onNavigateToSubscription}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 text-xs font-bold text-white hover:bg-neutral-800 transition shadow-xs shrink-0 cursor-pointer"
            >
              Ver Planes Pro
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-neutral-900">Productos del Catálogo</h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
              {products.length} {planConfig.maxProducts === -1 ? 'artículos' : `/ ${planConfig.maxProducts}`}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Administra los artículos visibles para tus clientes en <span className="font-mono">{displayAddress}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48 sm:w-64 rounded-xl border border-neutral-300 pl-9 pr-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 bg-white"
            />
          </div>

          <button
            id="btn-add-new-product"
            onClick={() => {
              if (isAtProductLimit && onNavigateToSubscription) {
                onNavigateToSubscription();
              } else {
                openCreateModal();
              }
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs transition shrink-0 cursor-pointer ${
              isAtProductLimit ? 'bg-amber-600 hover:bg-amber-700' : 'bg-neutral-900 hover:bg-neutral-800'
            }`}
          >
            {isAtProductLimit ? (
              <>
                <Sparkles className="h-4 w-4" />
                Actualizar para Añadir
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Nuevo Producto
              </>
            )}
          </button>
        </div>
      </div>

      {/* Products Table / Cards */}
      {loading ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="mt-2 text-xs text-neutral-500">Cargando inventario de la tienda...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/50 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-neutral-200 text-neutral-400 mb-3 shadow-xs">
            <ImageIcon className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-neutral-900">Aún no hay productos</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            Comienza agregando tu primer producto con fotos, precio y características personalizadas para que tus clientes puedan comprar por WhatsApp.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Crear primer producto
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-600">
              <thead className="bg-neutral-50 text-[11px] uppercase tracking-wider font-semibold text-neutral-500 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Precio</th>
                  <th className="px-4 py-3">Características</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredProducts.map((p) => {
                  const mainImage = p.images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=80';
                  return (
                    <tr key={p.id} className="hover:bg-neutral-50/70 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={mainImage}
                            alt={p.name}
                            referrerPolicy="no-referrer"
                            className="h-12 w-12 rounded-xl object-cover border border-neutral-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-neutral-900 truncate max-w-xs">{p.name}</p>
                            {p.summary && (
                              <p className="text-[11px] text-neutral-500 truncate max-w-xs">{p.summary}</p>
                            )}
                            <span className="text-[10px] text-neutral-400">
                              {p.images.length} {p.images.length === 1 ? 'imagen' : 'imágenes'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-neutral-900">
                        {store.currency || '$'} {p.price}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {p.featureValues && p.featureValues.length > 0 ? (
                            p.featureValues.slice(0, 3).map((fv) => (
                              <span
                                key={fv.id}
                                className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-700"
                              >
                                {fv.featureName ? `${fv.featureName}: ` : ''}{fv.value}
                              </span>
                            ))
                          ) : (
                            <span className="text-neutral-400 text-[11px] italic">Sin etiquetas</span>
                          )}
                          {p.featureValues && p.featureValues.length > 3 && (
                            <span className="text-[10px] text-neutral-400 font-medium self-center">
                              +{p.featureValues.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleActive(p)}
                          title={p.isActive ? 'Clic para ocultar del catálogo' : 'Clic para activar en el catálogo'}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold transition cursor-pointer ${
                            p.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-neutral-100 text-neutral-500 border border-neutral-200 hover:bg-neutral-200'
                          }`}
                        >
                          {p.isActive ? (
                            <>
                              <Eye className="h-3 w-3" />
                              Activo
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3" />
                              Oculto
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(p)}
                            title="Editar producto"
                            className="rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(p.id)}
                            title="Eliminar producto"
                            className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-neutral-900">¿Eliminar producto?</h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Esta acción eliminará el producto y sus imágenes del catálogo. No se puede deshacer.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-xl border border-neutral-300 px-3.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-700"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div id="product-editor-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  {editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}
                </h3>
                <p className="text-xs text-neutral-500">
                  {editingProduct ? 'Actualiza los datos del producto' : 'Agrega un nuevo artículo a tu catálogo'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                    Nombre del Producto *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Café Geisha Huatusco"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 px-3.5 py-2 text-xs text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                    Precio ({store.currency || '$'}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="18.50"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 px-3.5 py-2 text-xs text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Resumen Corto / Información adicional
                </label>
                <input
                  type="text"
                  placeholder="Ej: Notas de durazno blanco, bergamota y tueste medio para filtrados."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-3.5 py-2 text-xs text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                  Descripción Detallada
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe la procedencia, materiales, recomendaciones de uso o detalles de calidad..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-3.5 py-2 text-xs text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              {/* Multiple Images Gallery with Reordering */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                      Galería de Imágenes
                    </label>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
                      {images.length}/{planConfig.maxImagesPerProduct} fotos ({planConfig.name})
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-500">
                    La primera imagen será la foto de portada
                  </span>
                </div>

                {/* Input for new image or file upload */}
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <div className="flex-1 flex gap-2">
                    <input
                      type="url"
                      placeholder="URL de la imagen (ej: https://images.unsplash.com/...)"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      className="flex-1 rounded-xl border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 outline-none focus:border-neutral-900"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddImage(newImageUrl)}
                      disabled={!newImageUrl.trim()}
                      className="rounded-xl bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-700 disabled:opacity-40 transition"
                    >
                      Agregar URL
                    </button>
                  </div>

                  <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition shadow-2xs">
                    <Upload className="h-3.5 w-3.5 text-neutral-500" />
                    <span>{uploadingImage ? 'Subiendo...' : 'Subir archivo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Quick Unsplash presets for ease of testing */}
                <div className="mb-3">
                  <p className="text-[10px] uppercase font-semibold text-neutral-400 mb-1 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    O selecciona fotos de muestra rápidas:
                  </p>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {SAMPLE_IMAGE_PRESETS.map((pUrl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleAddImage(pUrl)}
                        className="h-10 w-10 shrink-0 rounded-lg overflow-hidden border border-neutral-200 hover:scale-105 transition"
                        title="Clic para agregar foto de muestra"
                      >
                        <img src={pUrl} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Added images list */}
                {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                    {images.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        className="relative group rounded-lg overflow-hidden border border-neutral-200 bg-white shadow-xs"
                      >
                        <img
                          src={imgUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="h-24 w-full object-cover"
                        />
                        {idx === 0 && (
                          <span className="absolute top-1 left-1 rounded bg-neutral-900/80 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
                            Principal
                          </span>
                        )}
                        <div className="absolute inset-0 bg-neutral-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMoveImage(idx, 'up')}
                              title="Mover al inicio"
                              className="rounded bg-white/90 p-1 text-neutral-800 hover:bg-white"
                            >
                              <MoveUp className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {idx < images.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleMoveImage(idx, 'down')}
                              title="Mover después"
                              className="rounded bg-white/90 p-1 text-neutral-800 hover:bg-white"
                            >
                              <MoveDown className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            title="Eliminar"
                            className="rounded bg-rose-600/90 p-1 text-white hover:bg-rose-600"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dynamic Features Assignment (Color, Talla, Categoría...) */}
              {features.length > 0 && (
                <div className="pt-2 border-t border-neutral-100">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-2">
                    Características & Atributos del Producto
                  </label>
                  <p className="text-[11px] text-neutral-500 mb-3">
                    Selecciona las etiquetas correspondientes. Estas opciones alimentan los filtros del catálogo público.
                  </p>

                  <div className="space-y-3 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                    {features.map((feat) => (
                      <div key={feat.id}>
                        <p className="text-xs font-bold text-neutral-800 mb-1.5">{feat.name}:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {feat.values && feat.values.length > 0 ? (
                            feat.values.map((v) => {
                              const isSelected = selectedFeatureValueIds.includes(v.id);
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => toggleFeatureValue(v.id)}
                                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                                    isSelected
                                      ? 'bg-neutral-900 text-white shadow-xs'
                                      : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                                  }`}
                                >
                                  {isSelected && <Check className="h-3 w-3" />}
                                  {v.value}
                                </button>
                              );
                            })
                          ) : (
                            <span className="text-[11px] text-neutral-400 italic">
                              Sin valores en la pestaña &quot;Características&quot;
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  id="product-active-checkbox"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                />
                <label htmlFor="product-active-checkbox" className="text-xs font-medium text-neutral-800 cursor-pointer">
                  Producto activo e inmediatamente visible en el catálogo público
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-neutral-300 px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Cancelar
                </button>
                <button
                  id="btn-submit-product-form"
                  type="submit"
                  disabled={submitting || !name.trim() || !price}
                  className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-neutral-800 disabled:opacity-50 transition"
                >
                  {submitting
                    ? 'Guardando...'
                    : editingProduct
                    ? 'Actualizar Producto'
                    : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
