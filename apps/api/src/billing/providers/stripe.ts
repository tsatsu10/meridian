/**
 * Stripe Billing Provider Implementation
 */

import Stripe from 'stripe';
import {
  IBillingProvider,
  BillingCustomer,
  BillingSubscription,
  BillingInvoice,
  PaymentMethod,
} from '../types';
import logger from '../../utils/logger';

function primarySubscriptionItem(sub: Stripe.Subscription): Stripe.SubscriptionItem {
  const item = sub.items.data[0];
  if (!item) {
    throw new Error('[Stripe] Subscription has no line items');
  }
  return item;
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const parent = invoice.parent;
  if (!parent || parent.type !== 'subscription_details') {
    return null;
  }
  const sub = parent.subscription_details?.subscription;
  if (typeof sub === 'string') {
    return sub;
  }
  if (sub && typeof sub === 'object' && 'id' in sub) {
    return (sub as Stripe.Subscription).id;
  }
  return null;
}

function stripeMetadata(meta: Stripe.Metadata | null): Record<string, string> | undefined {
  if (!meta || Object.keys(meta).length === 0) {
    return undefined;
  }
  return { ...meta };
}

export class StripeProvider implements IBillingProvider {
  private stripe: Stripe;

  constructor(apiKey: string) {
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-10-29.clover',
      typescript: true,
    });
  }

  // ===== CUSTOMER MANAGEMENT =====

  async createCustomer(
    email: string,
    name: string,
    workspaceId: string,
    metadata?: Record<string, any>
  ): Promise<BillingCustomer> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          workspaceId,
          ...metadata,
        },
      });

      return {
        id: customer.id,
        email: customer.email!,
        name: customer.name!,
        workspaceId,
        provider: 'stripe',
        providerCustomerId: customer.id,
        metadata: customer.metadata,
        createdAt: new Date(customer.created * 1000),
        updatedAt: new Date(),
      };
    } catch (error: any) {
      logger.error('[Stripe] Error creating customer:', error);
      throw new Error(`Stripe error: ${error.message}`);
    }
  }

  async getCustomer(providerCustomerId: string): Promise<BillingCustomer | null> {
    try {
      const customer = await this.stripe.customers.retrieve(providerCustomerId);
      
      if (customer.deleted) {
        return null;
      }

      return {
        id: customer.id,
        email: customer.email!,
        name: customer.name || customer.email!,
        workspaceId: customer.metadata?.workspaceId || '',
        provider: 'stripe',
        providerCustomerId: customer.id,
        metadata: customer.metadata,
        createdAt: new Date(customer.created * 1000),
        updatedAt: new Date(),
      };
    } catch (error: any) {
      if (error.code === 'resource_missing') {
        return null;
      }
      logger.error('[Stripe] Error getting customer:', error);
      throw new Error(`Stripe error: ${error.message}`);
    }
  }

  async updateCustomer(
    providerCustomerId: string,
    updates: Partial<BillingCustomer>
  ): Promise<BillingCustomer> {
    try {
      const customer = await this.stripe.customers.update(providerCustomerId, {
        email: updates.email,
        name: updates.name,
        metadata: updates.metadata,
      });

      return {
        id: customer.id,
        email: customer.email!,
        name: customer.name || customer.email!,
        workspaceId: customer.metadata?.workspaceId || '',
        provider: 'stripe',
        providerCustomerId: customer.id,
        metadata: customer.metadata,
        createdAt: new Date(customer.created * 1000),
        updatedAt: new Date(),
      };
    } catch (error: any) {
      logger.error('[Stripe] Error updating customer:', error);
      throw new Error(`Stripe error: ${error.message}`);
    }
  }

  async deleteCustomer(providerCustomerId: string): Promise<void> {
    try {
      await this.stripe.customers.del(providerCustomerId);
      logger.info('[Stripe] Customer deleted:', providerCustomerId);
    } catch (error: any) {
      logger.error('[Stripe] Error deleting customer:', error);
      throw new Error(`Stripe error: ${error.message}`);
    }
  }

  // ===== SUBSCRIPTION MANAGEMENT =====

  async createSubscription(
    customerId: string,
    planId: string,
    metadata?: Record<string, any>
  ): Promise<BillingSubscription> {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: planId }],
        metadata,
        expand: ['latest_invoice'],
      });

      const item = primarySubscriptionItem(subscription);
      const plan = item.price;

      return {
        id: subscription.id,
        customerId: subscription.customer as string,
        workspaceId: metadata?.workspaceId || '',
        provider: 'stripe',
        providerSubscriptionId: subscription.id,
        planId: plan.id,
        planName: plan.nickname || 'Subscription',
        status: this.mapSubscriptionStatus(subscription.status),
        currentPeriodStart: new Date(item.current_period_start * 1000),
        currentPeriodEnd: new Date(item.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        amount: plan.unit_amount || 0,
        currency: plan.currency,
        interval: plan.recurring?.interval as 'month' | 'year',
        metadata: stripeMetadata(subscription.metadata) as Record<string, any> | undefined,
        createdAt: new Date(subscription.created * 1000),
        updatedAt: new Date(),
      };
    } catch (error: any) {
      logger.error('[Stripe] Error creating subscription:', error);
      throw new Error(`Stripe error: ${error.message}`);
    }
  }

  async getSubscription(providerSubscriptionId: string): Promise<BillingSubscription | null> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(providerSubscriptionId);
      const item = primarySubscriptionItem(subscription);
      const plan = item.price;

      return {
        id: subscription.id,
        customerId: subscription.customer as string,
        workspaceId: subscription.metadata?.workspaceId || '',
        provider: 'stripe',
        providerSubscriptionId: subscription.id,
        planId: plan.id,
        planName: plan.nickname || 'Subscription',
        status: this.mapSubscriptionStatus(subscription.status),
        currentPeriodStart: new Date(item.current_period_start * 1000),
        currentPeriodEnd: new Date(item.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        amount: plan.unit_amount || 0,
        currency: plan.currency,
        interval: plan.recurring?.interval as 'month' | 'year',
        metadata: stripeMetadata(subscription.metadata) as Record<string, any> | undefined,
        createdAt: new Date(subscription.created * 1000),
        updatedAt: new Date(),
      };
    } catch (error: any) {
      if (error.code === 'resource_missing') {
        return null;
      }
      logger.error('[Stripe] Error getting subscription:', error);
      throw new Error(`Stripe error: ${error.message}`);
    }
  }

  async updateSubscription(
    providerSubscriptionId: string,
    updates: { planId?: string; cancelAtPeriodEnd?: boolean }
  ): Promise<BillingSubscription> {
    try {
      const updateData: any = {};

      if (updates.planId) {
        updateData.items = [{ price: updates.planId }];
      }

      if (updates.cancelAtPeriodEnd !== undefined) {
        updateData.cancel_at_period_end = updates.cancelAtPeriodEnd;
      }

      const subscription = await this.stripe.subscriptions.update(
        providerSubscriptionId,
        updateData
      );

      const item = primarySubscriptionItem(subscription);
      const plan = item.price;

      return {
        id: subscription.id,
        customerId: subscription.customer as string,
        workspaceId: subscription.metadata?.workspaceId || '',
        provider: 'stripe',
        providerSubscriptionId: subscription.id,
        planId: plan.id,
        planName: plan.nickname || 'Subscription',
        status: this.mapSubscriptionStatus(subscription.status),
        currentPeriodStart: new Date(item.current_period_start * 1000),
        currentPeriodEnd: new Date(item.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        amount: plan.unit_amount || 0,
        currency: plan.currency,
        interval: plan.recurring?.interval as 'month' | 'year',
        metadata: stripeMetadata(subscription.metadata) as Record<string, any> | undefined,
        createdAt: new Date(subscription.created * 1000),
        updatedAt: new Date(),
      };
    } catch (error: any) {
      logger.error('[Stripe] Error updating subscription:', error);
      throw new Error(`Stripe error: ${error.message}`);
    }
  }

  async cancelSubscription(
    providerSubscriptionId: string,
    immediately: boolean = false
  ): Promise<BillingSubscription> {
    try {
      const subscription = immediately
        ? await this.stripe.subscriptions.cancel(providerSubscriptionId)
        : await this.stripe.subscriptions.update(providerSubscriptionId, {
            cancel_at_period_end: true,
          });

      const item = primarySubscriptionItem(subscription);
      const plan = item.price;

      return {
        id: subscription.id,
        customerId: subscription.customer as string,
        workspaceId: subscription.metadata?.workspaceId || '',
        provider: 'stripe',
        providerSubscriptionId: subscription.id,
        planId: plan.id,
        planName: plan.nickname || 'Subscription',
        status: this.mapSubscriptionStatus(subscription.status),
        currentPeriodStart: new Date(item.current_period_start * 1000),
        currentPeriodEnd: new Date(item.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        amount: plan.unit_amount || 0,
        currency: plan.currency,
        interval: plan.recurring?.interval as 'month' | 'year',
        metadata: stripeMetadata(subscription.metadata) as Record<string, any> | undefined,
        createdAt: new Date(subscription.created * 1000),
        updatedAt: new Date(),
      };
    } catch (error: any) {
      logger.error('[Stripe] Error canceling subscription:', error);
      throw new Error(`Stripe error: ${error.message}`);
    }
  }

  // ===== INVOICE MANAGEMENT =====

  async getInvoices(customerId: string, limit: number = 10): Promise<BillingInvoice[]> {
    try {
      const invoices = await this.stripe.invoices.list({
        customer: customerId,
        limit,
      });

      return invoices.data.map((invoice) => ({
        id: invoice.id,
        customerId: invoice.customer as string,
        workspaceId: invoice.metadata?.workspaceId || '',
        provider: 'stripe' as const,
        providerInvoiceId: invoice.id,
        subscriptionId: invoiceSubscriptionId(invoice),
        number: invoice.number || invoice.id,
        amount: invoice.amount_due,
        currency: invoice.currency,
        status: this.mapInvoiceStatus(invoice.status),
        paidAt: invoice.status_transitions.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : null,
        dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
        description: invoice.description || null,
        invoiceUrl: invoice.hosted_invoice_url || null,
        pdfUrl: invoice.invoice_pdf || null,
        metadata: stripeMetadata(invoice.metadata) as Record<string, any> | undefined,
        createdAt: new Date(invoice.created * 1000),
      }));
    } catch (error: any) {
      logger.error('[Stripe] Error fetching invoices:', error);
      throw new Error(`Stripe error: ${error.message}`);
    }
  }

  async getInvoice(providerInvoiceId: string): Promise<BillingInvoice | null> {
    try {
      const invoice = await this.stripe.invoices.retrieve(providerInvoiceId);

      return {
        id: invoice.id,
        customerId: invoice.customer as string,
        workspaceId: invoice.metadata?.workspaceId || '',
        provider: 'stripe',
        providerInvoiceId: invoice.id,
        subscriptionId: invoiceSubscriptionId(invoice),
        number: invoice.number || invoice.id,
        amount: invoice.amount_due,
        currency: invoice.currency,
        status: this.mapInvoiceStatus(invoice.status),
        paidAt: invoice.status_transitions.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : null,
        dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
        description: invoice.description || null,
        invoiceUrl: invoice.hosted_invoice_url || null,
        pdfUrl: invoice.invoice_pdf || null,
        metadata: stripeMetadata(invoice.metadata) as Record<string, any> | undefined,
        createdAt: new Date(invoice.created * 1000),
      };
    } catch (error: any) {
      if (error.code === 'resource_missing') {
        return null;
      }
      logger.error('[Stripe] Error getting invoice:', error);
      throw new Error(`Stripe error: ${error.message}`);
    }
  }

  async getUpcomingInvoice(customerId: string): Promise<BillingInvoice | null> {
    try {
      const invoice = await this.stripe.invoices.createPreview({
        customer: customerId,
      });

      return {
        id: invoice.id || 'upcoming',
        customerId: invoice.customer as string,
        workspaceId: invoice.metadata?.workspaceId || '',
        provider: 'stripe',
        providerInvoiceId: invoice.id || 'upcoming',
        subscriptionId: invoiceSubscriptionId(invoice),
        number: 'Upcoming',
        amount: invoice.amount_due,
        currency: invoice.currency,
        status: 'open',
        paidAt: null,
        dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
        description: 'Upcoming invoice',
        invoiceUrl: null,
        pdfUrl: null,
        metadata: (stripeMetadata(invoice.metadata) as Record<string, any> | undefined) ?? {},
        createdAt: new Date(),
      };
    } catch (error: any) {
      if (error.code === 'invoice_upcoming_none') {
        return null;
      }
      logger.error('[Stripe] Error getting upcoming invoice:', error);
      return null;
    }
  }

  // ===== PAYMENT METHODS =====

  async getPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      // Get customer to find default payment method
      const customer = await this.stripe.customers.retrieve(customerId);
      const defaultPM = typeof customer !== 'string' && !customer.deleted 
        ? customer.invoice_settings?.default_payment_method 
        : null;

      return paymentMethods.data.map((pm) => ({
        id: pm.id,
        customerId,
        provider: 'stripe' as const,
        providerPaymentMethodId: pm.id,
        type: 'card' as const,
        brand: pm.card?.brand,
        last4: pm.card?.last4 || '****',
        expiryMonth: pm.card?.exp_month,
        expiryYear: pm.card?.exp_year,
        isDefault: pm.id === defaultPM,
        metadata: stripeMetadata(pm.metadata) as Record<string, any> | undefined,
        createdAt: new Date(pm.created * 1000),
      }));
    } catch (error: any) {
      logger.error('[Stripe] Error fetching payment methods:', error);
      throw new Error(`Stripe error: ${error.message}`);
    }
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    try {
      await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
      logger.info('[Stripe] Set default payment method:', { customerId, paymentMethodId });
    } catch (error: any) {
      logger.error('[Stripe] Error setting default payment method:', error);
      throw new Error(`Stripe error: ${error.message}`);
    }
  }

  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      await this.stripe.paymentMethods.detach(paymentMethodId);
      logger.info('[Stripe] Payment method deleted:', paymentMethodId);
    } catch (error: any) {
      logger.error('[Stripe] Error deleting payment method:', error);
      throw new Error(`Stripe error: ${error.message}`);
    }
  }

  // ===== CHECKOUT =====

  async createCheckoutSession(
    customerId: string,
    planId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ url: string; sessionId: string }> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [
          {
            price: planId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      return {
        url: session.url!,
        sessionId: session.id,
      };
    } catch (error: any) {
      logger.error('[Stripe] Error creating checkout session:', error);
      throw new Error(`Stripe error: ${error.message}`);
    }
  }

  async createPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<{ url: string }> {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      return {
        url: session.url,
      };
    } catch (error: any) {
      logger.error('[Stripe] Error creating portal session:', error);
      throw new Error(`Stripe error: ${error.message}`);
    }
  }

  // ===== WEBHOOKS =====

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, secret);
      return !!event;
    } catch (error: any) {
      logger.error('[Stripe] Webhook signature verification failed:', error);
      return false;
    }
  }

  parseWebhookEvent(payload: string): any {
    try {
      return JSON.parse(payload);
    } catch (error: any) {
      logger.error('[Stripe] Error parsing webhook event:', error);
      throw new Error('Invalid webhook payload');
    }
  }

  // ===== HELPER METHODS =====

  private mapSubscriptionStatus(
    status: Stripe.Subscription.Status
  ): 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing' {
    switch (status) {
      case 'active':
        return 'active';
      case 'past_due':
        return 'past_due';
      case 'canceled':
      case 'incomplete_expired':
        return 'canceled';
      case 'unpaid':
      case 'incomplete':
        return 'unpaid';
      case 'trialing':
        return 'trialing';
      default:
        return 'active';
    }
  }

  private mapInvoiceStatus(
    status: Stripe.Invoice.Status | null
  ): 'draft' | 'open' | 'paid' | 'void' | 'uncollectible' {
    switch (status) {
      case 'draft':
        return 'draft';
      case 'open':
        return 'open';
      case 'paid':
        return 'paid';
      case 'void':
        return 'void';
      case 'uncollectible':
        return 'uncollectible';
      default:
        return 'open';
    }
  }
}

