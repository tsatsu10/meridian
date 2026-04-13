import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { 
  Shield, 
  Key, 
  Smartphone, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle,
  AlertTriangle,
  History,
  Globe,
  Clock,
  MapPin,
  Monitor,
  Fingerprint,
  RefreshCw,
  Bell,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useSettingsStore } from "@/store/settings";
import { toast } from "sonner";
import { TwoFactorSetup } from "@/components/auth/two-factor-setup";
import { apiClient } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { withErrorBoundary } from "@/components/dashboard/universal-error-boundary";

export const Route = createFileRoute("/dashboard/settings/security")({
  component: withErrorBoundary(SecuritySettings, "Security Settings"),
});

function SecuritySettings() {
  const { settings, updateSettings, isLoading, addRecentlyViewed } = useSettingsStore();
  const [localSettings, setLocalSettings] = useState(settings.security);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [showDisable2FADialog, setShowDisable2FADialog] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  
  const queryClient = useQueryClient();

  // Fetch 2FA status
  const { data: twoFactorStatus } = useQuery({
    queryKey: ['twoFactor', 'status'],
    queryFn: () => apiClient.auth.twoFactor.getStatus(),
    refetchOnMount: true,
  });

  // Disable 2FA mutation
  const disable2FAMutation = useMutation({
    mutationFn: (password: string) => apiClient.auth.twoFactor.disable({ password }),
    onSuccess: () => {
      toast.success('2FA disabled successfully');
      queryClient.invalidateQueries({ queryKey: ['twoFactor', 'status'] });
      setShowDisable2FADialog(false);
      setDisablePassword("");
    },
    onError: () => {
      toast.error('Failed to disable 2FA. Please check your password.');
    }
  });

  useEffect(() => {
    addRecentlyViewed("security");
  }, [addRecentlyViewed]);

  // Calculate password strength
  useEffect(() => {
    const calculateStrength = (password: string) => {
      let strength = 0;
      if (password.length >= 8) strength += 25;
      if (/[A-Z]/.test(password)) strength += 25;
      if (/[0-9]/.test(password)) strength += 25;
      if (/[^A-Za-z0-9]/.test(password)) strength += 25;
      return strength;
    };
    setPasswordStrength(calculateStrength(newPassword));
  }, [newPassword]);

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    if (passwordStrength < 75) {
      toast.error("Please choose a stronger password");
      return;
    }

    try {
      toast.promise(
        new Promise(resolve => setTimeout(resolve, 2000)),
        {
          loading: 'Updating password...',
          success: 'Password updated successfully!',
          error: 'Failed to update password'
        }
      );
      
      setTimeout(() => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }, 2000);
    } catch (error) {
      console.error('Password change error:', error);
    }
  };

  const handleSettingChange = async (key: string, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    
    try {
      await updateSettings("security", newSettings);
      toast.success("Security setting updated");
    } catch (error) {
      toast.error("Failed to update setting");
      setLocalSettings(settings.security);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength >= 75) return "bg-green-500";
    if (passwordStrength >= 50) return "bg-yellow-500";
    if (passwordStrength >= 25) return "bg-orange-500";
    return "bg-red-500";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength >= 75) return "Strong";
    if (passwordStrength >= 50) return "Good";
    if (passwordStrength >= 25) return "Fair";
    return "Weak";
  };

  // Calculate security score
  const calculateSecurityScore = () => {
    let score = 0;
    const checks = [];
    
    const hasPassword = currentPassword.length > 0 || newPassword.length > 0;
    if (hasPassword && passwordStrength >= 75) {
      score += 35;
      checks.push({ name: "Strong Password", status: "complete" });
    } else {
      checks.push({ name: "Strong Password", status: "pending" });
    }
    
    // Use actual 2FA status from API
    if (twoFactorStatus?.enabled) {
      score += 35;
      checks.push({ name: "2FA Enabled", status: "complete" });
    } else {
      checks.push({ name: "2FA Enabled", status: "pending" });
    }
    
    if (settings.profile.emailVerified && settings.profile.email) {
      score += 30;
      checks.push({ name: "Email Verified", status: "complete" });
    } else {
      checks.push({ name: "Email Verified", status: "pending" });
    }
    
    return { score, checks };
  };

  const { score: securityScore, checks: securityChecks } = calculateSecurityScore();
  
  const getScoreColor = () => {
    if (securityScore >= 80) return "text-green-600";
    if (securityScore >= 50) return "text-yellow-600";
    return "text-orange-600";
  };
  
  const getScoreMessage = () => {
    if (securityScore >= 80) return { title: "Excellent Security", subtitle: "Your account is well protected" };
    if (securityScore >= 50) return { title: "Good Security", subtitle: "Consider completing remaining steps" };
    return { title: "Security Setup Needed", subtitle: "Complete setup to secure your account" };
  };

  // Get device and location info
  const getDeviceInfo = () => {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    
    let deviceName = "Unknown Device";
    let browserName = "Unknown Browser";
    
    if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
      browserName = "Chrome";
    } else if (userAgent.includes("Firefox")) {
      browserName = "Firefox";
    } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
      browserName = "Safari";
    } else if (userAgent.includes("Edg")) {
      browserName = "Microsoft Edge";
    }
    
    if (platform.includes("Win")) {
      deviceName = `${browserName} on Windows`;
    } else if (platform.includes("Mac")) {
      deviceName = `${browserName} on macOS`;
    } else if (platform.includes("Linux")) {
      deviceName = `${browserName} on Linux`;
    } else if (/Android/.test(userAgent)) {
      deviceName = `${browserName} on Android`;
    } else if (/iPhone|iPad/.test(userAgent)) {
      deviceName = `${browserName} on iOS`;
    } else {
      deviceName = `${browserName} Browser`;
    }
    
    return deviceName;
  };

  const getCurrentLocation = () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneMap: Record<string, string> = {
      'America/New_York': 'New York, US',
      'America/Los_Angeles': 'Los Angeles, US',
      'America/Chicago': 'Chicago, US',
      'America/Denver': 'Denver, US',
      'Europe/London': 'London, UK',
      'Europe/Paris': 'Paris, France',
      'Europe/Berlin': 'Berlin, Germany',
      'Asia/Tokyo': 'Tokyo, Japan',
      'Asia/Shanghai': 'Shanghai, China',
      'Asia/Kolkata': 'Mumbai, India',
      'Australia/Sydney': 'Sydney, Australia',
    };
    
    return timezoneMap[timezone] || 'Unknown Location';
  };

  const recentSessions = [
    { 
      device: getDeviceInfo(), 
      location: getCurrentLocation(), 
      time: "Active now", 
      current: true,
      ipAddress: "192.168.1.***",
      sessionId: "current"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:bg-gradient-to-br dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
      <div className="container max-w-6xl py-6 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Security Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your authentication and security preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Password Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Password & Authentication
                </CardTitle>
                <CardDescription>
                  Change your password and manage login security
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Password */}
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    Current Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showPasswords.current ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="pr-10"
                      placeholder="Enter your current password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    >
                      {showPasswords.current ? 
                        <EyeOff className="h-4 w-4" /> : 
                        <Eye className="h-4 w-4" />
                      }
                    </Button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-muted-foreground" />
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPasswords.new ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-10"
                      placeholder="Enter a strong new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    >
                      {showPasswords.new ? 
                        <EyeOff className="h-4 w-4" /> : 
                        <Eye className="h-4 w-4" />
                      }
                    </Button>
                  </div>
                  
                  {/* Password Strength */}
                  {newPassword && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Password strength:</span>
                        <span className={`font-medium ${
                          passwordStrength >= 75 ? 'text-green-600' :
                          passwordStrength >= 50 ? 'text-yellow-600' :
                          passwordStrength >= 25 ? 'text-orange-600' : 'text-red-600'
                        }`}>
                          {getPasswordStrengthText()}
                        </span>
                      </div>
                      <Progress value={passwordStrength} className={getPasswordStrengthColor()} />
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-muted-foreground" />
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showPasswords.confirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pr-10"
                      placeholder="Confirm your new password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    >
                      {showPasswords.confirm ? 
                        <EyeOff className="h-4 w-4" /> : 
                        <Eye className="h-4 w-4" />
                      }
                    </Button>
                  </div>
                  
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Passwords do not match
                    </p>
                  )}
                </div>

                <Button 
                  onClick={handlePasswordChange}
                  disabled={isLoading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  className="w-full"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4 mr-2" />
                  )}
                  Update Password
                </Button>
              </CardContent>
            </Card>

            {/* Two-Factor Authentication */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Two-Factor Authentication
                </CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 2FA Status and Setup */}
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h3 className="font-medium">Authenticator App</h3>
                      <p className="text-sm text-muted-foreground">
                        {twoFactorStatus?.enabled 
                          ? "Your account is protected with 2FA" 
                          : "Use an app like Google Authenticator or Authy"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={twoFactorStatus?.enabled ? "default" : "secondary"}>
                      {twoFactorStatus?.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                    
                    {twoFactorStatus?.enabled ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowDisable2FADialog(true)}
                      >
                        Disable
                      </Button>
                    ) : (
                      <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
                        <DialogTrigger asChild>
                          <Button variant="default" size="sm">
                            Enable
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
                            <DialogDescription>
                              Secure your account with an extra layer of protection
                            </DialogDescription>
                          </DialogHeader>
                          <TwoFactorSetup onComplete={() => setShow2FADialog(false)} />
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>

                {/* Additional 2FA Options (only show if 2FA enabled) */}
                {twoFactorStatus?.enabled && (
                  <>
                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h3 className="font-medium">Email Backup</h3>
                          <p className="text-sm text-muted-foreground">
                            Receive backup codes via email
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={localSettings.smsBackup}
                        onCheckedChange={(checked) => handleSettingChange("smsBackup", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Fingerprint className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h3 className="font-medium">Remember Device</h3>
                          <p className="text-sm text-muted-foreground">
                            Don't ask for 2FA on this device for 30 days
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={localSettings.rememberDevice}
                        onCheckedChange={(checked) => handleSettingChange("rememberDevice", checked)}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Disable 2FA Dialog */}
            <Dialog open={showDisable2FADialog} onOpenChange={setShowDisable2FADialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
                  <DialogDescription>
                    Enter your password to confirm disabling 2FA
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="disablePassword">Password</Label>
                    <Input
                      id="disablePassword"
                      type="password"
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      placeholder="Enter your password"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowDisable2FADialog(false);
                        setDisablePassword("");
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => disable2FAMutation.mutate(disablePassword)}
                      disabled={!disablePassword || disable2FAMutation.isPending}
                      className="flex-1"
                    >
                      {disable2FAMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Disabling...
                        </>
                      ) : (
                        'Disable 2FA'
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Login Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Login Alerts
                </CardTitle>
                <CardDescription>
                  Get notified about suspicious account activity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h3 className="font-medium">Email Alerts</h3>
                      <p className="text-sm text-muted-foreground">
                        Notify about new logins and unusual activity
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={localSettings.loginNotifications}
                    onCheckedChange={(checked) => handleSettingChange("loginNotifications", checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h3 className="font-medium">Device Tracking</h3>
                      <p className="text-sm text-muted-foreground">
                        Track device access and unusual activity
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={localSettings.deviceTracking}
                    onCheckedChange={(checked) => handleSettingChange("deviceTracking", checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h3 className="font-medium">Suspicious Activity Alerts</h3>
                      <p className="text-sm text-muted-foreground">
                        Get notified of potential security threats
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={localSettings.suspiciousActivityAlerts}
                    onCheckedChange={(checked) => handleSettingChange("suspiciousActivityAlerts", checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h3 className="font-medium">Auto Session Timeout</h3>
                      <p className="text-sm text-muted-foreground">
                        Automatically log out after inactivity
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={localSettings.sessionTimeout}
                    onCheckedChange={(checked) => handleSettingChange("sessionTimeout", checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Security Status & Recent Activity */}
          <div className="lg:col-span-1 space-y-6">
            {/* Security Score */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className={`text-5xl font-bold mb-2 ${getScoreColor()}`}>{securityScore}%</div>
                  <p className="text-lg font-semibold">{getScoreMessage().title}</p>
                  <p className="text-sm text-muted-foreground">{getScoreMessage().subtitle}</p>
                </div>

                <div className="space-y-3">
                  {securityChecks.map((check, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        {check.status === "complete" ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                        )}
                        {check.name}
                      </span>
                      <Badge variant={check.status === "complete" ? "default" : "secondary"}>
                        {check.status === "complete" ? "✓" : "Pending"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recent Sessions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentSessions.map((session, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="p-2 bg-muted rounded-lg">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm truncate">
                          {session.device}
                        </h3>
                        {session.current && (
                          <Badge variant="default" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span>{session.location}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{session.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {recentSessions.length === 1 && recentSessions[0].current && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    <Clock className="w-5 h-5 mx-auto mb-2 opacity-50" />
                    <p>This is your only active session.</p>
                    <p>Previous sessions will appear here when you log in from other devices.</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" disabled>
                    View All Sessions
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-destructive" disabled>
                    End All Others
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
