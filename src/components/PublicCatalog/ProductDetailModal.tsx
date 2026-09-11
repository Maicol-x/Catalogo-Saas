import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  Star,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Send,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { Product, Store, Review } from '../../types.ts';
import { generateWhatsAppLink } from '../../lib/countryCodes.ts';

interface Props {
  product: Product | null;
  store: Store;
  onClose: () => void;
  onSelectSimilarProduct: (prod: Product) => void;
  allProducts: Product[];
}

export const ProductDetailModal: React.FC<Props> = ({
  product,
  store,
  onClose,
  onSelectSimilarProduct,
  allProducts,
}) => {
  if (!product) return null;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // New review form
  const [authorName, setAuthorName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const images = product.images.length > 0
    ? product.images
    : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'];

  // Reset image index when product changes
  useEffect(() => {
    setActiveImageIndex(0);
    setQuantity(1);
    setReviewSubmitted(false);
    fetchReviews();
  }, [product.id]);

  const fetchReviews = async () => {
    setLoadingReviews(true);
    try {
      const res = await fetch(`/api/catalog/${store.subdomain}/products/${product.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.product?.reviews) {
          setReviews(data.product.reviews);
        }
      }
    } catch (e) {
      console.error('Failed to fetch reviews:', e);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !comment.trim()) return;

    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/catalog/${store.subdomain}/products/${product.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: authorName.trim(),
          rating,
          comment: comment.trim(),
        }),
      });

      if (res.ok) {
        const created = await res.json();
        if (created.isApproved) {
          setReviews((prev) => [created, ...prev]);
        }
        setAuthorName('');
        setComment('');
        setRating(5);
        setReviewSubmitted(true);
      }
    } catch (e) {
      console.error('Submit review error:', e);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Find similar products based on shared feature values or store products
  const currentFeatureValueIds = new Set(product.featureValueIds || []);
  const similarProducts = allProducts
    .filter((p) => p.id !== product.id && p.isActive)
    .map((p) => {
      const commonCount = (p.featureValueIds || []).filter((id) => currentFeatureValueIds.has(id)).length;
      return { product: p, commonCount };
    })
    .sort((a, b) => b.commonCount - a.commonCount)
    .slice(0, 3)
    .map((item) => item.product);

  const selectedOptionsSummary = product.featureValues?.map((fv) => fv.value).join(', ');

  const whatsAppUrl = generateWhatsAppLink({
    countryCode: store.countryCode,
    phoneNumber: store.phoneNumber,
    storeName: store.name,
    productName: product.name,
    price: product.price,
    currency: store.currency || 'USD',
    quantity,
    optionsText: selectedOptionsSummary,
  });

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  return (
    <div
      id="product-detail-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: store.font || 'inherit' }}
      >
        {/* Top Header close button */}
        <div className="relative flex items-center justify-between p-4 sm:p-5 border-b border-neutral-100 bg-neutral-50/60">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: store.primaryColor }} />
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              {store.name}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="p-4 sm:p-8 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Left: Gallery (5 cols) */}
            <div className="md:col-span-6 space-y-4">
              {/* Main Photo View */}
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200 shadow-xs group">
                <img
                  src={images[activeImageIndex]}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Arrows if multiple images */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setActiveImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
                      }
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 text-neutral-800 shadow-md backdrop-blur-xs hover:bg-white transition"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() =>
                        setActiveImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 text-neutral-800 shadow-md backdrop-blur-xs hover:bg-white transition"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}

                {/* Page dots indicator */}
                {images.length > 1 && (
                  <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/40 px-2 py-1 rounded-full backdrop-blur-xs">
                    {images.map((_, idx) => (
                      <span
                        key={idx}
                        className={`h-1.5 w-1.5 rounded-full transition ${
                          idx === activeImageIndex ? 'bg-white w-3' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Thumbnails row */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`h-16 w-16 shrink-0 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                        idx === activeImageIndex
                          ? 'border-neutral-900 ring-2 ring-neutral-900/10'
                          : 'border-neutral-200 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={img}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Info, Price, WhatsApp action (6 cols) */}
            <div className="md:col-span-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                {/* Feature Pills */}
                {product.featureValues && product.featureValues.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {product.featureValues.map((fv) => (
                      <span
                        key={fv.id}
                        className="inline-flex items-center rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-800"
                      >
                        {fv.featureName ? `${fv.featureName}: ` : ''}{fv.value}
                      </span>
                    ))}
                  </div>
                )}

                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight leading-tight">
                    {product.name}
                  </h1>
                  {product.summary && (
                    <p className="mt-1 text-sm text-neutral-600 leading-relaxed font-medium">
                      {product.summary}
                    </p>
                  )}
                </div>

                {/* Rating line */}
                {avgRating && (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-600">
                    <div className="flex items-center text-amber-500">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-3.5 w-3.5 ${
                            s <= Math.round(Number(avgRating))
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-neutral-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-neutral-900">{avgRating}</span>
                    <span className="text-neutral-400">({reviews.length} opiniones)</span>
                  </div>
                )}

                {/* Price */}
                <div className="pt-2">
                  <span className="text-xs uppercase font-semibold text-neutral-400 tracking-wider">
                    Precio unitario
                  </span>
                  <div className="text-3xl font-black text-neutral-900 tracking-tight">
                    {store.currency || '$'} {product.price}
                  </div>
                </div>

                {/* Full Description */}
                {product.description && (
                  <div className="pt-2 border-t border-neutral-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                      Descripción del artículo
                    </h4>
                    <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed whitespace-pre-line">
                      {product.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Purchase Box */}
              <div className="pt-4 border-t border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-700">Cantidad a pedir:</label>
                  <div className="flex items-center rounded-xl border border-neutral-300 bg-neutral-50 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-1.5 text-sm font-bold text-neutral-700 hover:bg-neutral-200 transition"
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-bold text-xs text-neutral-900 bg-white py-1.5">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-3 py-1.5 text-sm font-bold text-neutral-700 hover:bg-neutral-200 transition"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* WhatsApp button */}
                {whatsAppUrl ? (
                  <a
                    href={whatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2.5 rounded-2xl py-3.5 px-6 text-sm font-bold text-white shadow-lg transition hover:scale-[1.01] active:scale-[0.99]"
                    style={{ backgroundColor: store.primaryColor || '#10b981' }}
                  >
                    <Phone className="h-4 w-4" />
                    <span>Comprar por WhatsApp</span>
                    {quantity > 1 && (
                      <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                        {store.currency || '$'} {(parseFloat(product.price) * quantity).toFixed(2)}
                      </span>
                    )}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      alert(
                        'Este comercio aún no tiene configurado un número de WhatsApp válido para recibir pedidos.'
                      )
                    }
                    className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 px-6 text-sm font-bold text-neutral-400 bg-neutral-100 hover:bg-neutral-200 transition"
                  >
                    <Phone className="h-4 w-4" />
                    <span>WhatsApp no configurado</span>
                  </button>
                )}

                <p className="text-[11px] text-center text-neutral-400">
                  Te conectarás directamente con la línea oficial de <strong>{store.name}</strong> para coordinar entrega y pago.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Customer Reviews */}
          <div className="mt-12 pt-8 border-t border-neutral-200 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-neutral-900">Opiniones de Compradores</h3>
                <p className="text-xs text-neutral-500">Experiencias reales de clientes con este producto</p>
              </div>
            </div>

            {/* Submit a review form */}
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-5">
              {reviewSubmitted ? (
                <div className="text-center py-2 text-emerald-700">
                  <p className="font-semibold text-sm">¡Muchas gracias por tu valoración!</p>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    Tu reseña ha sido enviada con éxito y será visible tan pronto como sea aprobada por la tienda.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleCreateReview} className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Deja tu valoración sobre este producto
                  </h4>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-600 font-medium">Calificación:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setRating(s)}
                          className="p-0.5 hover:scale-110 transition"
                        >
                          <Star
                            className={`h-5 w-5 ${
                              s <= rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Tu nombre (ej: Laura M.)"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 outline-none focus:border-neutral-900"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Tu comentario o experiencia con el producto..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingReview || !authorName.trim() || !comment.trim()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 transition"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {submittingReview ? 'Enviando...' : 'Publicar Reseña'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Reviews display */}
            <div className="space-y-3">
              {reviews.length === 0 ? (
                <p className="text-xs text-neutral-400 italic">
                  Aún no hay reseñas para este artículo. ¡Sé el primero en calificarlo!
                </p>
              ) : (
                reviews.map((rev) => (
                  <div key={rev.id} className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-neutral-900">{rev.authorName}</span>
                      <div className="flex items-center text-amber-500">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-3 w-3 ${
                              s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs text-neutral-600 leading-relaxed italic">
                      &ldquo;{rev.comment}&rdquo;
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section: Similar Products */}
          {similarProducts.length > 0 && (
            <div className="mt-12 pt-8 border-t border-neutral-200 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h3 className="text-base font-bold text-neutral-900">Productos Relacionados</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {similarProducts.map((simProd) => {
                  const simImg = simProd.images[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop&q=80';
                  return (
                    <div
                      key={simProd.id}
                      onClick={() => onSelectSimilarProduct(simProd)}
                      className="group cursor-pointer rounded-2xl border border-neutral-200 p-3 hover:border-neutral-400 transition bg-white shadow-2xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="aspect-square w-full rounded-xl overflow-hidden bg-neutral-100 mb-2.5">
                          <img
                            src={simImg}
                            alt={simProd.name}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        </div>
                        <p className="font-bold text-xs text-neutral-900 truncate">{simProd.name}</p>
                        <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">
                          {simProd.summary || ''}
                        </p>
                      </div>
                      <p className="mt-2 text-xs font-extrabold text-neutral-900">
                        {store.currency || '$'} {simProd.price}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
