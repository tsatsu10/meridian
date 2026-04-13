/**
 * Thin Stripe helpers for widget checkout (used by create-checkout controller).
 * Plan-level billing uses StripeProvider in providers/stripe.ts.
 */

import Stripe from "stripe";
import logger from "../utils/logger";

/** Must match `stripe` package pinned API version (see Stripe.LatestApiVersion). */
const STRIPE_API_VERSION = "2025-10-29.clover" as const;

let stripeSingleton: Stripe | null = null;

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
      apiVersion: STRIPE_API_VERSION,
      typescript: true,
    });
  }
  return stripeSingleton;
}

function getFrontendBaseUrl(): string {
  return process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5174";
}

function flattenMetadata(meta: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (v !== undefined && v !== null) {
      out[k] = String(v).slice(0, 500);
    }
  }
  return out;
}

export enum PricingModel {
  ONE_TIME = "one_time",
  SUBSCRIPTION = "subscription",
}

export enum SubscriptionInterval {
  MONTHLY = "monthly",
  YEARLY = "yearly",
}

export type WidgetPrice = {
  widgetId: string;
  model: PricingModel;
  amount: number;
  currency: string;
  interval?: SubscriptionInterval;
  trialDays?: number;
};

export async function getOrCreateCustomer(
  email: string,
  metadata: { userId: string; userEmail: string; workspaceId: string }
): Promise<Stripe.Customer | null> {
  const stripe = getStripe();
  const meta = flattenMetadata({
    userId: metadata.userId,
    userEmail: metadata.userEmail,
    workspaceId: metadata.workspaceId,
  });

  const existing = await stripe.customers.list({ email, limit: 1 });
  const first = existing.data[0];
  if (first) {
    await stripe.customers.update(first.id, {
      metadata: { ...first.metadata, ...meta },
    });
    const updated = await stripe.customers.retrieve(first.id);
    if (updated.deleted) {
      return null;
    }
    return updated;
  }

  return stripe.customers.create({
    email,
    metadata: meta,
  });
}

function checkoutUrls(): { successUrl: string; cancelUrl: string } {
  const base = getFrontendBaseUrl().replace(/\/$/, "");
  return {
    successUrl: `${base}/dashboard/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${base}/dashboard/billing?checkout=cancelled`,
  };
}

export async function createOneTimeCheckout(
  customerId: string,
  price: WidgetPrice,
  metadata: Record<string, unknown>
): Promise<{ id: string; url: string | null } | null> {
  const stripe = getStripe();
  const { successUrl, cancelUrl } = checkoutUrls();
  const productMeta = flattenMetadata({
    widgetId: price.widgetId,
    ...metadata,
  });

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: price.currency,
            unit_amount: price.amount,
            product_data: {
              name: "Premium widget (one-time)",
              metadata: productMeta,
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: flattenMetadata(metadata),
    });
    return { id: session.id, url: session.url };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("[stripe-client] createOneTimeCheckout failed", { message });
    throw new Error(`Stripe checkout failed: ${message}`);
  }
}

export async function createSubscriptionCheckout(
  customerId: string,
  price: WidgetPrice,
  metadata: Record<string, unknown>
): Promise<{ id: string; url: string | null } | null> {
  const stripe = getStripe();
  const { successUrl, cancelUrl } = checkoutUrls();
  const interval: "month" | "year" =
    price.interval === SubscriptionInterval.YEARLY ? "year" : "month";
  const productMeta = flattenMetadata({
    widgetId: price.widgetId,
    ...metadata,
  });

  const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData =
    {};
  if (price.trialDays !== undefined && price.trialDays > 0) {
    subscriptionData.trial_period_days = price.trialDays;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: price.currency,
            unit_amount: price.amount,
            recurring: { interval },
            product_data: {
              name: "Premium widget (subscription)",
              metadata: productMeta,
            },
          },
          quantity: 1,
        },
      ],
      ...(Object.keys(subscriptionData).length > 0
        ? { subscription_data: subscriptionData }
        : {}),
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: flattenMetadata(metadata),
    });
    return { id: session.id, url: session.url };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("[stripe-client] createSubscriptionCheckout failed", { message });
    throw new Error(`Stripe checkout failed: ${message}`);
  }
}
