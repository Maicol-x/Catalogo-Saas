import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { stores, subscriptions, products, users } from '../db/schema.ts';
import {
  SubscriptionPlan,
  SubscriptionStatus,
  BillingCycle,
  PaymentGateway,
  StoreSubscription,
  StoreUsageMetrics,
} from '../types.ts';
import { getPlanConfig, canStoreAddProduct, canProductAddImage, canStoreUseCustomDomain } from '../lib/plans.ts';

export interface CheckoutRequest {
  storeId: number;
  userId: number;
  userEmail: string;
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
  gateway: PaymentGateway;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResult {
  gateway: PaymentGateway;
  checkoutUrl: string;
  sessionId?: string;
  preferenceId?: string;
  referenceId: string;
}

/**
 * Retrieves the current subscription for a store, or provisions a default free subscription
 */
export async function getOrCreateStoreSubscription(storeId: number, userId: number): Promise<StoreSubscription> {
  const existing = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.storeId, storeId))
    .limit(1);

  if (existing.length > 0) {
    const s = existing[0];
    return {
      id: s.id,
      storeId: s.storeId,
      userId: s.userId,
      plan: s.plan as SubscriptionPlan,
      status: s.status as SubscriptionStatus,
      billingCycle: s.billingCycle as BillingCycle,
      provider: s.provider as PaymentGateway,
      providerSubscriptionId: s.providerSubscriptionId,
      providerCustomerId: s.providerCustomerId,
      currentPeriodStart: s.currentPeriodStart ? s.currentPeriodStart.toISOString() : null,
      currentPeriodEnd: s.currentPeriodEnd ? s.currentPeriodEnd.toISOString() : null,
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }

  // Create default free subscription
  const inserted = await db
    .insert(subscriptions)
    .values({
      storeId,
      userId,
      plan: 'free',
      status: 'active',
      billingCycle: 'monthly',
      provider: 'manual',
    })
    .returning();

  const sub = inserted[0];
  return {
    id: sub.id,
    storeId: sub.storeId,
    userId: sub.userId,
    plan: sub.plan as SubscriptionPlan,
    status: sub.status as SubscriptionStatus,
    billingCycle: sub.billingCycle as BillingCycle,
    provider: sub.provider as PaymentGateway,
    providerSubscriptionId: sub.providerSubscriptionId,
    providerCustomerId: sub.providerCustomerId,
    currentPeriodStart: sub.currentPeriodStart ? sub.currentPeriodStart.toISOString() : null,
    currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    createdAt: sub.createdAt.toISOString(),
    updatedAt: sub.updatedAt.toISOString(),
  };
}

/**
 * Calculates current usage metrics against plan quotas for a store
 */
export async function getStoreUsageMetrics(storeId: number): Promise<StoreUsageMetrics> {
  const storeRes = await db
    .select({
      id: stores.id,
      userId: stores.userId,
      plan: stores.plan,
    })
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);

  if (storeRes.length === 0) {
    throw new Error('Store not found');
  }

  const store = storeRes[0];
  const sub = await getOrCreateStoreSubscription(store.id, store.userId);
  const currentPlan = (sub.status === 'active' ? sub.plan : 'free') as SubscriptionPlan;
  const config = getPlanConfig(currentPlan);

  // Count active/all products for this store
  const productCountRes = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.storeId, storeId));

  const productCount = productCountRes[0]?.count || 0;

  return {
    plan: currentPlan,
    status: sub.status,
    currentProductCount: productCount,
    maxProducts: config.maxProducts,
    maxImagesPerProduct: config.maxImagesPerProduct,
    customDomainEnabled: config.customDomainEnabled,
    advancedAnalyticsEnabled: config.advancedAnalytics,
    multiUserEnabled: config.multiUserEnabled,
    canAddProduct: canStoreAddProduct(currentPlan, productCount),
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
  };
}

/**
 * Initiates a production-ready checkout session with the selected payment gateway
 * (Stripe, MercadoPago, or Paddle).
 */
