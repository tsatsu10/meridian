import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  Users,
  Database,
  Download,
  ExternalLink,
  Clock,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/cn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface GDPRCompliance {
  overallScore: number;
  lastAudit: Date;
  nextAudit: Date;
  categories: {
    dataRetention: ComplianceCategory;
    userConsent: ComplianceCategory;
    dataAccess: ComplianceCategory;
    dataDeletion: ComplianceCategory;
    dataPortability: ComplianceCategory;
    breachNotification: ComplianceCategory;
  };
}

interface ComplianceCategory {
  name: string;
  status: "compliant" | "warning" | "non-compliant";
  score: number;
  details: string;
  lastChecked: Date;
  actionItems?: string[];
}

interface DataRetentionPolicy {
  id: string;
  dataType: string;
  retentionPeriod: string;
  status: "active" | "expiring" | "expired";
  recordsCount: number;
  expiryDate?: Date;
  complianceStatus: "compliant" | "warning" | "non-compliant";
}

interface UserConsentRecord {
  userId: string;
  email: string;
  name: string;
  consentTypes: {
    marketing: boolean;
    analytics: boolean;
    essential: boolean;
    thirdParty: boolean;
  };
  consentDate: Date;
  lastUpdated: Date;
  ipAddress: string;
}

interface DataAccessRequest {
  id: string;
  userId: string;
  userEmail: string;
  requestType: "access" | "deletion" | "portability" | "rectification";
  status: "pending" | "processing" | "completed" | "rejected";
  requestDate: Date;
  completionDate?: Date;
  priority: "high" | "medium" | "low";
}

