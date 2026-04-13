import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Shield, Bell, Smartphone, Lock } from "lucide-react";
import { toast } from '@/lib/toast';

interface SecuritySettingsFormProps {
  userId: string;
}

export function SecuritySettingsForm({ userId }: SecuritySettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      twoFactorEnabled: false,
      loginNotifications: true,
      sessionTimeout: true,
      deviceTracking: true,
      suspiciousActivityAlerts: true,
      smsBackup: false,
      rememberDevice: true,
    },
  });

  async function onSubmit(values: any) {
    setIsLoading(true);
    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Security settings updated successfully");
    } catch (error) {
      toast.error("Failed to update security settings");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4">
          <FormField
            control={form.control}
            name="twoFactorEnabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200 p-4 bg-white hover:border-purple-300 transition-colors shadow-sm">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-600" />
                    <FormLabel className="text-base">Two-Factor Authentication</FormLabel>
                  </div>
                  <FormDescription>
                    Add an extra layer of security to your account
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className=""
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="loginNotifications"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200 p-4 bg-white hover:border-purple-300 transition-colors shadow-sm">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-purple-600" />
                    <FormLabel className="text-base">Login Notifications</FormLabel>
                  </div>
                  <FormDescription>
                    Get notified about new login attempts
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className=""
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sessionTimeout"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200 p-4 bg-white hover:border-purple-300 transition-colors shadow-sm">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-purple-600" />
                    <FormLabel className="text-base">Session Timeout</FormLabel>
                  </div>
                  <FormDescription>
                    Automatically log out after period of inactivity
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className=""
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="deviceTracking"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200 p-4 bg-white hover:border-purple-300 transition-colors shadow-sm">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-purple-600" />
                    <FormLabel className="text-base">Device Tracking</FormLabel>
                  </div>
                  <FormDescription>
                    Track and manage devices used to access your account
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className=""
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <Button 
          type="submit" 
          disabled={isLoading}
          className="w-full mt-6"
        >
          {isLoading ? "Saving..." : "Save Security Settings"}
        </Button>
      </form>
    </Form>
  );
}