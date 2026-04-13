import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  CreditCard, 
  Download, 
  Calendar, 
  Check, 
  X,
  Crown,
  Star,
  Zap,
  Users,
  FileText,
  Plus,
  CheckCircle,
  Sparkles,
  HardDrive,
  Folder,
  AlertTriangle,
  Loader2,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import LazyDashboardLayout from "@/components/performance/lazy-dashboard-layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "@/constants/urls";
import useWorkspaceStore from "@/store/workspace";

import { withErrorBoundary } from "@/components/dashboard/universal-error-boundary";

export const Route = createFileRoute("/dashboard/settings/billing")({
  component: withErrorBoundary(BillingSettings, "Billing Settings"),
});

interface BillingPlan {
  id: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  interval: string;
  features: string[];
  limits: {
    projects?: number;
    members?: number;
    storage?: number;
  };
}

interface Subscription {
  plan: string;
  status: string;
  price: string;
  nextBilling: string;
  features: string[];
  limits: {
    projects?: number;
    members?: number;
    storage?: number;
  };
}

interface PaymentMethod {
  id: string;
  type: string;
  brand?: string;
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: string;
  paidAt: string | null;
  description: string | null;
  pdfUrl: string | null;
  createdAt: string;
}

interface Usage {
  projects: { current: number; limit: number };
  members: { current: number; limit: number };
  storage: { current: number; limit: number };
}

