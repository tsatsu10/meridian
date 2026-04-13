/**
 * Paystack Billing Provider Implementation
 */

import {
  IBillingProvider,
  BillingCustomer,
  BillingSubscription,
  BillingInvoice,
  PaymentMethod,
} from '../types';
import logger from '../../utils/logger';
import crypto from 'crypto';

interface PaystackCustomer {
  id: number;
  customer_code: string;
  email: string;
  first_name: string;
  last_name: string;
  metadata?: Record<string, any>;
}

interface PaystackSubscription {
  id: number;
  subscription_code: string;
  customer: { customer_code: string };
  plan: { plan_code: string; name: string; amount: number; interval: string; currency: string };
  status: string;
  next_payment_date: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export class PaystackProvider implements IBillingProvider {
  private secretKey: string;
  private baseUrl = 'https://api.paystack.co';

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  private async request(method: string, path: string, body?: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      throw new Error(data.message || 'Paystack API error');
    }

    return data.data;
  }

  // ===== CUSTOMER MANAGEMENT =====

  async createCustomer(
    email: string,
    name: string,
    workspaceId: string,
    metadata?: Record<string, any>
  ): Promise<BillingCustomer> {
    try {
      const [firstName, ...lastNameParts] = name.split(' ');
      const lastName = lastNameParts.join(' ') || firstName;

      const customer: PaystackCustomer = await this.request('POST', '/customer', {
        email,
        first_name: firstName,
        last_name: lastName,
        metadata: {
          workspaceId,
          ...metadata,
        },
      });

      return {
        id: customer.customer_code,
        email: customer.email,
        name: `${customer.first_name} ${customer.last_name}`,
        workspaceId,
        provider: 'paystack',
        providerCustomerId: customer.customer_code,
        metadata: customer.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error: any) {
      logger.error('[Paystack] Error creating customer:', error);
      throw new Error(`Paystack error: ${error.message}`);
    }
  }

  async getCustomer(providerCustomerId: string): Promise<BillingCustomer | null> {
    try {
      const customer: PaystackCustomer = await this.request('GET', `/customer/${providerCustomerId}`);

      return {
        id: customer.customer_code,
        email: customer.email,
        name: `${customer.first_name} ${customer.last_name}`,
        workspaceId: customer.metadata?.workspaceId || '',
        provider: 'paystack',
        providerCustomerId: customer.customer_code,
        metadata: customer.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return null;
      }
      logger.error('[Paystack] Error getting customer:', error);
      throw new Error(`Paystack error: ${error.message}`);
    }
  }

  async updateCustomer(
    providerCustomerId: string,
    updates: Partial<BillingCustomer>
  ): Promise<BillingCustomer> {
    try {
      const updateData: any = {};

      if (updates.name) {
        const [firstName, ...lastNameParts] = updates.name.split(' ');
        updateData.first_name = firstName;
        updateData.last_name = lastNameParts.join(' ') || firstName;
      }

      if (updates.metadata) {
        updateData.metadata = updates.metadata;
      }

      const customer: PaystackCustomer = await this.request(
        'PUT',
        `/customer/${providerCustomerId}`,
        updateData
      );

      return {
        id: customer.customer_code,
        email: customer.email,
        name: `${customer.first_name} ${customer.last_name}`,
        workspaceId: customer.metadata?.workspaceId || '',
        provider: 'paystack',
        providerCustomerId: customer.customer_code,
        metadata: customer.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error: any) {
      logger.error('[Paystack] Error updating customer:', error);
      throw new Error(`Paystack error: ${error.message}`);
    }
  }

  async deleteCustomer(providerCustomerId: string): Promise<void> {
    try {
      // Paystack doesn't have a delete customer endpoint
      // Instead, we deactivate the customer
      await this.request('PUT', `/customer/${providerCustomerId}`, {
        metadata: { deleted: true, deletedAt: new Date().toISOString() },
      });
      logger.info('[Paystack] Customer deactivated:', providerCustomerId);
    } catch (error: any) {
      logger.error('[Paystack] Error deleting customer:', error);
      throw new Error(`Paystack error: ${error.message}`);
    }
  }

  // ===== SUBSCRIPTION MANAGEMENT =====

  async createSubscription(
    customerId: string,
    planId: string,
    metadata?: Record<string, any>
  ): Promise<BillingSubscription> {
    try {
      const subscription: PaystackSubscription = await this.request('POST', '/subscription', {
        customer: customerId,
        plan: planId,
        metadata,
      });

      return {
        id: subscription.subscription_code,
        customerId: subscription.customer.customer_code,
        workspaceId: metadata?.workspaceId || '',
        provider: 'paystack',
        providerSubscriptionId: subscription.subscription_code,
        planId: subscription.plan.plan_code,
        planName: subscription.plan.name,
        status: this.mapSubscriptionStatus(subscription.status),
        currentPeriodStart: new Date(subscription.created_at),
        currentPeriodEnd: new Date(subscription.next_payment_date),
        cancelAtPeriodEnd: false,
        trialEnd: null,
        amount: subscription.plan.amount,
        currency: subscription.plan.currency.toLowerCase(),
        interval: subscription.plan.interval as 'month' | 'year',
        metadata: subscription.metadata,
        createdAt: new Date(subscription.created_at),
        updatedAt: new Date(),
      };
    } catch (error: any) {
      logger.error('[Paystack] Error creating subscription:', error);
      throw new Error(`Paystack error: ${error.message}`);
    }
  }

  async getSubscription(providerSubscriptionId: string): Promise<BillingSubscription | null> {
    try {
      // Paystack uses subscription codes, not IDs
      const subscription: PaystackSubscription = await this.request(
        'GET',
        `/subscription/${providerSubscriptionId}`
      );

      return {
        id: subscription.subscription_code,
        customerId: subscription.customer.customer_code,
        workspaceId: subscription.metadata?.workspaceId || '',
        provider: 'paystack',
        providerSubscriptionId: subscription.subscription_code,
        planId: subscription.plan.plan_code,
        planName: subscription.plan.name,
        status: this.mapSubscriptionStatus(subscription.status),
        currentPeriodStart: new Date(subscription.created_at),
        currentPeriodEnd: new Date(subscription.next_payment_date),
        cancelAtPeriodEnd: false,
        trialEnd: null,
        amount: subscription.plan.amount,
        currency: subscription.plan.currency.toLowerCase(),
        interval: subscription.plan.interval as 'month' | 'year',
        metadata: subscription.metadata,
        createdAt: new Date(subscription.created_at),
        updatedAt: new Date(),
      };
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return null;
      }
      logger.error('[Paystack] Error getting subscription:', error);
      throw new Error(`Paystack error: ${error.message}`);
    }
  }

  async updateSubscription(
    providerSubscriptionId: string,
    updates: { planId?: string; cancelAtPeriodEnd?: boolean }
  ): Promise<BillingSubscription> {
    try {
      // For plan changes, Paystack requires creating a new subscription
      if (updates.planId) {
        throw new Error('Plan changes not directly supported. Please cancel and create new subscription.');
      }

      // For cancellation, use disable endpoint
      if (updates.cancelAtPeriodEnd) {
        await this.cancelSubscription(providerSubscriptionId, false);
      }

      return (await this.getSubscription(providerSubscriptionId))!;
    } catch (error: any) {
      logger.error('[Paystack] Error updating subscription:', error);
      throw new Error(`Paystack error: ${error.message}`);
    }
  }

  async cancelSubscription(
    providerSubscriptionId: string,
    immediately: boolean = false
  ): Promise<BillingSubscription> {
    try {
      await this.request('POST', '/subscription/disable', {
        code: providerSubscriptionId,
        token: immediately ? 'immediate' : undefined,
      });

      const subscription = await this.getSubscription(providerSubscriptionId);
      return subscription!;
    } catch (error: any) {
      logger.error('[Paystack] Error canceling subscription:', error);
      throw new Error(`Paystack error: ${error.message}`);
    }
  }

  // ===== INVOICE MANAGEMENT =====

  async getInvoices(customerId: string, limit: number = 10): Promise<BillingInvoice[]> {
    try {
      const transactions = await this.request('GET', `/transaction?customer=${customerId}&perPage=${limit}`);

      return transactions.map((txn: any) => ({
        id: txn.reference,
        customerId,
        workspaceId: txn.metadata?.workspaceId || '',
        provider: 'paystack' as const,
        providerInvoiceId: txn.reference,
        subscriptionId: null,
        number: txn.reference,
        amount: txn.amount,
        currency: txn.currency.toLowerCase(),
        status: txn.status === 'success' ? 'paid' : 'open',
        paidAt: txn.paid_at ? new Date(txn.paid_at) : null,
        dueDate: null,
        description: txn.message || null,
        invoiceUrl: null,
        pdfUrl: null,
        metadata: txn.metadata,
        createdAt: new Date(txn.created_at),
      }));
    } catch (error: any) {
      logger.error('[Paystack] Error fetching invoices:', error);
      throw new Error(`Paystack error: ${error.message}`);
    }
  }

  async getInvoice(providerInvoiceId: string): Promise<BillingInvoice | null> {
    try {
      const transaction = await this.request('GET', `/transaction/verify/${providerInvoiceId}`);

      return {
        id: transaction.reference,
        customerId: transaction.customer?.customer_code || '',
        workspaceId: transaction.metadata?.workspaceId || '',
        provider: 'paystack',
        providerInvoiceId: transaction.reference,
        subscriptionId: null,
        number: transaction.reference,
        amount: transaction.amount,
        currency: transaction.currency.toLowerCase(),
        status: transaction.status === 'success' ? 'paid' : 'open',
        paidAt: transaction.paid_at ? new Date(transaction.paid_at) : null,
        dueDate: null,
        description: transaction.message || null,
        invoiceUrl: null,
        pdfUrl: null,
        metadata: transaction.metadata,
        createdAt: new Date(transaction.created_at),
      };
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return null;
      }
      logger.error('[Paystack] Error getting invoice:', error);
      throw new Error(`Paystack error: ${error.message}`);
    }
  }

