import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { SecurityDashboard } from "@/components/settings/security/SecurityDashboard";
import { SecuritySettingsForm } from "@/components/settings/security/SecuritySettingsForm";
import { EnhancedAuthentication } from "@/components/settings/security/EnhancedAuthentication";
import { SecurityEducation } from "@/components/settings/security/SecurityEducation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Key, Book, Activity } from "lucide-react";
import { SecurityAnalytics } from "@/components/settings/security/SecurityAnalytics";

export default async function SecuritySettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl bg-white dark:bg-gray-900 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Security Settings</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Manage your account security and privacy settings
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-8">
        <TabsList className="grid grid-cols-4 gap-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <TabsTrigger
            value="dashboard"
            className="flex items-center space-x-2 bg-white dark:bg-gray-900 data-[state=active]:bg-blue-500 data-[state=active]:text-white dark:data-[state=active]:bg-blue-600 p-2 rounded-md transition-colors"
          >
            <Shield className="h-5 w-5" />
            <span>Dashboard</span>
          </TabsTrigger>
          
          <TabsTrigger
            value="authentication"
            className="flex items-center space-x-2 bg-white dark:bg-gray-900 data-[state=active]:bg-blue-500 data-[state=active]:text-white dark:data-[state=active]:bg-blue-600 p-2 rounded-md transition-colors"
          >
            <Key className="h-5 w-5" />
            <span>Authentication</span>
          </TabsTrigger>
          
          <TabsTrigger
            value="education"
            className="flex items-center space-x-2 bg-white dark:bg-gray-900 data-[state=active]:bg-blue-500 data-[state=active]:text-white dark:data-[state=active]:bg-blue-600 p-2 rounded-md transition-colors"
          >
            <Book className="h-5 w-5" />
            <span>Education</span>
          </TabsTrigger>
          
          <TabsTrigger
            value="analytics"
            className="flex items-center space-x-2 bg-white dark:bg-gray-900 data-[state=active]:bg-blue-500 data-[state=active]:text-white dark:data-[state=active]:bg-blue-600 p-2 rounded-md transition-colors"
          >
            <Activity className="h-5 w-5" />
            <span>Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6 space-y-6">
          <SecurityDashboard userId={user.id} workspaceId={user.workspaceId} />
          <SecuritySettingsForm userId={user.id} />
        </TabsContent>

        <TabsContent value="authentication" className="mt-6">
          <EnhancedAuthentication userId={user.id} />
        </TabsContent>

        <TabsContent value="education" className="mt-6">
          <SecurityEducation userId={user.id} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <SecurityAnalytics userId={user.id} workspaceId={user.workspaceId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}