function BillingSettings() {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const currentWorkspace = workspace;
  const queryClient = useQueryClient();

  // Fetch available plans
  const { data: plansData } = useQuery({
    queryKey: ["billing-plans"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/billing/plans`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch plans");
      return response.json();
    },
  });

  const plans: BillingPlan[] = plansData?.data || [];

  // Fetch current subscription
  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["subscription", currentWorkspace?.id],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/billing/subscription?workspaceId=${currentWorkspace?.id}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch subscription");
      return response.json();
    },
    enabled: !!currentWorkspace?.id,
  });

  const subscription: Subscription = subscriptionData?.data;

  // Fetch payment methods
  const { data: paymentMethodsData, isLoading: paymentMethodsLoading } = useQuery({
    queryKey: ["payment-methods", currentWorkspace?.id],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/billing/payment-methods?workspaceId=${currentWorkspace?.id}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch payment methods");
      return response.json();
    },
    enabled: !!currentWorkspace?.id,
  });

  const paymentMethods: PaymentMethod[] = paymentMethodsData?.data || [];

  // Fetch invoices
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ["invoices", currentWorkspace?.id],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/billing/invoices?workspaceId=${currentWorkspace?.id}&limit=10`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch invoices");
      return response.json();
    },
    enabled: !!currentWorkspace?.id,
  });

  const invoices: Invoice[] = invoicesData?.data || [];

  // Fetch usage
  const { data: usageData } = useQuery({
    queryKey: ["usage", currentWorkspace?.id],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/billing/usage?workspaceId=${currentWorkspace?.id}`,
        { credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch usage");
      return response.json();
    },
    enabled: !!currentWorkspace?.id,
  });

  const usage: Usage = usageData?.data;

  // Create checkout session mutation
  const checkoutMutation = useMutation({
    mutationFn: async ({ planId, provider }: { planId: string; provider?: 'stripe' | 'paystack' }) => {
      const response = await fetch(`${API_BASE_URL}/billing/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          workspaceId: currentWorkspace?.id,
          planId,
          provider,
        }),
      });
      if (!response.ok) throw new Error("Failed to create checkout session");
      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to checkout
      window.location.href = data.data.url;
    },
    onError: () => {
      toast.error("Failed to initiate checkout");
    },
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: async (immediately: boolean) => {
      const response = await fetch(`${API_BASE_URL}/billing/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          workspaceId: currentWorkspace?.id,
          immediately,
        }),
      });
      if (!response.ok) throw new Error("Failed to cancel subscription");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      toast.success(data.message);
    },
    onError: () => {
      toast.error("Failed to cancel subscription");
    },
  });

  // Open billing portal mutation
  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE_URL}/billing/portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          workspaceId: currentWorkspace?.id,
        }),
      });
      if (!response.ok) throw new Error("Failed to open portal");
      return response.json();
    },
    onSuccess: (data) => {
      window.location.href = data.data.url;
    },
    onError: () => {
      toast.error("Failed to open billing portal");
    },
  });

  const handleUpgrade = (planId: string) => {
    checkoutMutation.mutate({ planId });
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    window.open(`${API_BASE_URL}/billing/invoices/${invoiceId}/download?workspaceId=${currentWorkspace?.id}`, '_blank');
  };

  const handleManagePayment = () => {
    portalMutation.mutate();
  };

  const handleCancelSubscription = () => {
    cancelMutation.mutate(false); // Cancel at period end
  };

  if (!currentWorkspace) {
    return (
      <LazyDashboardLayout>
        <div className="p-8">
          <div className="text-center">
            <p className="text-muted-foreground">No workspace selected</p>
          </div>
        </div>
      </LazyDashboardLayout>
    );
  }

  const currentPlan = subscription?.plan || 'Free';

  return (
    <LazyDashboardLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Billing & Subscription</h1>
          <p className="text-muted-foreground mt-2">
            Manage your subscription, payment methods, and billing history
          </p>
        </div>

        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subscriptionLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">{currentPlan}</h3>
                    <p className="text-muted-foreground">{subscription?.price || 'Free forever'}</p>
                  </div>
                  <Badge variant={subscription?.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                    {subscription?.status || 'active'}
                  </Badge>
                </div>

                {subscription?.nextBilling && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Next billing date:{' '}
                      {new Date(subscription.nextBilling).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {currentPlan !== 'Free' && (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleManagePayment}>
                      <Settings className="w-4 h-4 mr-2" />
                      Manage Payment
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline">
                          Cancel Subscription
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Your subscription will remain active until the end of the current billing period.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                          <AlertDialogAction onClick={handleCancelSubscription}>
                            Cancel at Period End
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Statistics */}
        {usage && (
          <Card>
            <CardHeader>
              <CardTitle>Usage</CardTitle>
              <CardDescription>
                Current usage across your workspace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Projects */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Folder className="w-4 h-4" />
                    Projects
                  </span>
                  <span className="font-medium">
                    {usage.projects.current} / {usage.projects.limit === -1 ? '∞' : usage.projects.limit}
                  </span>
                </div>
                {usage.projects.limit !== -1 && (
                  <Progress value={(usage.projects.current / usage.projects.limit) * 100} />
                )}
              </div>

              {/* Members */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Team Members
                  </span>
                  <span className="font-medium">
                    {usage.members.current} / {usage.members.limit === -1 ? '∞' : usage.members.limit}
                  </span>
                </div>
                {usage.members.limit !== -1 && (
                  <Progress value={(usage.members.current / usage.members.limit) * 100} />
                )}
              </div>

              {/* Storage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4" />
                    Storage
                  </span>
                  <span className="font-medium">
                    {usage.storage.current}GB / {usage.storage.limit === -1 ? '∞' : `${usage.storage.limit}GB`}
                  </span>
                </div>
                {usage.storage.limit !== -1 && (
                  <Progress value={(usage.storage.current / usage.storage.limit) * 100} />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Plans */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrent = plan.name.toLowerCase() === currentPlan.toLowerCase();
              const isPro = plan.id === 'pro';
              const isEnterprise = plan.id === 'enterprise';

              return (
                <Card key={plan.id} className={isCurrent ? 'border-primary' : ''}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {plan.id === 'free' && <Star className="w-5 h-5" />}
                        {isPro && <Zap className="w-5 h-5 text-primary" />}
                        {isEnterprise && <Crown className="w-5 h-5 text-yellow-500" />}
                        {plan.name}
                      </CardTitle>
                      {isCurrent && (
                        <Badge>Current</Badge>
                      )}
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-3xl font-bold">
                        {plan.amount === 0 ? 'Free' : `$${(plan.amount / 100).toFixed(2)}`}
                      </div>
                      {plan.amount > 0 && (
                        <p className="text-sm text-muted-foreground">
                          per {plan.interval}
                        </p>
                      )}
                    </div>

                    <ul className="space-y-2">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {!isCurrent && plan.amount > 0 && (
                      <Button
                        className="w-full"
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={checkoutMutation.isPending}
                      >
                        {checkoutMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          `Upgrade to ${plan.name}`
                        )}
                      </Button>
                    )}

                    {isCurrent && plan.amount > 0 && (
                      <Button variant="outline" className="w-full" disabled>
                        <Check className="w-4 h-4 mr-2" />
                        Current Plan
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>Manage your payment methods</CardDescription>
              </div>
              <Button onClick={handleManagePayment}>
                <Plus className="w-4 h-4 mr-2" />
                Add Method
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {paymentMethodsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : paymentMethods.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">
                  No payment methods on file
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between border rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">
                            {method.brand} •••• {method.last4}
                          </span>
                          {method.isDefault && (
                            <Badge variant="outline">Default</Badge>
                          )}
                        </div>
                        {method.expiryMonth && method.expiryYear && (
                          <p className="text-sm text-muted-foreground">
                            Expires {method.expiryMonth}/{method.expiryYear}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing History */}
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>View and download past invoices</CardDescription>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">
                  No invoices yet
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{invoice.number}</span>
                        <Badge
                          variant={invoice.status === 'paid' ? 'default' : 'secondary'}
                          className="capitalize"
                        >
                          {invoice.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(invoice.createdAt).toLocaleDateString()}
                        {invoice.description && ` - ${invoice.description}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold">
                        ${(invoice.amount / 100).toFixed(2)}
                      </span>
                      {invoice.pdfUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadInvoice(invoice.id)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </LazyDashboardLayout>
  );
}
