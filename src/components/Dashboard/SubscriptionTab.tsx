import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  Check,
  Zap,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Building,
  Sparkles,
  ArrowRight,
  Globe,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Store, StoreSubscription, StoreUsageMetrics, SubscriptionPlan, PaymentGateway, BillingCycle } from '../../types.ts';
import { PLAN_CONFIGS } from '../../lib/plans.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface Props {
  store: Store;
  onStoreUpdated: (updatedStore: Store) => void;
}

export const SubscriptionTab: React.FC<Props> = ({ store, onStoreUpdated }) => {
  const { firebaseUser, user, loading: authLoading, getValidToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<StoreSubscription | null>(null);
  const [usage, setUsage] = useState<StoreUsageMetrics | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway>('stripe');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchSubscriptionData = async () => {
    // If Firebase is still resolving the initial user session, wait
    if (authLoading) {
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      const currentUser = firebaseUser || user;
      const isDemoStore = store.userUid === 'demo_merchant_uid_1';

      // If this is a private merchant store and user is not authenticated, show friendly notice
      if (!isDemoStore && !currentUser) {
        setLoading(false);
        setErrorMessage('Debes iniciar sesión con Google para ver y administrar la suscripción de este catálogo.');
        return;
      }

      const headers: Record<string, string> = {};
      if (currentUser) {
        const token = await getValidToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const res = await fetch(`/api/stores/${store.id}/subscription`, {
        headers,
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Tu sesión ha expirado o no es válida. Inicia sesión nuevamente.');
        } else if (res.status === 403) {
          throw new Error('No tienes permisos de administración para este catálogo.');
        } else if (res.status === 404) {
          throw new Error('El catálogo especificado no fue encontrado.');
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al cargar información de suscripción');
      }

      const data = await res.json();
      setSubscription(data.subscription);
      setUsage(data.usage);
    } catch (err: any) {
      console.error('[SubscriptionTab] fetchSubscriptionData error:', err);
      setErrorMessage(err.message || 'Error cargando datos de suscripción');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchSubscriptionData();
    }
  }, [store.id, authLoading, user?.uid]);

  const handleInitiateCheckout = async (planKey: SubscriptionPlan) => {
    try {
      setIsUpgrading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const currentUser = firebaseUser || user;
      const isDemoStore = store.userUid === 'demo_merchant_uid_1';

      if (!currentUser && !isDemoStore) {
        throw new Error('Debes iniciar sesión para actualizar tu plan de suscripción.');
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (currentUser) {
        const token = await getValidToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const res = await fetch(`/api/stores/${store.id}/subscription/checkout`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          plan: planKey,
          billingCycle,
          gateway: selectedGateway,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Sesión expirada. Inicia sesión con tu cuenta de Google.');
        } else if (res.status === 403) {
          throw new Error('No tienes permisos para modificar este catálogo.');
        }
        throw new Error(data.error || 'Error al iniciar checkout');
      }

      if (data.checkoutUrl) {
        // Redirect to real gateway checkout (Stripe, MercadoPago, Paddle)
        window.location.href = data.checkoutUrl;
      } else {
        setSuccessMessage(`Plan ${planKey.toUpperCase()} activado correctamente.`);
        await fetchSubscriptionData();
        onStoreUpdated({ ...store, plan: planKey });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error procesando solicitud');
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleDirectPlanChange = async (planKey: SubscriptionPlan) => {
    try {
      setIsUpgrading(true);
      setErrorMessage(null);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const currentUser = firebaseUser || user;
      if (currentUser) {
        const token = await getValidToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const res = await fetch(`/api/stores/${store.id}/subscription/plan`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ plan: planKey }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Sesión no autorizada. Por favor inicia sesión.');
        } else if (res.status === 403) {
          throw new Error('No tienes permisos para cambiar el plan de esta tienda.');
        }
        throw new Error(data.error || 'Error actualizando plan');
      }

      setSuccessMessage(`Plan actualizado exitosamente a ${planKey.toUpperCase()}`);
      setSubscription(data.subscription);
      setUsage(data.usage);
      onStoreUpdated({ ...store, plan: planKey });
    } catch (err: any) {
      setErrorMessage(err.message || 'Error cambiando plan');
    } finally {
      setIsUpgrading(false);
    }
  };

  const currentPlan = subscription?.plan || (store.plan as SubscriptionPlan) || 'free';
  const planInfo = PLAN_CONFIGS[currentPlan] || PLAN_CONFIGS.free;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 rounded-2xl border border-neutral-200 bg-white">
        <RefreshCw className="h-8 w-8 animate-spin text-neutral-400" />
        <p className="mt-3 text-sm font-semibold text-neutral-700">Cargando información de suscripción...</p>
        <p className="text-xs text-neutral-400 mt-1">Consultando estado del catálogo y cuotas vigentes</p>
      </div>
    );
  }

  return (
    <div id="subscription-tab" className="space-y-8 max-w-6xl mx-auto py-4">
      {/* Status Alerts */}
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800 font-medium">{errorMessage}</p>
            <button
              onClick={fetchSubscriptionData}
              className="mt-2 text-xs font-bold text-red-700 hover:text-red-900 underline cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-800 font-medium">{successMessage}</p>
        </div>
      )}

      {/* Header & Current Overview */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-neutral-100">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Plan {planInfo.name}
              </span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                subscription?.status === 'active'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-neutral-100 text-neutral-700'
              }`}>
                {subscription?.status === 'active' ? 'Suscripción Activa' : 'Plan Base'}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 mt-2">
              Gestión de Facturación y Capacidades
            </h2>
            <p className="text-sm text-neutral-500 mt-1">
              Controla las cuotas de tu catálogo digital, métodos de pago y planes de crecimiento.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchSubscriptionData}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Sincronizar
            </button>
          </div>
        </div>

        {/* Quota & Usage Progress */}
        {usage && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-600 mb-2">
                <span className="flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-neutral-800" />
                  Productos en Catálogo
                </span>
                <span className="font-mono text-neutral-900">
                  {usage.currentProductCount} / {usage.maxProducts === -1 ? '∞ Ilimitado' : usage.maxProducts}
                </span>
              </div>
              <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    usage.maxProducts !== -1 && usage.currentProductCount >= usage.maxProducts
                      ? 'bg-red-500'
                      : 'bg-neutral-900'
                  }`}
                  style={{
                    width:
                      usage.maxProducts === -1
                        ? '20%'
                        : `${Math.min(100, (usage.currentProductCount / usage.maxProducts) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-neutral-500 mt-2">
                {usage.canAddProduct
                  ? 'Tienes capacidad disponible para añadir artículos.'
                  : 'Límite alcanzado. Actualiza a Pro para catálogo ilimitado.'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-600 mb-2">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-neutral-800" />
                  Imágenes por Producto
                </span>
                <span className="font-mono text-neutral-900">
                  {usage.maxImagesPerProduct === -1 ? 'Ilimitadas' : `Hasta ${usage.maxImagesPerProduct}`}
                </span>
              </div>
              <p className="text-xs text-neutral-700 font-medium">
                {usage.maxImagesPerProduct === 1
                  ? '1 imagen principal por producto en plan Gratuito.'
                  : 'Galería multi-foto activa.'}
              </p>
              <p className="text-[11px] text-neutral-500 mt-1">
                Almacenamiento CDN optimizado.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-600 mb-2">
                <span className="flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-neutral-800" />
                  Dominio Web
                </span>
                <span className={`text-xs font-bold ${usage.customDomainEnabled ? 'text-emerald-700' : 'text-neutral-600'}`}>
                  {usage.customDomainEnabled ? 'Personalizado Habilitado' : 'Subdominio Incluido'}
                </span>
              </div>
              <p className="text-xs font-mono text-neutral-800 truncate">
                {store.customDomain || `${store.subdomain}.catalogo.app`}
              </p>
              <p className="text-[11px] text-neutral-500 mt-1">
                {usage.customDomainEnabled
                  ? 'Listo para conectar tu propio dominio .com'
                  : 'Requiere plan Pro o Business para dominio propio.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Gateway & Billing Cycle Selector */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-neutral-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Pasarela de Pago:</span>
          <div className="flex rounded-xl bg-neutral-100 p-1 border border-neutral-200">
            <button
              onClick={() => setSelectedGateway('stripe')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                selectedGateway === 'stripe'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Stripe (Global)
            </button>
            <button
              onClick={() => setSelectedGateway('mercadopago')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                selectedGateway === 'mercadopago'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              MercadoPago (Latam)
            </button>
            <button
              onClick={() => setSelectedGateway('paddle')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                selectedGateway === 'paddle'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Paddle (MoR)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Facturación:</span>
          <div className="flex rounded-xl bg-neutral-100 p-1 border border-neutral-200">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                billingCycle === 'yearly'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Anual
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                -20%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Plan Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(Object.keys(PLAN_CONFIGS) as SubscriptionPlan[]).map((planKey) => {
          const plan = PLAN_CONFIGS[planKey];
          const isCurrent = currentPlan === planKey;
          const price =
            billingCycle === 'monthly'
              ? plan.priceMonthly
              : Math.round(plan.priceYearly / 12);

          return (
            <div
              key={planKey}
              className={`rounded-2xl border bg-white p-6 flex flex-col justify-between transition-all ${
                isCurrent
                  ? 'border-neutral-900 shadow-md ring-1 ring-neutral-900'
                  : 'border-neutral-200 hover:border-neutral-300 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-neutral-900">{plan.name}</h3>
                  {isCurrent ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-300">
                      Plan Actual
                    </span>
                  ) : plan.badge ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                      {plan.badge}
                    </span>
                  ) : null}
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-neutral-900">
                      ${price}
                    </span>
                    <span className="text-xs text-neutral-500 font-medium">
                      USD / mes
                    </span>
                  </div>
                  {billingCycle === 'yearly' && plan.priceYearly > 0 && (
                    <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                      Facturado anualmente (${plan.priceYearly} USD/año)
                    </p>
                  )}
                </div>

                <p className="text-xs text-neutral-600 mb-6">{plan.description}</p>

                <div className="space-y-3 border-t border-neutral-100 pt-5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-2">
                    Incluye:
                  </span>
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-neutral-700">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-neutral-100 space-y-2">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-neutral-500 bg-neutral-100 cursor-not-allowed text-center"
                  >
                    Tu Plan Activo
                  </button>
                ) : (
                  <>
                    <button
                      disabled={isUpgrading}
                      onClick={() => handleInitiateCheckout(planKey)}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isUpgrading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4" />
                          Suscribirse con {selectedGateway.toUpperCase()}
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={isUpgrading}
                      onClick={() => handleDirectPlanChange(planKey)}
                      className="w-full py-1.5 px-3 rounded-lg text-[11px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition text-center cursor-pointer"
                    >
                      Activar directamente (Demo / Sandbox)
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Production Integration Architecture Guide */}
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Arquitectura de Pagos Multi-Pasarela
        </div>
        <p className="text-xs text-neutral-600 leading-relaxed">
          El sistema cuenta con controladores de checkout independientes y webhooks idempotentes preparados para{' '}
          <strong className="text-neutral-900">Stripe</strong>, <strong className="text-neutral-900">MercadoPago</strong> y{' '}
          <strong className="text-neutral-900">Paddle</strong>. Los límites de productos y dominios se verifican en tiempo real en la capa de base de datos y en las rutas de API.
        </p>
      </div>
    </div>
  );
};