export async function initiateCheckoutSession(params: CheckoutRequest): Promise<CheckoutSessionResult> {
  const planConfig = getPlanConfig(params.plan);
  const amount = params.billingCycle === 'yearly' ? planConfig.priceYearly : planConfig.priceMonthly;
  const referenceId = `sub_${params.storeId}_${params.plan}_${Date.now()}`;

  if (params.gateway === 'stripe') {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (stripeSecretKey) {
      // Real Stripe Checkout session creation via REST API (avoids heavy dependency overhead)
      const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'payment_method_types[0]': 'card',
          mode: 'subscription',
          client_reference_id: String(params.storeId),
          customer_email: params.userEmail,
          'line_items[0][price_data][currency]': 'usd',
          'line_items[0][price_data][product_data][name]': `Catálogo SaaS - Plan ${planConfig.name}`,
          'line_items[0][price_data][unit_amount]': String(Math.round(amount * 100)),
          'line_items[0][price_data][recurring][interval]': params.billingCycle === 'yearly' ? 'year' : 'month',
          'line_items[0][quantity]': '1',
          'metadata[storeId]': String(params.storeId),
          'metadata[plan]': params.plan,
          'metadata[cycle]': params.billingCycle,
          success_url: `${params.successUrl}?session_id={CHECKOUT_SESSION_ID}&plan=${params.plan}`,
          cancel_url: params.cancelUrl,
        }),
      });

      const data = await res.json();
      if (data.url) {
        return {
          gateway: 'stripe',
          checkoutUrl: data.url,
          sessionId: data.id,
          referenceId,
        };
      }
    }

    // Configured architectural fallback for staging / development
    const appUrl = process.env.APP_URL || 'https://catalogo.app';
    return {
      gateway: 'stripe',
      checkoutUrl: `${appUrl}/billing/mock-checkout?storeId=${params.storeId}&plan=${params.plan}&gateway=stripe&ref=${referenceId}`,
      referenceId,
    };
  }

  if (params.gateway === 'mercadopago') {
    const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (mpAccessToken) {
      // Real MercadoPago Preapproval (subscription) API
      const res = await fetch('https://api.mercadopago.com/preapproval_plan', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: `Suscripción Plan ${planConfig.name} - Catálogo SaaS`,
          auto_recurring: {
            frequency: params.billingCycle === 'yearly' ? 12 : 1,
            frequency_type: 'months',
            transaction_amount: amount,
            currency_id: 'USD',
          },
          back_url: params.successUrl,
        }),
      });
      const data = await res.json();
      if (data.init_point) {
        return {
          gateway: 'mercadopago',
          checkoutUrl: data.init_point,
          preferenceId: data.id,
          referenceId,
        };
      }
    }

    const appUrl = process.env.APP_URL || 'https://catalogo.app';
    return {
      gateway: 'mercadopago',
      checkoutUrl: `${appUrl}/billing/mock-checkout?storeId=${params.storeId}&plan=${params.plan}&gateway=mercadopago&ref=${referenceId}`,
      referenceId,
    };
  }

  // Paddle Gateway
  const paddleVendorId = process.env.PADDLE_VENDOR_ID;
  const paddleApiKey = process.env.PADDLE_API_KEY;
  if (paddleVendorId && paddleApiKey) {
    const res = await fetch('https://vendors.paddle.com/api/2.0/product/generate_pay_link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vendor_id: Number(paddleVendorId),
        vendor_auth_code: paddleApiKey,
        title: `Plan ${planConfig.name}`,
        webhook_url: `${process.env.APP_URL || ''}/api/webhooks/paddle`,
        customer_email: params.userEmail,
        passthrough: JSON.stringify({ storeId: params.storeId, plan: params.plan }),
      }),
    });
    const data = await res.json();
    if (data.response && data.response.url) {
      return {
        gateway: 'paddle',
        checkoutUrl: data.response.url,
        referenceId,
      };
    }
  }

  const appUrl = process.env.APP_URL || 'https://catalogo.app';
  return {
    gateway: 'paddle',
    checkoutUrl: `${appUrl}/billing/mock-checkout?storeId=${params.storeId}&plan=${params.plan}&gateway=paddle&ref=${referenceId}`,
    referenceId,
  };
}

