/**
 * Billing Webhook Handlers
 * Processes webhooks from Stripe and Paystack
 */

import { Hono } from 'hono';
import { getDatabase } from '../database/connection';
import { billingCustomers, billingSubscriptions, billingInvoices, billingWebhookEvents } from './schema';
import { eq, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { BillingProviderFactory } from './provider-factory';
import { BillingProvider } from './types';
import logger from '../utils/logger';
import { captureException, addBreadcrumb } from '../services/monitoring/sentry';

const app = new Hono();

// POST /api/billing/webhooks/stripe - Handle Stripe webhooks
app.post('/stripe', async (c) => {
  try {
    const signature = c.req.header('stripe-signature');
    const payload = await c.req.text();

    if (!signature) {
      return c.json({ error: 'Missing signature' }, 400);
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured');
      return c.json({ error: 'Webhook secret not configured' }, 500);
    }

    // Verify signature
    const provider = BillingProviderFactory.getProvider('stripe');
    const isValid = provider.verifyWebhookSignature(payload, signature, webhookSecret);

    if (!isValid) {
      logger.error('[Stripe Webhook] Invalid signature');
      return c.json({ error: 'Invalid signature' }, 400);
    }

    const event = provider.parseWebhookEvent(payload);
    const db = getDatabase();

    // Log webhook event
    await db.insert(billingWebhookEvents).values({
      id: createId(),
      provider: 'stripe',
      providerEventId: event.id,
      eventType: event.type,
      payload: event,
      processed: false,
      createdAt: new Date(),
    });

    logger.info('[Stripe Webhook] Received event:', event.type);

    // Process event based on type
    switch (event.type) {
      case 'invoice.paid':
        await handleStripeinvoicePaid(event.data.object, db);
        break;

      case 'invoice.payment_failed':
        await handleStripeInvoicePaymentFailed(event.data.object, db);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleStripeSubscriptionUpdated(event.data.object, db);
        break;

      case 'customer.subscription.deleted':
        await handleStripeSubscriptionDeleted(event.data.object, db);
        break;

      case 'charge.succeeded':
        logger.info('[Stripe Webhook] Charge succeeded:', event.data.object.id);
        break;

      case 'charge.failed':
        logger.warn('[Stripe Webhook] Charge failed:', event.data.object.id);
        break;

      default:
        logger.debug('[Stripe Webhook] Unhandled event type:', event.type);
    }

    // Mark as processed
    await db
      .update(billingWebhookEvents)
      .set({ processed: true, processedAt: new Date() })
      .where(eq(billingWebhookEvents.providerEventId, event.id));

    // 📊 SENTRY: Log successful webhook processing
    addBreadcrumb('Stripe webhook processed', 'billing', 'info', {
      eventType: event.type,
      eventId: event.id,
    });

    return c.json({ received: true });
  } catch (error: any) {
    logger.error('[Stripe Webhook] Error processing webhook:', error);
    
    // 📊 SENTRY: Capture webhook errors
    captureException(error, {
      feature: 'billing',
      action: 'stripe_webhook',
      provider: 'stripe',
    });
    
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/billing/webhooks/paystack - Handle Paystack webhooks
app.post('/paystack', async (c) => {
  try {
    const signature = c.req.header('x-paystack-signature');
    const payload = await c.req.text();

    if (!signature) {
      return c.json({ error: 'Missing signature' }, 400);
    }

    const webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('[Paystack Webhook] PAYSTACK_WEBHOOK_SECRET not configured');
      return c.json({ error: 'Webhook secret not configured' }, 500);
    }

    // Verify signature
    const provider = BillingProviderFactory.getProvider('paystack');
    const isValid = provider.verifyWebhookSignature(payload, signature, webhookSecret);

    if (!isValid) {
      logger.error('[Paystack Webhook] Invalid signature');
      return c.json({ error: 'Invalid signature' }, 400);
    }

    const event = provider.parseWebhookEvent(payload);
    const db = getDatabase();

    // Log webhook event
    await db.insert(billingWebhookEvents).values({
      id: createId(),
      provider: 'paystack',
      providerEventId: event.id || createId(),
      eventType: event.event,
      payload: event,
      processed: false,
      createdAt: new Date(),
    });

    logger.info('[Paystack Webhook] Received event:', event.event);

    // Process event based on type
    switch (event.event) {
      case 'charge.success':
        await handlePaystackChargeSuccess(event.data, db);
        break;

      case 'subscription.create':
      case 'subscription.not_renew':
      case 'subscription.disable':
        await handlePaystackSubscriptionEvent(event.data, event.event, db);
        break;

      case 'invoice.payment_failed':
        logger.warn('[Paystack Webhook] Invoice payment failed:', event.data);
        break;

      default:
        logger.debug('[Paystack Webhook] Unhandled event type:', event.event);
    }

    // Mark as processed
    await db
      .update(billingWebhookEvents)
      .set({ processed: true, processedAt: new Date() })
      .where(eq(billingWebhookEvents.providerEventId, event.id || createId()));

    return c.json({ received: true });
  } catch (error: any) {
    logger.error('[Paystack Webhook] Error processing webhook:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ===== STRIPE EVENT HANDLERS =====

async function handleStripeinvoicePaid(invoice: any, db: any) {
  try {
    const customerId = invoice.customer;
    const customer = await db.query.billingCustomers.findFirst({
      where: eq(billingCustomers.providerCustomerId, customerId),
    });

    if (!customer) {
      logger.warn('[Stripe Webhook] Customer not found:', customerId);
      return;
    }

    // Check if invoice already exists
    const existingInvoice = await db.query.billingInvoices.findFirst({
      where: eq(billingInvoices.providerInvoiceId, invoice.id),
    });

    if (existingInvoice) {
      // Update existing invoice
      await db
        .update(billingInvoices)
        .set({
          status: 'paid',
          paidAt: new Date(invoice.status_transitions?.paid_at * 1000),
        })
        .where(eq(billingInvoices.id, existingInvoice.id));
    } else {
      // Create new invoice
      await db
        .insert(billingInvoices)
        .values({
          id: createId(),
          customerId: customer.id,
          workspaceId: customer.workspaceId,
          subscriptionId: invoice.subscription || null,
          provider: 'stripe',
          providerInvoiceId: invoice.id,
          number: invoice.number || invoice.id,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: 'paid',
          paidAt: new Date(invoice.status_transitions?.paid_at * 1000),
          description: invoice.description || null,
          invoiceUrl: invoice.hosted_invoice_url || null,
          pdfUrl: invoice.invoice_pdf || null,
          metadata: invoice.metadata,
          createdAt: new Date(invoice.created * 1000),
        });
    }

    logger.info('[Stripe Webhook] Invoice paid processed:', invoice.id);
  } catch (error: any) {
    logger.error('[Stripe Webhook] Error handling invoice.paid:', error);
    throw error;
  }
}

async function handleStripeInvoicePaymentFailed(invoice: any, db: any) {
  try {
    const customerId = invoice.customer;
    const customer = await db.query.billingCustomers.findFirst({
      where: eq(billingCustomers.providerCustomerId, customerId),
    });

    if (!customer) return;

    // Update subscription status
    if (invoice.subscription) {
      await db
        .update(billingSubscriptions)
        .set({
          status: 'past_due',
          updatedAt: new Date(),
        })
        .where(eq(billingSubscriptions.providerSubscriptionId, invoice.subscription));
    }

    logger.warn('[Stripe Webhook] Invoice payment failed:', invoice.id);
  } catch (error: any) {
    logger.error('[Stripe Webhook] Error handling invoice.payment_failed:', error);
    throw error;
  }
}

async function handleStripeSubscriptionUpdated(subscription: any, db: any) {
  try {
    const customerId = subscription.customer;
    const customer = await db.query.billingCustomers.findFirst({
      where: eq(billingCustomers.providerCustomerId, customerId),
    });

    if (!customer) return;

    const plan = subscription.items.data[0].price;

    // Check if subscription already exists
    const existingSubscription = await db.query.billingSubscriptions.findFirst({
      where: eq(billingSubscriptions.providerSubscriptionId, subscription.id),
    });

    if (existingSubscription) {
      // Update existing subscription
      await db
        .update(billingSubscriptions)
        .set({
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          updatedAt: new Date(),
        })
        .where(eq(billingSubscriptions.id, existingSubscription.id));
    } else {
      // Create new subscription
      await db
        .insert(billingSubscriptions)
        .values({
          id: createId(),
          customerId: customer.id,
          workspaceId: customer.workspaceId,
          provider: 'stripe',
          providerSubscriptionId: subscription.id,
          planId: plan.id,
          planName: plan.nickname || 'Subscription',
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
          amount: plan.unit_amount,
          currency: plan.currency,
          interval: plan.recurring.interval,
          metadata: subscription.metadata,
          createdAt: new Date(subscription.created * 1000),
          updatedAt: new Date(),
        });
    }

    logger.info('[Stripe Webhook] Subscription updated:', subscription.id);
  } catch (error: any) {
    logger.error('[Stripe Webhook] Error handling subscription.updated:', error);
    throw error;
  }
}

async function handleStripeSubscriptionDeleted(subscription: any, db: any) {
  try {
    await db
      .update(billingSubscriptions)
      .set({
        status: 'canceled',
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(billingSubscriptions.providerSubscriptionId, subscription.id));

    logger.info('[Stripe Webhook] Subscription deleted:', subscription.id);
  } catch (error: any) {
    logger.error('[Stripe Webhook] Error handling subscription.deleted:', error);
    throw error;
  }
}

// ===== PAYSTACK EVENT HANDLERS =====

async function handlePaystackChargeSuccess(charge: any, db: any) {
  try {
    const customerCode = charge.customer?.customer_code;
    if (!customerCode) return;

    const customer = await db.query.billingCustomers.findFirst({
      where: eq(billingCustomers.providerCustomerId, customerCode),
    });

    if (!customer) return;

    // Create invoice record
    await db.insert(billingInvoices).values({
      id: createId(),
      customerId: customer.id,
      workspaceId: customer.workspaceId,
      provider: 'paystack',
      providerInvoiceId: charge.reference,
      number: charge.reference,
      amount: charge.amount,
      currency: charge.currency.toLowerCase(),
      status: 'paid',
      paidAt: new Date(charge.paid_at),
      description: charge.message || null,
      metadata: charge.metadata,
      createdAt: new Date(charge.created_at),
    });

    logger.info('[Paystack Webhook] Charge success processed:', charge.reference);
  } catch (error: any) {
    logger.error('[Paystack Webhook] Error handling charge.success:', error);
    throw error;
  }
}

async function handlePaystackSubscriptionEvent(subscription: any, eventType: string, db: any) {
  try {
    const customerCode = subscription.customer?.customer_code;
    if (!customerCode) return;

    const customer = await db.query.billingCustomers.findFirst({
      where: eq(billingCustomers.providerCustomerId, customerCode),
    });

    if (!customer) return;

    let status = 'active';
    if (eventType === 'subscription.disable') {
      status = 'canceled';
    } else if (eventType === 'subscription.not_renew') {
      status = 'canceled';
    }

    // Check if subscription already exists
    const existingPaystackSub = await db.query.billingSubscriptions.findFirst({
      where: eq(billingSubscriptions.providerSubscriptionId, subscription.subscription_code),
    });

    if (existingPaystackSub) {
      // Update existing subscription
      await db
        .update(billingSubscriptions)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(billingSubscriptions.id, existingPaystackSub.id));
    } else {
      // Create new subscription
      await db
        .insert(billingSubscriptions)
        .values({
          id: createId(),
          customerId: customer.id,
          workspaceId: customer.workspaceId,
          provider: 'paystack',
          providerSubscriptionId: subscription.subscription_code,
          planId: subscription.plan.plan_code,
          planName: subscription.plan.name,
          status,
          currentPeriodStart: new Date(subscription.created_at),
          currentPeriodEnd: new Date(subscription.next_payment_date),
          cancelAtPeriodEnd: false,
          amount: subscription.plan.amount,
          currency: subscription.plan.currency.toLowerCase(),
          interval: subscription.plan.interval,
          metadata: subscription.metadata,
          createdAt: new Date(subscription.created_at),
          updatedAt: new Date(),
        });
    }

    logger.info('[Paystack Webhook] Subscription event processed:', eventType);
  } catch (error: any) {
    logger.error('[Paystack Webhook] Error handling subscription event:', error);
    throw error;
  }
}

export default app;

