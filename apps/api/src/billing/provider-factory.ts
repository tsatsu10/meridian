/**
 * Billing Provider Factory
 * Creates appropriate billing provider based on configuration
 */

import { IBillingProvider, BillingProvider } from './types';
import { StripeProvider } from './providers/stripe';
import { PaystackProvider } from './providers/paystack';
import logger from '../utils/logger';

export class BillingProviderFactory {
  private static stripeInstance: StripeProvider | null = null;
  private static paystackInstance: PaystackProvider | null = null;

  static getProvider(provider: BillingProvider): IBillingProvider {
    switch (provider) {
      case 'stripe':
        return this.getStripeProvider();
      case 'paystack':
        return this.getPaystackProvider();
      default:
        throw new Error(`Unsupported billing provider: ${provider}`);
    }
  }

  static getDefaultProvider(): IBillingProvider {
    // Try Stripe first, then Paystack
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;

    if (stripeKey) {
      return this.getStripeProvider();
    } else if (paystackKey) {
      return this.getPaystackProvider();
    }

    throw new Error('No billing provider configured. Set STRIPE_SECRET_KEY or PAYSTACK_SECRET_KEY');
  }

  private static getStripeProvider(): StripeProvider {
    if (!this.stripeInstance) {
      const apiKey = process.env.STRIPE_SECRET_KEY;
      if (!apiKey) {
        throw new Error('STRIPE_SECRET_KEY not configured');
      }
      this.stripeInstance = new StripeProvider(apiKey);
      logger.info('[Billing] Stripe provider initialized');
    }
    return this.stripeInstance;
  }

  private static getPaystackProvider(): PaystackProvider {
    if (!this.paystackInstance) {
      const secretKey = process.env.PAYSTACK_SECRET_KEY;
      if (!secretKey) {
        throw new Error('PAYSTACK_SECRET_KEY not configured');
      }
      this.paystackInstance = new PaystackProvider(secretKey);
      logger.info('[Billing] Paystack provider initialized');
    }
    return this.paystackInstance;
  }

  static isProviderConfigured(provider: BillingProvider): boolean {
    switch (provider) {
      case 'stripe':
        return !!process.env.STRIPE_SECRET_KEY;
      case 'paystack':
        return !!process.env.PAYSTACK_SECRET_KEY;
      default:
        return false;
    }
  }

  static getConfiguredProviders(): BillingProvider[] {
    const providers: BillingProvider[] = [];
    if (process.env.STRIPE_SECRET_KEY) providers.push('stripe');
    if (process.env.PAYSTACK_SECRET_KEY) providers.push('paystack');
    return providers;
  }
}

