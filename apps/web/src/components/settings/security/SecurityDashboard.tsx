import { Shield, AlertTriangle, Activity, Lock, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { useAIThreatDetection } from "@/hooks/use-ai-threat-detection";
import { useSecurityAnalytics } from "@/hooks/use-security-analytics";
import { SecurityScore } from "@/types/security";

interface SecurityDashboardProps {
  userId: string;
  workspaceId: string;
}

export function SecurityDashboard({ userId, workspaceId }: SecurityDashboardProps) {
  const { threats, analyzing } = useAIThreatDetection(userId);
  const { securityScore, loading } = useSecurityAnalytics(userId);
  const [recommendations, setRecommendations] = useState<SecurityRecommendation[]>([]);

  // Real-time security monitoring
  useEffect(() => {
    const monitor = new SecurityMonitor({
      userId,
      workspaceId,
      onThreatDetected: (threat) => {
        toast.error(`Security Alert: ${threat.description}`);
      }
    });

    return () => monitor.disconnect();
  }, [userId, workspaceId]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-white dark:bg-gray-900 p-6 rounded-lg">
      {/* Security Score Card */}
      <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-xl shadow-lg border border-blue-200 dark:border-blue-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Security Score</h3>
          <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
          {loading ? "..." : `${securityScore.overall}%`}
        </div>
        <div className="mt-4 space-y-2">
          {Object.entries(securityScore.factors).map(([factor, score]) => (
            <div key={factor} className="flex items-center justify-between">
              <span className="text-sm">{factor}</span>
              <span className="text-sm font-semibold">{score}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Active Threats Card */}
      <div className="p-6 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800 rounded-xl shadow-lg border border-red-200 dark:border-red-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Active Threats</h3>
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <div className="space-y-4">
          {analyzing ? (
            <div className="animate-pulse">Analyzing security...</div>
          ) : threats.length === 0 ? (
            <div className="text-green-600 dark:text-green-400">No active threats detected</div>
          ) : (
            threats.map((threat) => (
              <div key={threat.id} className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <p className="font-medium">{threat.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{threat.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Security Activity Card */}
      <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-xl shadow-lg border border-green-200 dark:border-green-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Recent Activity</h3>
          <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <div className="space-y-4">
          <SecurityActivityTimeline userId={userId} />
        </div>
      </div>
    </div>
  );
}