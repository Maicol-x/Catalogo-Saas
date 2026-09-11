import React, { useState, useEffect } from 'react';
import { Plus, Tag, Trash2, X, Sparkles, Filter, Check } from 'lucide-react';
import { Store, Feature } from '../../types.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface Props {
  store: Store;
}

export const FeaturesTab: React.FC<Props> = ({ store }) => {
  const { idToken } = useAuth();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);

  // New feature form
  const [newFeatureName, setNewFeatureName] = useState('');
  const [initialValuesInput, setInitialValuesInput] = useState('');
  const [creatingFeature, setCreatingFeature] = useState(false);

  // New value to existing feature
  const [activeFeatureForValue, setActiveFeatureForValue] = useState<number | null>(null);
  const [newValueText, setNewValueText] = useState('');

  const fetchFeatures = async () => {
    setLoading(true);
    try {
      const headers = idToken ? { Authorization: `Bearer ${idToken}` } : {};
      const res = await fetch(`/api/stores/${store.id}/features`, { headers });
      if (res.ok) {
        const data = await res.json();
        setFeatures(data);
      }
    } catch (e) {
      console.error('Error fetching features:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, [store.id, idToken]);

  const handleCreateFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeatureName.trim()) return;
    setCreatingFeature(true);

    const initialValues = initialValuesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      };
      const res = await fetch(`/api/stores/${store.id}/features`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newFeatureName.trim(),
          values: initialValues,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setFeatures([...features, created]);
        setNewFeatureName('');
        setInitialValuesInput('');
      }
    } catch (err) {
      console.error('Create feature error:', err);
    } finally {
      setCreatingFeature(false);
    }
  };

  const handleDeleteFeature = async (featureId: number) => {
    if (!confirm('¿Eliminar esta característica? Se desvinculará de los productos que la usen.')) return;
    try {
      const headers = idToken ? { Authorization: `Bearer ${idToken}` } : {};
      const res = await fetch(`/api/stores/${store.id}/features/${featureId}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        setFeatures(features.filter((f) => f.id !== featureId));
      }
    } catch (err) {
      console.error('Delete feature error:', err);
    }
  };

  const handleAddValue = async (featureId: number) => {
    if (!newValueText.trim()) return;
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      };
      const res = await fetch(`/api/stores/${store.id}/features/${featureId}/values`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ value: newValueText.trim() }),
      });

      if (res.ok) {
        const added = await res.json();
        setFeatures((prev) =>
          prev.map((f) =>
            f.id === featureId ? { ...f, values: [...(f.values || []), added] } : f
          )
        );
        setNewValueText('');
        setActiveFeatureForValue(null);
      }
    } catch (err) {
      console.error('Add value error:', err);
    }
  };

  const handleDeleteValue = async (featureId: number, valueId: number) => {
    try {
      const headers = idToken ? { Authorization: `Bearer ${idToken}` } : {};
      const res = await fetch(`/api/stores/${store.id}/features/values/${valueId}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        setFeatures((prev) =>
          prev.map((f) =>
            f.id === featureId
              ? { ...f, values: f.values.filter((v) => v.id !== valueId) }
              : f
          )
        );
      }
    } catch (err) {
      console.error('Delete value error:', err);
    }
  };

  return (
    <div id="features-management-tab" className="space-y-6">
      {/* Explanation Banner */}
      <div className="rounded-2xl border border-neutral-200 bg-neutral-900 text-white p-5 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-800 text-amber-400 border border-neutral-700">
            <Filter className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Sistema de Filtros Dinámicos</h3>
            <p className="mt-1 text-xs text-neutral-300 leading-relaxed max-w-2xl">
              Crea atributos personalizados como <strong>&quot;Color&quot;</strong>, <strong>&quot;Talla&quot;</strong>, <strong>&quot;Tueste&quot;</strong> o <strong>&quot;Material&quot;</strong>. Al asignar valores a tus productos, el catálogo público generará automáticamente filtros interactivos para que tus clientes encuentren lo que buscan al instante.
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Create Feature + Current Features */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Creator Card */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs h-fit">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="h-4 w-4 text-neutral-900" />
            <h3 className="text-sm font-bold text-neutral-900">Nueva Característica</h3>
          </div>
          <p className="text-xs text-neutral-500 mb-4">
            Define un nuevo atributo para agrupar y filtrar tus artículos.
          </p>

          <form onSubmit={handleCreateFeature} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                Nombre del atributo *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Color, Talla, Material..."
                value={newFeatureName}
                onChange={(e) => setNewFeatureName(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                Valores iniciales (separados por coma)
              </label>
              <input
                type="text"
                placeholder="Ej: Rojo, Azul, Verde, Negro"
                value={initialValuesInput}
                onChange={(e) => setInitialValuesInput(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                También podrás agregar o remover valores individuales más adelante.
              </p>
            </div>

            <button
              id="btn-create-feature"
              type="submit"
              disabled={creatingFeature || !newFeatureName.trim()}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-neutral-800 disabled:opacity-50 transition"
            >
              <Plus className="h-4 w-4" />
              {creatingFeature ? 'Creando...' : 'Crear Característica'}
            </button>
          </form>

          {/* Quick suggestions */}
          <div className="mt-5 pt-4 border-t border-neutral-100">
            <p className="text-[10px] uppercase font-semibold text-neutral-400 mb-2 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Sugerencias comunes:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {['Color', 'Talla', 'Material', 'Categoría', 'Acabado'].map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setNewFeatureName(sug)}
                  className="rounded-lg bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-200 transition"
                >
                  +{sug}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Existing Features List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-900">
              Características configuradas ({features.length})
            </h3>
            <span className="text-xs text-neutral-500">
              Generan los filtros dinámicos en el catálogo
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
              <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
              <p className="mt-2 text-xs text-neutral-500">Cargando características...</p>
            </div>
          ) : features.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
              <Tag className="mx-auto h-8 w-8 text-neutral-400 mb-2" />
              <p className="text-xs font-semibold text-neutral-800">No hay características definidas</p>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Crea una a la izquierda (ej: &quot;Color&quot; con valores &quot;Negro&quot;, &quot;Blanco&quot;).
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {features.map((feat) => (
                <div
                  key={feat.id}
                  className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs transition hover:border-neutral-300"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-neutral-900" />
                      <h4 className="font-bold text-xs text-neutral-900 tracking-tight">
                        {feat.name}
                      </h4>
                      <span className="text-[10px] text-neutral-400">
                        ({feat.values?.length || 0} valores)
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteFeature(feat.id)}
                      title="Eliminar característica"
                      className="rounded-lg p-1 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Values tags */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {feat.values && feat.values.length > 0 ? (
                      feat.values.map((val) => (
                        <span
                          key={val.id}
                          className="group inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-800 shadow-2xs"
                        >
                          {val.value}
                          <button
                            type="button"
                            onClick={() => handleDeleteValue(feat.id, val.id)}
                            className="rounded p-0.5 text-neutral-400 hover:bg-neutral-200 hover:text-rose-600 transition"
                            title="Eliminar valor"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-neutral-400 italic">
                        Sin valores asignados
                      </span>
                    )}

                    {/* Add value inline */}
                    {activeFeatureForValue === feat.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="Nuevo valor..."
                          value={newValueText}
                          onChange={(e) => setNewValueText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddValue(feat.id)}
                          autoFocus
                          className="rounded-lg border border-neutral-300 px-2 py-1 text-xs text-neutral-900 outline-none w-28 focus:border-neutral-900"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddValue(feat.id)}
                          className="rounded-lg bg-neutral-900 px-2 py-1 text-xs font-semibold text-white hover:bg-neutral-800"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveFeatureForValue(null);
                            setNewValueText('');
                          }}
                          className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveFeatureForValue(feat.id);
                          setNewValueText('');
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-dashed border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 transition"
                      >
                        <Plus className="h-3 w-3" />
                        Agregar valor
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
