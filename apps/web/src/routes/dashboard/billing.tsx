/**
 * 💳 Billing & Subscriptions Page
 * 
 * Manage subscriptions, view invoices, and billing settings
 */

import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Package,
  TrendingUp,
  DollarSign,
  CheckCircle,
} from "lucide-react";
import { withErrorBoundary } from "@/components/dashboard/universal-error-boundary";
import { SubscriptionManager } from "@/components/billing/subscription-manager";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import NumberTicker from "@/components/magicui/number-ticker";

export const Route = createFileRoute("/dashboard/billing")({
  component: withErrorBoundary(BillingPage, "Billing & Subscriptions"),
});

function BillingPage() {
  const { user } = useAuth();

  // Fetch billing stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['billing-stats', user?.id],
    queryFn: async () => {
      const [subscriptions, invoices] = await Promise.all([
        api.get(`/api/billing/subscriptions/${user?.id}`),
        api.get(`/api/billing/invoices/${user?.id}`),
      ]);

      const subs = subscriptions?.data?.data || subscriptions?.data || [];
      const invs = invoices?.data?.data || invoices?.data || [];

      const activeCount = subs.filter((s: any) => s.status === "active" || s.status === "trialing").length;
      const totalSpent = invs
        .filter((i: any) => i.status === "paid")
        .reduce((sum: number, i: any) => sum + (i.amount || 0), 0);

      return {
        activeSubscriptions: activeCount,
        totalInvoices: invs.length,
        totalSpent,
        currency: invs[0]?.currency || "usd",
      };
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  const stats = statsData || {
    activeSubscriptions: 0,
    totalInvoices: 0,
    totalSpent: 0,
    currency: "usd",
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-primary" />
            Billing & Subscriptions
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your premium subscriptions and billing information
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? (
                    <span className="text-muted-foreground">--</span>
                  ) : (
                    <NumberTicker value={stats.activeSubscriptions} />
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Invoices</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? (
                    <span className="text-muted-foreground">--</span>
                  ) : (
                    <NumberTicker value={stats.totalInvoices} />
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? (
                    <span className="text-muted-foreground">--</span>
                  ) : (
                    formatCurrency(stats.totalSpent, stats.currency)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Monthly Spending</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(stats.activeSubscriptions * 999, stats.currency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Message (from query params) */}
      {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('success') === 'true' && (
        <Card className="border-2 border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900 dark:text-green-200">
                  Payment Successful!
                </h3>
                <p className="text-sm text-green-800 dark:text-green-300 mt-1">
                  Your premium widget has been activated. Check your dashboard to start using it!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Manager */}
      <SubscriptionManager />

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            Common questions about billing and subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">📧 Contact Support</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Have billing questions? Our support team is here to help.
              </p>
              <Button variant="outline" size="sm">
                Email Support
              </Button>
            </div>

            <div>
              <h4 className="font-semibold mb-2">🔒 Secure Payments</h4>
              <p className="text-sm text-muted-foreground mb-3">
                All transactions are secured by Stripe with 256-bit SSL encryption.
              </p>
              <Badge variant="outline">PCI Compliant</Badge>
            </div>

            <div>
              <h4 className="font-semibold mb-2">💰 Refund Policy</h4>
              <p className="text-sm text-muted-foreground mb-3">
                30-day money-back guarantee on all one-time purchases.
              </p>
              <Button variant="ghost" size="sm">
                View Policy
              </Button>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