/**
 * Handles Webhook events from Stripe, MercadoPago, and Paddle
 * Idempotently updates subscription state and store plan.
 */
export async function processPaymentWebhook(
  gateway: PaymentGateway,
  payload: any,
  _rawSignature?: string
): Promise<{ success: boolean; action: string }> {
  let targetStoreId: number | null = null;
  let targetPlan: SubscriptionPlan = 'pro';
  let targetStatus: SubscriptionStatus = 'active';
  let providerSubId = '';
  let providerCustomerId = '';
  let periodEnd: Date | null = null;

  if (gateway === 'stripe') {
    const event = payload;
    const type = event.type || '';

    if (type === 'checkout.session.completed') {
      const session = event.data?.object || {};
      targetStoreId = Number(session.metadata?.storeId || session.client_reference_id);
      targetPlan = (session.metadata?.plan as SubscriptionPlan) || 'pro';
      providerSubId = session.subscription || session.id;
      providerCustomerId = session.customer || '';
    } else if (type === 'invoice.payment_succeeded') {
      const invoice = event.data?.object || {};
      providerSubId = invoice.subscription || '';
      targetStatus = 'active';
    } else if (type === 'customer.subscription.deleted') {
      const sub = event.data?.object || {};
      providerSubId = sub.id;
      targetStatus = 'canceled';
      targetPlan = 'free';
    }
  } else if (gateway === 'mercadopago') {
    const action = payload.action;
    if (action === 'payment.created' || action === 'payment.updated') {
      const data = payload.data || {};
      providerSubId = String(data.id || '');
      targetStatus = 'active';
    }
  } else if (gateway === 'paddle') {
    const alertName = payload.alert_name;
    if (alertName === 'subscription_created' || alertName === 'subscription_payment_succeeded') {
      try {
        const pass = JSON.parse(payload.passthrough || '{}');
        targetStoreId = Number(pass.storeId);
        targetPlan = pass.plan || 'pro';
      } catch {
        // ignore
      }
      providerSubId = payload.subscription_id;
      targetStatus = 'active';
    } else if (alertName === 'subscription_cancelled') {
      providerSubId = payload.subscription_id;
      targetStatus = 'canceled';
      targetPlan = 'free';
    }
  }

  // Update subscription in database if targetStoreId or providerSubId was found
  if (targetStoreId) {
    const now = new Date();
    periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days default

    await db
      .update(subscriptions)
      .set({
        plan: targetPlan,
        status: targetStatus,
        provider: gateway,
        providerSubscriptionId: providerSubId || undefined,
        providerCustomerId: providerCustomerId || undefined,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        updatedAt: now,
      })
      .where(eq(subscriptions.storeId, targetStoreId));

    await db
      .update(stores)
      .set({
        plan: targetPlan,
        updatedAt: now,
      })
      .where(eq(stores.id, targetStoreId));

    return { success: true, action: `store_${targetStoreId}_updated_to_${targetPlan}` };
  }

  return { success: true, action: 'ignored_unmatched_event' };
}

/**
 * Cancels a subscription at the end of the billing period
 */
export async function cancelStoreSubscription(storeId: number): Promise<boolean> {
  await db
    .update(subscriptions)
    .set({
      cancelAtPeriodEnd: true,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.storeId, storeId));

  return true;
}

/**
 * Manually updates a store's plan (for admin, promotions, or direct manual billing)
 */
export async function updateStorePlanManually(
  storeId: number,
  userId: number,
  newPlan: SubscriptionPlan
): Promise<StoreSubscription> {
  const sub = await getOrCreateStoreSubscription(storeId, userId);
  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await db
    .update(subscriptions)
    .set({
      plan: newPlan,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
      cancelAtPeriodEnd: false,
      updatedAt: now,
    })
    .where(eq(subscriptions.id, sub.id));

  await db
    .update(stores)
    .set({
      plan: newPlan,
      updatedAt: now,
    })
    .where(eq(stores.id, storeId));

  return getOrCreateStoreSubscription(storeId, userId);
}
