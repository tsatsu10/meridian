import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { AuditLogViewer } from '../../components/audit/audit-log-viewer';
import { SecurityDashboard } from '../../components/audit/security-dashboard';
import { Shield, Activity, FileText, Settings } from 'lucide-react';

export const Route = createFileRoute('/dashboard/audit')({
  component: AuditPage,
});

function AuditPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit & Security</h1>
          <p className="text-muted-foreground">
            Monitor system activity and security events for compliance and risk management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-600" />
          <span className="text-sm font-medium text-blue-600">Security Monitoring Active</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="audit-logs" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Compliance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <SecurityDashboard />
            </div>
            <div className="space-y-6">
              <AuditLogViewer />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <SecurityDashboard />
        </TabsContent>

        <TabsContent value="audit-logs">
          <AuditLogViewer />
        </TabsContent>

        <TabsContent value="compliance">
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Compliance Dashboard
              </h3>
              <p className="text-blue-700 mb-4">
                Monitor compliance with GDPR, HIPAA, SOX, and other regulatory requirements.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h4 className="font-medium text-blue-900">GDPR Compliance</h4>
                  <div className="text-2xl font-bold text-green-600 mt-2">98%</div>
                  <p className="text-sm text-blue-600">Data protection compliant</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h4 className="font-medium text-blue-900">Audit Retention</h4>
                  <div className="text-2xl font-bold text-blue-600 mt-2">7 Years</div>
                  <p className="text-sm text-blue-600">SOX compliant retention</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h4 className="font-medium text-blue-900">Data Access</h4>
                  <div className="text-2xl font-bold text-orange-600 mt-2">24</div>
                  <p className="text-sm text-blue-600">Access requests this month</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Compliance Reports</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Monthly GDPR Report</h4>
                    <p className="text-sm text-gray-600">Data processing activities and user rights</p>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Generate
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">SOX Audit Trail</h4>
                    <p className="text-sm text-gray-600">Financial controls and access logs</p>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Generate
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">HIPAA Compliance</h4>
                    <p className="text-sm text-gray-600">Healthcare data access and security</p>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Generate
                  </button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}