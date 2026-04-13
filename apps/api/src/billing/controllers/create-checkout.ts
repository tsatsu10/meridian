/**
 * 💳 Create Checkout Session Controller
 * 
 * Handles creating Stripe checkout sessions for premium widgets
 */

import { type Handler } from "hono";
import { getDatabase } from "../../database/connection";
import { dashboardWidgets, billingCustomers } from "../../database/schema";
import { eq } from "drizzle-orm";
import {
  getOrCreateCustomer,
  createOneTimeCheckout,
  createSubscriptionCheckout,
  PricingModel,
  SubscriptionInterval,
  type WidgetPrice,
} from "../stripe-client";
import logger from "../../utils/logger";

export const createCheckoutSession: Handler = async (c) => {
  try {
    const db = getDatabase();
    const body = await c.req.json();
    const {
      widgetId,
      pricingModel = PricingModel.ONE_TIME,
      interval = SubscriptionInterval.MONTHLY,
      userEmail,
      userId,
      workspaceId,
    } = body;

    if (!widgetId || !userEmail || !userId || !workspaceId) {
      return c.json({
        error: "Missing required fields: widgetId, userEmail, userId, workspaceId"
      }, 400);
    }

    // Get widget details
    const [widget] = await db
      .select()
      .from(dashboardWidgets)
      .where(eq(dashboardWidgets.id, widgetId))
      .limit(1);

    if (!widget) {
      return c.json({ error: "Widget not found" }, 404);
    }

    if (!widget.isPremium) {
      return c.json({ error: "Widget is not a premium widget" }, 400);
    }

    // Get or create Stripe customer
    const customer = await getOrCreateCustomer(userEmail, {
      userId,
      userEmail,
      workspaceId,
    });

    if (!customer) {
      return c.json({ error: "Failed to create Stripe customer" }, 500);
    }

    // Save/update customer in database
    await db
      .insert(billingCustomers)
      .values({
        workspaceId,
        provider: "stripe",
        providerCustomerId: customer.id,
        email: userEmail,
        name: customer.name || userEmail.split("@")[0],
        metadata: { userId },
      })
      .onConflictDoUpdate({
        target: billingCustomers.providerCustomerId,
        set: {
          email: userEmail,
          name: customer.name || userEmail.split("@")[0],
          metadata: { userId },
          updatedAt: new Date(),
        },
      });

    // Define widget pricing
    // TODO: Get actual pricing from widget configuration or pricing table
    const widgetPrice: WidgetPrice = {
      widgetId: widget.id,
      model: pricingModel,
      amount: pricingModel === PricingModel.ONE_TIME ? 2999 : 999, // $29.99 one-time or $9.99/month
      currency: "usd",
      interval: pricingModel === PricingModel.SUBSCRIPTION ? interval : undefined,
      trialDays: pricingModel === PricingModel.SUBSCRIPTION ? 7 : undefined,
    };

    // Create metadata
    const metadata = {
      widgetId: widget.id,
      widgetName: widget.name,
      widgetDescription: widget.description || "",
      userId,
      userEmail,
      workspaceId,
      pricingModel,
    };

    // Create appropriate checkout session
    let session;
    if (pricingModel === PricingModel.SUBSCRIPTION) {
      session = await createSubscriptionCheckout(customer.id, widgetPrice, metadata);
    } else {
      session = await createOneTimeCheckout(customer.id, widgetPrice, metadata);
    }

    if (!session) {
      return c.json({ error: "Failed to create checkout session" }, 500);
    }

    logger.info(`✅ Checkout session created: ${session.id} for widget: ${widget.name}`);

    return c.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
        customerId: customer.id,
      },
    });
  } catch (error: unknown) {
    logger.error("❌ Error creating checkout session:", error);
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create checkout session",
      },
      500,
    );
  }
};

