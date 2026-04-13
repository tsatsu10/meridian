import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, CheckCircle, XCircle, Shield, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { SecurityAlert } from "./types";

interface SecurityAlertsListProps {
  alerts: SecurityAlert[];
  maxItems?: number;
  onViewDetails?: (alert: SecurityAlert) => void;
  onResolve?: (alertId: string) => void;
}

export function SecurityAlertsList({
  alerts,
  maxItems = 10,
  onViewDetails,
  onResolve,
}: SecurityAlertsListProps) {
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());

  const displayedAlerts = alerts.slice(0, maxItems);

  const getSeverityIcon = (type: SecurityAlert["type"]) => {
    switch (type) {
      case "critical":
        return <XCircle className="h-4 w-4 text-red-500" aria-label="Critical alert" />;
      case "high":
        return <AlertTriangle className="h-4 w-4 text-orange-500" aria-label="High severity alert" />;
      case "medium":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" aria-label="Medium severity alert" />;
      case "low":
        return <Shield className="h-4 w-4 text-blue-500" aria-label="Low severity alert" />;
    }
  };

  const getSeverityBadgeColor = (type: SecurityAlert["type"]) => {
    switch (type) {
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    }
  };

  const toggleExpanded = (alertId: string) => {
    setExpandedAlerts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(alertId)) {
        newSet.delete(alertId);
      } else {
        newSet.add(alertId);
      }
      return newSet;
    });
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-600" aria-hidden="true" />
            Security Alerts
          </CardTitle>
          {alerts.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {alerts.filter(a => !a.resolved).length} active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displayedAlerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" aria-hidden="true" />
            <p className="text-sm">No security alerts</p>
            <p className="text-xs mt-1">All systems operating normally</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {displayedAlerts.map((alert) => {
                const isExpanded = expandedAlerts.has(alert.id);
                
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "p-4 border rounded-lg transition-all duration-200",
                      alert.resolved
                        ? "bg-muted/30 border-muted"
                        : "bg-background border-border hover:shadow-md",
                      "relative"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getSeverityIcon(alert.type)}</div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{alert.title}</h4>
                          <Badge className={cn("text-xs", getSeverityBadgeColor(alert.type))}>
                            {alert.type}
                          </Badge>
                        </div>
                        
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {alert.description}
                        </p>
                        
                        {isExpanded && (
                          <div className="mt-3 space-y-2 text-xs">
                            {alert.userId && (
                              <div>
                                <span className="font-medium">User:</span> {alert.userId}
                              </div>
                            )}
                            {alert.ipAddress && (
                              <div>
                                <span className="font-medium">IP Address:</span> {alert.ipAddress}
                              </div>
                            )}
                            {alert.action && (
                              <div>
                                <span className="font-medium">Action:</span> {alert.action}
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-muted-foreground">
                            {new Date(alert.timestamp).toLocaleString()}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => toggleExpanded(alert.id)}
                              aria-expanded={isExpanded}
                              aria-label={isExpanded ? "Show less details" : "Show more details"}
                            >
                              {isExpanded ? "Less" : "More"}
                              <ChevronRight
                                className={cn(
                                  "h-3 w-3 ml-1 transition-transform",
                                  isExpanded && "rotate-90"
                                )}
                                aria-hidden="true"
                              />
                            </Button>
                            
                            {!alert.resolved && onResolve && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() => onResolve(alert.id)}
                                aria-label="Mark alert as resolved"
                              >
                                Resolve
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {alert.resolved && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="h-4 w-4 text-green-500" aria-label="Resolved" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

