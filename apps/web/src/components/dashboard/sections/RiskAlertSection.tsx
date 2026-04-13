import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Shield, CheckCircle, Eye, X, Clock, Users, Calendar } from "lucide-react";
import { BlurFade } from "@/components/magicui/blur-fade";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";

interface RiskAlertSectionProps {
  riskData: any;
}

interface AlertAction {
  id: string;
  label: string;
  icon: React.ElementType;
  variant: "default" | "destructive" | "outline" | "secondary";
  action: "resolve" | "acknowledge" | "dismiss" | "view";
}

const alertActions: AlertAction[] = [
  { id: "resolve", label: "Resolve", icon: CheckCircle, variant: "default", action: "resolve" },
  { id: "acknowledge", label: "Ack", icon: Eye, variant: "outline", action: "acknowledge" },
  { id: "dismiss", label: "Dismiss", icon: X, variant: "secondary", action: "dismiss" },
];

export default function RiskAlertSection({ riskData }: RiskAlertSectionProps) {
  const [processingAlerts, setProcessingAlerts] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Mutation for alert actions
  const alertActionMutation = useMutation({
    mutationFn: async ({ alertId, action, notes }: { alertId: string; action: string; notes?: string }) => {
      if (action === "resolve") {
        return await fetchApi(`/risk-detection/alerts/${alertId}/resolve`, {
          method: "POST",
          body: JSON.stringify({
            workspaceId: riskData.workspaceId,
            resolutionNotes: notes,
          }),
        });
      } else {
        return await fetchApi(`/risk-detection/alerts/${alertId}`, {
          method: "PATCH",
          body: JSON.stringify({
            status: action === "acknowledge" ? "acknowledged" : "dismissed",
            notes,
          }),
        });
      }
    },
    onSuccess: (_, variables) => {
      const actionLabels = {
        resolve: "resolved",
        acknowledge: "acknowledged",
        dismiss: "dismissed",
      };

      toast.success(`Alert ${actionLabels[variables.action as keyof typeof actionLabels]} successfully`);

      // Invalidate and refetch risk data
      queryClient.invalidateQueries({ queryKey: ["risk-analysis"] });
      queryClient.invalidateQueries({ queryKey: ["risk-alerts"] });

      setProcessingAlerts(prev => {
        const next = new Set(prev);
        next.delete(variables.alertId);
        return next;
      });
    },
    onError: (error, variables) => {
      console.error("Alert action error:", error);
      toast.error(`Failed to ${variables.action} alert`);

      setProcessingAlerts(prev => {
        const next = new Set(prev);
        next.delete(variables.alertId);
        return next;
      });
    },
  });

  const handleAlertAction = async (alertId: string, action: string) => {
    setProcessingAlerts(prev => new Set([...prev, alertId]));

    let notes = "";
    if (action === "resolve") {
      notes = prompt("Resolution notes (optional):") || "";
    }

    alertActionMutation.mutate({ alertId, action, notes });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return "bg-red-100 text-red-800 border-red-200";
      case 'high':
        return "bg-orange-100 text-orange-800 border-orange-200";
      case 'medium':
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'overdue':
        return <Clock className="h-3 w-3" />;
      case 'resource_conflict':
        return <Users className="h-3 w-3" />;
      case 'deadline_risk':
        return <Calendar className="h-3 w-3" />;
      default:
        return <AlertTriangle className="h-3 w-3" />;
    }
  };

  if (!riskData.data?.alerts || riskData.data.alerts.length === 0) {
    return null;
  }

  return (
    <BlurFade delay={0.5} inView>
      <Card className="border-red-200 bg-red-50/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertTriangle className="h-5 w-5" />
              Risk Detection System
            </CardTitle>
            <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
              {riskData.data.summary?.totalRisks} risks
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {riskData.data.alerts.slice(0, 3).map((risk: any, index: number) => (
            <div key={`dashboard-alert-risk-${risk.id}-${index}`} className="flex items-start gap-3 p-3 bg-white border border-red-200 rounded-lg">
              <Shield className="h-4 w-4 text-red-500 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm text-red-800">{risk.title}</h4>
                <p className="text-xs text-red-600 mt-1">{risk.description}</p>

                {/* Enhanced Alert Details */}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    {getTypeIcon(risk.type)}
                    <span className="capitalize">{risk.type?.replace('_', ' ')}</span>
                  </div>
                  <span>•</span>
                  <span>{risk.affectedTasks?.length || 0} tasks affected</span>
                  <span>•</span>
                  <span>Score: {risk.metrics?.riskScore || 0}</span>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <Badge variant="outline" className={cn("text-xs", getSeverityColor(risk.severity))}>
                    {risk.severity}
                  </Badge>

                  {/* Direct Action Buttons */}
                  <div className="flex items-center gap-1">
                    {alertActions.map((actionConfig) => {
                      const IconComponent = actionConfig.icon;
                      const isProcessing = processingAlerts.has(risk.id);

                      return (
                        <Button
                          key={actionConfig.id}
                          size="sm"
                          variant={actionConfig.variant}
                          onClick={() => handleAlertAction(risk.id, actionConfig.action)}
                          disabled={isProcessing}
                          className={cn(
                            "text-xs h-6 px-2",
                            isProcessing && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {isProcessing ? (
                            <div className="w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <IconComponent className="h-2.5 w-2.5" />
                          )}
                          <span className="ml-1">{actionConfig.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Bulk Actions for multiple alerts */}
          {riskData.data.alerts.length > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-red-200">
              <span className="text-xs text-red-600">Bulk Actions:</span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (confirm(`Acknowledge all ${riskData.data.alerts.length} alerts?`)) {
                      riskData.data.alerts.forEach((alert: any) => {
                        handleAlertAction(alert.id, "acknowledge");
                      });
                    }
                  }}
                  className="text-xs h-6 px-2"
                >
                  <Eye className="h-2.5 w-2.5 mr-1" />
                  Ack All
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => {
                    const notes = prompt("Resolution notes for all alerts (optional):") || "";
                    if (confirm(`Resolve all ${riskData.data.alerts.length} alerts?`)) {
                      riskData.data.alerts.forEach((alert: any) => {
                        alertActionMutation.mutate({ alertId: alert.id, action: "resolve", notes });
                      });
                    }
                  }}
                  className="text-xs h-6 px-2"
                >
                  <CheckCircle className="h-2.5 w-2.5 mr-1" />
                  Resolve All
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </BlurFade>
  );
}