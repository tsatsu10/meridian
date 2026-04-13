/**
 * Billing Provider Abstraction
 * Supports multiple payment providers (Stripe, Paystack)
 */

export type BillingProvider = 'stripe' | 'paystack';

export interface BillingCustomer {
  id: string;
  email: string;
  name: string;
  workspaceId: string;
  provider: BillingProvider;
  providerCustomerId: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingSubscription {
  id: string;
  customerId: string;
  workspaceId: string;
  provider: BillingProvider;
  providerSubscriptionId: string;
  planId: string;
  planName: string;
  status: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date | null;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingInvoice {
  id: string;
  customerId: string;
  workspaceId: string;
  provider: BillingProvider;
  providerInvoiceId: string;
  subscriptionId?: string | null;
  number: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  paidAt?: Date | null;
  dueDate?: Date | null;
  description?: string | null;
  invoiceUrl?: string | null;
  pdfUrl?: string | null;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface PaymentMethod {
  id: string;
  customerId: string;
  provider: BillingProvider;
  providerPaymentMethodId: string;
  type: 'card' | 'bank_account' | 'wallet';
  brand?: string; // visa, mastercard, etc.
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface BillingPlan {
  id: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    projects?: number;
    members?: number;
    storage?: number; // GB
  };
  metadata?: Record<string, any>;
}

// Abstract interface all providers must implement
export interface IBillingProvider {
  // Customer management
  createCustomer(email: string, name: string, workspaceId: string, metadata?: Record<string, any>): Promise<BillingCustomer>;
  getCustomer(providerCustomerId: string): Promise<BillingCustomer | null>;
  updateCustomer(providerCustomerId: string, updates: Partial<BillingCustomer>): Promise<BillingCustomer>;
  deleteCustomer(providerCustomerId: string): Promise<void>;

  // Subscription management
  createSubscription(customerId: string, planId: string, metadata?: Record<string, any>): Promise<BillingSubscription>;
  getSubscription(providerSubscriptionId: string): Promise<BillingSubscription | null>;
  updateSubscription(providerSubscriptionId: string, updates: { planId?: string; cancelAtPeriodEnd?: boolean }): Promise<BillingSubscription>;
  cancelSubscription(providerSubscriptionId: string, immediately?: boolean): Promise<BillingSubscription>;

  // Invoice management
  getInvoices(customerId: string, limit?: number): Promise<BillingInvoice[]>;
  getInvoice(providerInvoiceId: string): Promise<BillingInvoice | null>;
  getUpcomingInvoice(customerId: string): Promise<BillingInvoice | null>;

  // Payment methods
  getPaymentMethods(customerId: string): Promise<PaymentMethod[]>;
  setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void>;
  deletePaymentMethod(paymentMethodId: string): Promise<void>;

  // Checkout
  createCheckoutSession(customerId: string, planId: string, successUrl: string, cancelUrl: string): Promise<{ url: string; sessionId: string }>;
  createPortalSession(customerId: string, returnUrl: string): Promise<{ url: string }>;

  // Webhooks
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;
  parseWebhookEvent(payload: string): any;
}