  async getUpcomingInvoice(customerId: string): Promise<BillingInvoice | null> {
    // Paystack doesn't have upcoming invoice concept
    return null;
  }

  // ===== PAYMENT METHODS =====

  async getPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    try {
      // Paystack stores payment methods as authorizations
      const response = await this.request('GET', `/customer/${customerId}`);
      const authorizations = response.authorizations || [];

      return authorizations.map((auth: any, index: number) => ({
        id: auth.authorization_code,
        customerId,
        provider: 'paystack' as const,
        providerPaymentMethodId: auth.authorization_code,
        type: 'card' as const,
        brand: auth.card_type,
        last4: auth.last4,
        expiryMonth: parseInt(auth.exp_month),
        expiryYear: parseInt(auth.exp_year),
        isDefault: index === 0, // First authorization is default
        metadata: {},
        createdAt: new Date(),
      }));
    } catch (error: any) {
      logger.error('[Paystack] Error fetching payment methods:', error);
      throw new Error(`Paystack error: ${error.message}`);
    }
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    // Paystack doesn't have explicit default payment method
    // The most recent authorization is used by default
    logger.info('[Paystack] Default payment method concept not applicable');
  }

  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      await this.request('POST', '/customer/deactivate_authorization', {
        authorization_code: paymentMethodId,
      });
      logger.info('[Paystack] Payment method deleted:', paymentMethodId);
    } catch (error: any) {
      logger.error('[Paystack] Error deleting payment method:', error);
      throw new Error(`Paystack error: ${error.message}`);
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
      const customer = await this.getCustomer(customerId);
      
      if (!customer) {
        throw new Error('Customer not found');
      }

      const response = await this.request('POST', '/transaction/initialize', {
        email: customer.email,
        plan: planId,
        callback_url: successUrl,
        metadata: {
          cancel_url: cancelUrl,
          workspaceId: customer.workspaceId,
        },
      });

      return {
        url: response.authorization_url,
        sessionId: response.reference,
      };
    } catch (error: any) {
      logger.error('[Paystack] Error creating checkout session:', error);
      throw new Error(`Paystack error: ${error.message}`);
    }
  }

  async createPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<{ url: string }> {
    // Paystack doesn't have a customer portal like Stripe
    // Return a custom portal URL or throw not supported
    throw new Error('Customer portal not supported by Paystack. Use API endpoints to manage subscription.');
  }

  // ===== WEBHOOKS =====

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const hash = crypto
        .createHmac('sha512', secret)
        .update(payload)
        .digest('hex');

      return hash === signature;
    } catch (error: any) {
      logger.error('[Paystack] Webhook signature verification failed:', error);
      return false;
    }
  }

  parseWebhookEvent(payload: string): any {
    try {
      return JSON.parse(payload);
    } catch (error: any) {
      logger.error('[Paystack] Error parsing webhook event:', error);
      throw new Error('Invalid webhook payload');
    }
  }

  // ===== HELPER METHODS =====

  private mapSubscriptionStatus(
    status: string
  ): 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing' {
    switch (status.toLowerCase()) {
      case 'active':
        return 'active';
      case 'non-renewing':
        return 'canceled';
      case 'attention':
        return 'past_due';
      case 'completed':
        return 'canceled';
      default:
        return 'active';
    }
  }
}

