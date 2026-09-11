import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, Check, X, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Store, Review } from '../../types.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface Props {
  store: Store;
}

export const ReviewsTab: React.FC<Props> = ({ store }) => {
  const { idToken } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const headers = idToken ? { Authorization: `Bearer ${idToken}` } : {};
      const res = await fetch(`/api/stores/${store.id}/reviews`, { headers });
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch (e) {
      console.error('Error fetching reviews:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [store.id, idToken]);

  const handleToggleApproval = async (review: Review) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      };
      const res = await fetch(`/api/stores/${store.id}/reviews/${review.id}/moderate`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ isApproved: !review.isApproved }),
      });

      if (res.ok) {
        const updated = await res.json();
        setReviews((prev) =>
          prev.map((r) => (r.id === review.id ? { ...r, isApproved: updated.isApproved } : r))
        );
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'No se pudo moderar la reseña.');
      }
    } catch (err: any) {
      console.error('Error moderating review:', err);
      alert('Error de conexión: ' + (err.message || ''));
    }
  };

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : '0.0';

  return (
    <div id="reviews-management-tab" className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">
            Reseñas & Opiniones de Clientes
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Modera y supervisa las valoraciones dejadas por tus compradores en los productos.
          </p>
        </div>

        {/* Rating badge */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-neutral-200 shadow-xs">
          <div className="flex items-center gap-1 text-amber-500">
            <Star className="h-5 w-5 fill-amber-400" />
            <span className="text-lg font-bold text-neutral-900">{avgRating}</span>
          </div>
          <span className="text-xs text-neutral-500">
            ({reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'})
          </span>
        </div>
      </div>

      {/* Reviews list */}
      {loading ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="mt-2 text-xs text-neutral-500">Cargando opiniones...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/50 p-12 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-neutral-400 mb-2" />
          <h3 className="text-sm font-bold text-neutral-900">Aún no hay opiniones</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            Cuando tus clientes visiten la vista de detalle de tus productos, podrán calificar y dejar comentarios.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className={`rounded-2xl border p-4 transition shadow-xs ${
                r.isApproved ? 'border-neutral-200 bg-white' : 'border-amber-200 bg-amber-50/40'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${
                          s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-semibold text-xs text-neutral-900">{r.authorName}</span>
                  <span className="text-[11px] text-neutral-400">
                    en <span className="font-medium text-neutral-700">{r.productName || 'Producto'}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      r.isApproved
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {r.isApproved ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    {r.isApproved ? 'Visible en catálogo' : 'Oculta / Pendiente'}
                  </span>

                  <button
                    onClick={() => handleToggleApproval(r)}
                    className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition"
                  >
                    {r.isApproved ? 'Ocultar' : 'Aprobar'}
                  </button>
                </div>
              </div>

              <p className="mt-2 text-xs text-neutral-700 leading-relaxed italic">
                &ldquo;{r.comment}&rdquo;
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
