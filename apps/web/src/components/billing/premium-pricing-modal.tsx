/**
 * 💎 Premium Widget Pricing Modal
 * 
 * Shows pricing options and handles checkout for premium widgets
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Crown,
  Check,
  Sparkles,
  Zap,
  Shield,
  TrendingUp,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import useWorkspaceStore from "@/store/workspace";

interface PremiumPricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widget: {
    id: string;
    name: string;
    description: string | null;
    features?: string[];
  };
}

const PRICING_OPTIONS = [
  {
    id: "one_time",
    name: "Lifetime Access",
    price: 29.99,
    interval: null,
    description: "One-time payment, yours forever",
    features: [
      "Lifetime access to widget",
      "All future updates included",
      "Priority support",
      "No recurring fees",
    ],
    icon: Crown,
    popular: true,
  },
  {
    id: "subscription",
    name: "Monthly Subscription",
    price: 9.99,
    interval: "month",
    description: "Cancel anytime, no commitment",
    features: [
      "Access while subscribed",
      "All updates included",
      "Standard support",
      "7-day free trial",
    ],
    icon: Zap,
    popular: false,
  },
];

export function PremiumPricingModal({
  open,
  onOpenChange,
  widget,
}: PremiumPricingModalProps) {
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();
  const [selectedPlan, setSelectedPlan] = useState<string>("one_time");
  const [isProcessing, setIsProcessing] = useState(false);

  const checkoutMutation = useMutation({
    mutationFn: async (pricingModel: string) => {
      const response = await api.post("/api/billing/checkout", {
        widgetId: widget.id,
        pricingModel,
        interval: pricingModel === "subscription" ? "month" : undefined,
        userEmail: user?.email,
        userId: user?.id,
        workspaceId: workspace?.id,
      });
      return response?.data || response;
    },
    onSuccess: (data) => {
      const checkoutData = data?.data || data;
      
      if (checkoutData?.url) {
        // Redirect to Stripe Checkout
        window.location.href = checkoutData.url;
      } else {
        toast.error("Failed to create checkout session");
        setIsProcessing(false);
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to start checkout");
      setIsProcessing(false);
    },
  });

  const handlePurchase = () => {
    if (!user || !workspace) {
      toast.error("Please sign in to purchase");
      return;
    }

    setIsProcessing(true);
    checkoutMutation.mutate(selectedPlan);
  };

  const selectedOption = PRICING_OPTIONS.find(opt => opt.id === selectedPlan);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Upgrade to Premium</DialogTitle>
              <DialogDescription className="text-base mt-1">
                Unlock {widget.name} with premium features
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Widget Features */}
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              What's Included
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(widget.features || [
                "Advanced analytics and insights",
                "Real-time data updates",
                "Customizable dashboard views",
                "Priority customer support",
                "Regular feature updates",
                "Export and reporting tools",
              ]).map((feature, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Separator className="my-6" />

        {/* Pricing Options */}
        <div>
          <h3 className="font-semibold mb-4">Choose Your Plan</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PRICING_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedPlan === option.id;
              
              return (
                <Card
                  key={option.id}
                  className={cn(
                    "cursor-pointer transition-all relative",
                    isSelected 
                      ? "border-2 border-primary shadow-lg" 
                      : "border-2 border-transparent hover:border-primary/50"
                  )}
                  onClick={() => setSelectedPlan(option.id)}
                >
                  {option.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0">
                      Most Popular
                    </Badge>
                  )}
                  
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{option.name}</h4>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="h-6 w-6 text-primary" />
                      )}
                    </div>

                    <div className="mb-4">
                      <span className="text-3xl font-bold">${option.price}</span>
                      {option.interval && (
                        <span className="text-muted-foreground">/{option.interval}</span>
                      )}
                    </div>

                    <ul className="space-y-2">
                      {option.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Security & Trust Badges */}
        <div className="flex items-center justify-center gap-6 py-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Secure Checkout</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            <span>Powered by Stripe</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>30-Day Money Back</span>
          </div>
        </div>

        {/* Purchase Button */}
        <Button
          size="lg"
          className="w-full gap-2"
          onClick={handlePurchase}
          disabled={isProcessing || checkoutMutation.isPending}
        >
          {isProcessing || checkoutMutation.isPending ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Crown className="h-5 w-5" />
              Purchase for ${selectedOption?.price} {selectedOption?.interval ? `/${selectedOption.interval}` : ""}
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground mt-4">
          By purchasing, you agree to our Terms of Service and Privacy Policy.
          {selectedPlan === "subscription" && " You can cancel your subscription anytime."}
        </p>
      </DialogContent>
    </Dialog>
  );
}