export function GDPRComplianceWidget() {
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<string>("overview");

  // Fetch GDPR compliance overview
  const { data: compliance, isLoading: complianceLoading } = useQuery<GDPRCompliance>({
    queryKey: ["gdpr-compliance"],
    queryFn: async () => {
      const response = await fetch("/api/security/gdpr/compliance");
      if (!response.ok) throw new Error("Failed to fetch GDPR compliance");
      const result = await response.json();
      return result.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch data retention policies
  const { data: retentionPolicies, isLoading: policiesLoading } = useQuery<DataRetentionPolicy[]>({
    queryKey: ["gdpr-retention-policies"],
    queryFn: async () => {
      const response = await fetch("/api/security/gdpr/retention-policies");
      if (!response.ok) throw new Error("Failed to fetch retention policies");
      const result = await response.json();
      return result.data;
    },
  });

  // Fetch consent records
  const { data: consentRecords, isLoading: consentLoading } = useQuery<UserConsentRecord[]>({
    queryKey: ["gdpr-consent-records"],
    queryFn: async () => {
      const response = await fetch("/api/security/gdpr/consent-records");
      if (!response.ok) throw new Error("Failed to fetch consent records");
      const result = await response.json();
      return result.data;
    },
  });

  // Fetch data access requests
  const { data: accessRequests, isLoading: requestsLoading } = useQuery<DataAccessRequest[]>({
    queryKey: ["gdpr-access-requests"],
    queryFn: async () => {
      const response = await fetch("/api/security/gdpr/access-requests");
      if (!response.ok) throw new Error("Failed to fetch access requests");
      const result = await response.json();
      return result.data;
    },
  });

  // Generate compliance report
  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/security/gdpr/generate-report", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to generate report");
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gdpr-compliance-report-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });

  const getStatusColor = (status: "compliant" | "warning" | "non-compliant") => {
    switch (status) {
      case "compliant":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "non-compliant":
        return "text-red-600";
    }
  };

  const getStatusIcon = (status: "compliant" | "warning" | "non-compliant") => {
    switch (status) {
      case "compliant":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "non-compliant":
        return <XCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getRequestStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      processing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  if (complianceLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Loading GDPR compliance...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const overallScore = compliance?.overallScore ?? 0;
  const scoreColor =
    overallScore >= 90 ? "text-green-600" : overallScore >= 70 ? "text-yellow-600" : "text-red-600";

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" aria-hidden="true" />
            GDPR Compliance Dashboard
          </CardTitle>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-bold",
                overallScore >= 90 && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                overallScore >= 70 &&
                  overallScore < 90 &&
                  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
                overallScore < 70 && "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              )}
            >
              Score: {overallScore}%
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateReportMutation.mutate()}
              disabled={generateReportMutation.isPending}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Track GDPR compliance, data retention, and user rights
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="retention">Data Retention</TabsTrigger>
            <TabsTrigger value="consent">User Consent</TabsTrigger>
            <TabsTrigger value="requests">Access Requests</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Overall Score */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Compliance Score</span>
                <span className={cn("text-3xl font-bold", scoreColor)}>{overallScore}%</span>
              </div>
              <Progress
                value={overallScore}
                className={cn(
                  "h-3",
                  overallScore >= 90 && "[&>div]:bg-green-600",
                  overallScore >= 70 && overallScore < 90 && "[&>div]:bg-yellow-600",
                  overallScore < 70 && "[&>div]:bg-red-600"
                )}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Last audit: {compliance?.lastAudit ? new Date(compliance.lastAudit).toLocaleDateString() : "N/A"}</span>
                <span>Next audit: {compliance?.nextAudit ? new Date(compliance.nextAudit).toLocaleDateString() : "N/A"}</span>
              </div>
            </div>

            {/* Compliance Categories */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Compliance Categories</h4>
              <div className="space-y-2">
                {compliance?.categories &&
                  Object.entries(compliance.categories).map(([key, category]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {getStatusIcon(category.status)}
                        <div className="flex-1">
                          <div className="text-sm font-medium">{category.name}</div>
                          <div className="text-xs text-muted-foreground">{category.details}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn("text-sm font-semibold", getStatusColor(category.status))}>
                          {category.score}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 border border-border rounded-lg bg-background/50">
                <div className="flex items-center gap-2 mb-1">
                  <Database className="h-4 w-4 text-blue-600" aria-hidden="true" />
                  <span className="text-xs text-muted-foreground">Active Policies</span>
                </div>
                <div className="text-xl font-bold">
                  {retentionPolicies?.filter((p) => p.status === "active").length ?? 0}
                </div>
              </div>

              <div className="p-3 border border-border rounded-lg bg-background/50">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-green-600" aria-hidden="true" />
                  <span className="text-xs text-muted-foreground">Consented Users</span>
                </div>
                <div className="text-xl font-bold">{consentRecords?.length ?? 0}</div>
              </div>

              <div className="p-3 border border-border rounded-lg bg-background/50">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-yellow-600" aria-hidden="true" />
                  <span className="text-xs text-muted-foreground">Pending Requests</span>
                </div>
                <div className="text-xl font-bold">
                  {accessRequests?.filter((r) => r.status === "pending").length ?? 0}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Data Retention Tab */}
          <TabsContent value="retention" className="mt-6">
            <ScrollArea className="h-[400px] pr-4">
              {policiesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {retentionPolicies?.map((policy) => (
                    <div
                      key={policy.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{policy.dataType}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              policy.status === "active" &&
                                "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                              policy.status === "expiring" &&
                                "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
                              policy.status === "expired" &&
                                "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            )}
                          >
                            {policy.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Retention: {policy.retentionPeriod} • {policy.recordsCount} records
                          {policy.expiryDate && ` • Expires ${new Date(policy.expiryDate).toLocaleDateString()}`}
                        </div>
                      </div>
                      {getStatusIcon(policy.complianceStatus)}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* User Consent Tab */}
          <TabsContent value="consent" className="mt-6">
            <ScrollArea className="h-[400px] pr-4">
              {consentLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {consentRecords?.map((record) => (
                    <div
                      key={record.userId}
                      className="p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium text-sm">{record.name}</div>
                          <div className="text-xs text-muted-foreground">{record.email}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(record.consentDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(record.consentTypes).map(([type, granted]) => (
                          <Badge
                            key={type}
                            variant="outline"
                            className={cn(
                              "text-xs",
                              granted
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            )}
                          >
                            {type}: {granted ? "✓" : "✗"}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Access Requests Tab */}
          <TabsContent value="requests" className="mt-6">
            <ScrollArea className="h-[400px] pr-4">
              {requestsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {accessRequests?.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{request.userEmail}</span>
                          <Badge variant="outline" className={cn("text-xs", getRequestStatusBadge(request.status))}>
                            {request.status}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {request.requestType}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Requested: {new Date(request.requestDate).toLocaleDateString()}
                          {request.completionDate &&
                            ` • Completed: ${new Date(request.completionDate).toLocaleDateString()}`}
                        </div>
                      </div>
                      {request.status === "pending" && (
                        <Button variant="outline" size="sm">
                          Process
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Action Banner */}
        {overallScore < 90 && (
          <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div className="text-xs text-yellow-900 dark:text-yellow-200">
              <strong>Action Required:</strong> Some compliance areas need attention. Review the detailed breakdown
              and take necessary actions to improve your GDPR compliance score.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

