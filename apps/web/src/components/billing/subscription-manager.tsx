/**
 * 📊 Subscription Management Component
 * 
 * Displays and manages user's active subscriptions
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CreditCard,
  Calendar,
  DollarSign,
  Download,
  ExternalLink,
  X,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import { formatDistanceToNow, format } from "date-fns";

interface Subscription {
  id: string;
  providerSubscriptionId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  metadata: {
    widgetId?: string;
    widgetName?: string;
  };
  createdAt: string;
}

interface Invoice {
  id: string;
  providerInvoiceId: string;
  amount: number;
  currency: string;
  status: string;
  invoiceUrl: string | null;
  pdfUrl: string | null;
  createdAt: string;
}

const STATUS_CONFIG = {
  active: {
    label: "Active",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    icon: CheckCircle,
  },
  trialing: {
    label: "Trial",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    icon: Clock,
  },
  canceled: {
    label: "Canceled",
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-900/30",
    icon: X,
  },
  past_due: {
    label: "Past Due",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    icon: AlertTriangle,
  },
  unpaid: {
    label: "Unpaid",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    icon: AlertTriangle,
  },
};

export function SubscriptionManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [subscriptionToCancel, setSubscriptionToCancel] = useState<string | null>(null);
  const [cancelImmediate, setCancelImmediate] = useState(false);

  // Fetch subscriptions
  const { data: subscriptionsData, isLoading: subscriptionsLoading } = useQuery({
    queryKey: ['user-subscriptions', user?.id],
    queryFn: async () => {
      const response = await api.get(`/api/billing/subscriptions/${user?.id}`);
      return response?.data || response;
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  // Fetch invoices
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ['user-invoices', user?.id],
    queryFn: async () => {
      const response = await api.get(`/api/billing/invoices/${user?.id}`);
      return response?.data || response;
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ subscriptionId, immediate }: { subscriptionId: string; immediate: boolean }) => {
      const response = await api.post(`/api/billing/subscriptions/${subscriptionId}/cancel`, {
        immediate,
      });
      return response?.data || response;
    },
    onSuccess: (data, variables) => {
      toast.success(
        variables.immediate
          ? "Subscription cancelled immediately"
          : "Subscription will cancel at end of billing period"
      );
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] });
      setSubscriptionToCancel(null);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to cancel subscription");
    },
  });

  // Open billing portal mutation
  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/billing/portal', {
        userId: user?.id,
        returnUrl: window.location.href,
      });
      return response?.data || response;
    },
    onSuccess: (data) => {
      const portalData = data?.data || data;
      if (portalData?.url) {
        window.location.href = portalData.url;
      } else {
        toast.error("Failed to open billing portal");
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to open billing portal");
    },
  });

  const subscriptions: Subscription[] = subscriptionsData?.data || subscriptionsData || [];
  const invoices: Invoice[] = invoicesData?.data || invoicesData || [];

  const activeSubscriptions = subscriptions.filter(s => s.status === "active" || s.status === "trialing");
  const canceledSubscriptions = subscriptions.filter(s => s.status === "canceled");

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  if (subscriptionsLoading || invoicesLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-muted rounded w-1/4" />
              <div className="h-20 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Subscriptions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Subscriptions</CardTitle>
              <CardDescription>
                Manage your premium widget subscriptions
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Manage Billing
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeSubscriptions.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-semibold mb-2">No Active Subscriptions</h3>
              <p className="text-sm text-muted-foreground mb-4">
                You don't have any premium subscriptions yet
              </p>
              <Button variant="outline" onClick={() => { window.location.href = '/dashboard/billing'; }}>
                View billing
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeSubscriptions.map((subscription) => {
                const statusConfig = STATUS_CONFIG[subscription.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.active;
                const StatusIcon = statusConfig.icon;

                return (
                  <Card key={subscription.id} className="border-2">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4">
                          <div className={cn("p-3 rounded-lg", statusConfig.bgColor)}>
                            <StatusIcon className={cn("h-6 w-6", statusConfig.color)} />
                          </div>
                          <div>
                            <h4 className="font-semibold text-lg">
                              {subscription.metadata?.widgetName || "Premium Widget"}
                            </h4>
                            <div className="flex items-center gap-3 mt-2">
                              <Badge className={statusConfig.bgColor}>
                                <span className={statusConfig.color}>{statusConfig.label}</span>
                              </Badge>
                              {subscription.cancelAtPeriodEnd && (
                                <Badge variant="outline" className="text-orange-600">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Canceling
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator className="my-4" />

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">Started</p>
                          <p className="font-medium">
                            {format(new Date(subscription.createdAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Current Period</p>
                          <p className="font-medium">
                            {format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Status</p>
                          <p className="font-medium capitalize">{subscription.status}</p>
                        </div>
                      </div>

                      {!subscription.cancelAtPeriodEnd && subscription.status === "active" && (
                        <div className="flex gap-2 mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSubscriptionToCancel(subscription.providerSubscriptionId)}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel Subscription
                          </Button>
                        </div>
                      )}

                      {subscription.cancelAtPeriodEnd && (
                        <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                          <p className="text-sm text-orange-800 dark:text-orange-200">
                            <AlertTriangle className="h-4 w-4 inline mr-2" />
                            This subscription will end on{' '}
                            <strong>{format(new Date(subscription.currentPeriodEnd), 'MMMM d, yyyy')}</strong>
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>
            View and download your past invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No invoices yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.slice(0, 10).map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-2 rounded-lg",
                      invoice.status === "paid" 
                        ? "bg-green-100 dark:bg-green-900/30" 
                        : "bg-orange-100 dark:bg-orange-900/30"
                    )}>
                      <DollarSign className={cn(
                        "h-5 w-5",
                        invoice.status === "paid" 
                          ? "text-green-600 dark:text-green-400" 
                          : "text-orange-600 dark:text-orange-400"
                      )} />
                    </div>
                    <div>
                      <p className="font-medium">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(invoice.createdAt), 'MMM d, yyyy')}
                        <Badge variant="outline" className="text-xs ml-2">
                          {invoice.status}
                        </Badge>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {invoice.pdfUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(invoice.pdfUrl!, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                    )}
                    {invoice.invoiceUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(invoice.invoiceUrl!, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Canceled Subscriptions */}
      {canceledSubscriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Canceled Subscriptions</CardTitle>
            <CardDescription>
              Previously active subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {canceledSubscriptions.map((subscription) => (
                <div
                  key={subscription.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-900/30">
                      <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {subscription.metadata?.widgetName || "Premium Widget"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Canceled {subscription.canceledAt 
                          ? formatDistanceToNow(new Date(subscription.canceledAt), { addSuffix: true })
                          : 'recently'
                        }
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-gray-600">
                    Ended
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog
        open={!!subscriptionToCancel}
        onOpenChange={(open) => !open && setSubscriptionToCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Choose when you want to cancel your subscription:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-4">
            <div
              className={cn(
                "p-4 border-2 rounded-lg cursor-pointer transition-all",
                !cancelImmediate ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
              )}
              onClick={() => setCancelImmediate(false)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {!cancelImmediate ? (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-medium">Cancel at Period End</p>
                  <p className="text-sm text-muted-foreground">
                    Keep access until your current billing period ends
                  </p>
                </div>
              </div>
            </div>

            <div
              className={cn(
                "p-4 border-2 rounded-lg cursor-pointer transition-all",
                cancelImmediate ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
              )}
              onClick={() => setCancelImmediate(true)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {cancelImmediate ? (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-medium">Cancel Immediately</p>
                  <p className="text-sm text-muted-foreground">
                    Lose access right away, no refunds
                  </p>
                </div>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (subscriptionToCancel) {
                  cancelMutation.mutate({
                    subscriptionId: subscriptionToCancel,
                    immediate: cancelImmediate,
                  });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Canceling...
                </>
              ) : (
                "Confirm Cancellation"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

