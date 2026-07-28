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
  Monitor,
  RefreshCw,
  Bell,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSettingsStore } from "@/store/settings";
import { toast } from "sonner";
import { userMessage } from "@/lib/user-message";
import { TwoFactorSetup } from "@/components/auth/two-factor-setup";
import { apiClient } from "@/lib/api-client";
import { SessionsAPI } from "@/lib/api/sessions-server";
import changePassword from "@/fetchers/user/change-password";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { withErrorBoundary } from "@/components/dashboard/universal-error-boundary";
import PageTitle from "@/components/page-title";

export const Route = createFileRoute("/dashboard/settings/security")({
  component: withErrorBoundary(SecuritySettings, "Security Settings"),
});

/** A password older than this stops counting towards the security score. */
const PASSWORD_FRESH_DAYS = 365;

/** Renders a session's last-activity timestamp, or says it is unknown. */
function formatLastActive(lastActivity: string | null): string {
  if (!lastActivity) {
    return "Activity not recorded";
  }

  const then = new Date(lastActivity).getTime();
  if (Number.isNaN(then)) {
    return "Activity not recorded";
  }

  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 2) {
    return "Active now";
  }
  if (minutes < 60) {
    return `Active ${minutes} minutes ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Active ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.floor(hours / 24);
  return `Active ${days} day${days === 1 ? "" : "s"} ago`;
}

function SecuritySettings() {
  const { settings, updateSettings, addRecentlyViewed } = useSettingsStore();
  // Read straight from the store. This used to be
  // `useState(settings.security)` — a snapshot taken once at mount that was
  // never resynced, even though settings load asynchronously (and can time out
  // to defaults). Every switch read that snapshot, and because
  // handleSettingChange spread it, the first toggle wrote the stale copy back
  // over the other four settings.
  const localSettings = settings.security;
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [showDisable2FADialog, setShowDisable2FADialog] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");

  const queryClient = useQueryClient();

  // Fetch 2FA status
  const { data: twoFactorStatus } = useQuery({
    queryKey: ["twoFactor", "status"],
    queryFn: () => apiClient.auth.twoFactor.getStatus(),
    refetchOnMount: true,
  });

  // Disable 2FA mutation
  const disable2FAMutation = useMutation({
    mutationFn: (password: string) =>
      apiClient.auth.twoFactor.disable({ password }),
    onSuccess: () => {
      toast.success("2FA disabled successfully");
      queryClient.invalidateQueries({ queryKey: ["twoFactor", "status"] });
      setShowDisable2FADialog(false);
      setDisablePassword("");
    },
    onError: (error) => {
      toast.error(userMessage(error, "disable two-factor authentication"));
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast.error(userMessage(error, "change your password"));
    },
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

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  const handleSettingChange = async (key: string, value: unknown) => {
    try {
      // Send only the key that changed. Sending the whole section is what let
      // a stale snapshot overwrite unrelated settings.
      await updateSettings("security", { [key]: value });
      toast.success("Security setting updated");
    } catch (error) {
      console.error("Failed to update security setting:", error);
      toast.error(userMessage(error, "save that setting"));
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

  /**
   * Security score from facts the server reports about the account.
   *
   * The "Strong Password" component used to test
   * `currentPassword.length > 0 || newPassword.length > 0` — i.e. whether you
   * were part-way through typing into the change-password form. Typing a
   * strong password and submitting nothing moved the score from 0% to 35%, and
   * clearing the box moved it back. It now measures how long ago the password
   * was actually changed (`security.passwordUpdatedAt`, added server-side for
   * this). "Email Verified" reads the same server flag the verification flow
   * sets; it previously read a field the API never populated, so it could
   * never pass for anyone and the score was capped at 70%.
   */
  const calculateSecurityScore = () => {
    let score = 0;
    const checks: Array<{ name: string; status: string; hint?: string }> = [];

    const passwordUpdatedAt = settings.security.passwordUpdatedAt
      ? new Date(settings.security.passwordUpdatedAt)
      : null;
    const passwordAgeDays = passwordUpdatedAt
      ? (Date.now() - passwordUpdatedAt.getTime()) / (1000 * 60 * 60 * 24)
      : null;

    if (passwordAgeDays !== null && passwordAgeDays <= PASSWORD_FRESH_DAYS) {
      score += 35;
      checks.push({ name: "Password up to date", status: "complete" });
    } else {
      checks.push({
        name: "Password up to date",
        status: "pending",
        hint:
          passwordAgeDays === null
            ? "Never changed"
            : `Changed ${Math.floor(passwordAgeDays)} days ago`,
      });
    }

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

  const { score: securityScore, checks: securityChecks } =
    calculateSecurityScore();

  const getScoreColor = () => {
    if (securityScore >= 80) return "text-green-600";
    if (securityScore >= 50) return "text-yellow-600";
    return "text-orange-600";
  };

  const getScoreMessage = () => {
    if (securityScore >= 80)
      return {
        title: "Excellent Security",
        subtitle: "Your account is well protected",
      };
    if (securityScore >= 50)
      return {
        title: "Good Security",
        subtitle: "Consider completing remaining steps",
      };
    return {
      title: "Security Setup Needed",
      subtitle: "Complete setup to secure your account",
    };
  };

  /**
   * Real sessions, from the API.
   *
   * This was a hardcoded one-element array: the device name was guessed from
   * navigator.userAgent, the "location" came from a timezone->city lookup, the
   * IP was the literal string "192.168.1.***", and the panel always announced
   * "This is your only active session" — while the server had 77 live sessions
   * for the account being viewed.
   */
  const {
    data: activeSessions = [],
    isLoading: sessionsLoading,
    isError: sessionsError,
  } = useQuery({
    queryKey: ["security", "sessions"],
    queryFn: () => SessionsAPI.listActive(),
    refetchOnMount: true,
  });

  const terminateSessionMutation = useMutation({
    mutationFn: (sessionId: string) => SessionsAPI.terminate(sessionId),
    onSuccess: () => {
      toast.success("Session signed out");
      queryClient.invalidateQueries({ queryKey: ["security", "sessions"] });
    },
    onError: (error: Error) => {
      toast.error(userMessage(error, "sign out that session"));
    },
  });

  const terminateAllOthersMutation = useMutation({
    mutationFn: () => SessionsAPI.terminateAllOthers(),
    onSuccess: () => {
      toast.success("All other sessions signed out");
      queryClient.invalidateQueries({ queryKey: ["security", "sessions"] });
    },
    onError: (error: Error) => {
      toast.error(userMessage(error, "sign out your other sessions"));
    },
  });

  const otherSessionCount = activeSessions.filter(
    (session) => !session.isCurrentSession,
  ).length;

  return (
    <div className="min-h-screen bg-background">
      <PageTitle title="Security" />
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
                  <Label
                    htmlFor="currentPassword"
                    className="flex items-center gap-2"
                  >
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
                      onClick={() =>
                        setShowPasswords((prev) => ({
                          ...prev,
                          current: !prev.current,
                        }))
                      }
                    >
                      {showPasswords.current ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <Label
                    htmlFor="newPassword"
                    className="flex items-center gap-2"
                  >
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
                      onClick={() =>
                        setShowPasswords((prev) => ({
                          ...prev,
                          new: !prev.new,
                        }))
                      }
                    >
                      {showPasswords.new ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Password Strength */}
                  {newPassword && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Password strength:
                        </span>
                        <span
                          className={`font-medium ${
                            passwordStrength >= 75
                              ? "text-green-600"
                              : passwordStrength >= 50
                                ? "text-yellow-600"
                                : passwordStrength >= 25
                                  ? "text-orange-600"
                                  : "text-red-600"
                          }`}
                        >
                          {getPasswordStrengthText()}
                        </span>
                      </div>
                      <Progress
                        value={passwordStrength}
                        className={getPasswordStrengthColor()}
                      />
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label
                    htmlFor="confirmPassword"
                    className="flex items-center gap-2"
                  >
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
                      onClick={() =>
                        setShowPasswords((prev) => ({
                          ...prev,
                          confirm: !prev.confirm,
                        }))
                      }
                    >
                      {showPasswords.confirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
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
                  disabled={
                    changePasswordMutation.isPending ||
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword ||
                    newPassword !== confirmPassword
                  }
                  className="w-full"
                >
                  {changePasswordMutation.isPending ? (
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
                    <Badge
                      variant={
                        twoFactorStatus?.enabled ? "default" : "secondary"
                      }
                    >
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
                      <Dialog
                        open={show2FADialog}
                        onOpenChange={setShow2FADialog}
                      >
                        <DialogTrigger asChild>
                          <Button variant="default" size="sm">
                            Enable
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>
                              Enable Two-Factor Authentication
                            </DialogTitle>
                            <DialogDescription>
                              Secure your account with an extra layer of
                              protection
                            </DialogDescription>
                          </DialogHeader>
                          <TwoFactorSetup
                            onComplete={() => setShow2FADialog(false)}
                          />
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>

                {/*
                  Two switches used to sit here: "Email Backup" (bound to a
                  field named smsBackup) and "Remember Device". Neither had any
                  implementation — zero references anywhere in the API — so
                  both were controls that stored a boolean and changed nothing
                  about how the account behaved. Removed rather than left
                  looking functional on a security page; the features can come
                  back with the backend that makes them real.
                */}
              </CardContent>
            </Card>

            {/* Disable 2FA Dialog */}
            <Dialog
              open={showDisable2FADialog}
              onOpenChange={setShowDisable2FADialog}
            >
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
                      disabled={
                        !disablePassword || disable2FAMutation.isPending
                      }
                      className="flex-1"
                    >
                      {disable2FAMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Disabling...
                        </>
                      ) : (
                        "Disable 2FA"
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
                        Email me when a new device signs in
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={localSettings.loginNotifications}
                    onCheckedChange={(checked) =>
                      handleSettingChange("loginNotifications", checked)
                    }
                  />
                </div>

                {/*
                  "Device Tracking" and "Suspicious Activity Alerts" used to
                  sit here. Neither had an implementation — the API referenced
                  them only as keys in a defaults object. Device details are
                  now always recorded (the session list above depends on them,
                  so there is nothing left to opt into), and threat detection
                  is not something this app does, so promising alerts for it
                  would be another switch that changes nothing.
                */}

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
                    onCheckedChange={(checked) =>
                      handleSettingChange("sessionTimeout", checked)
                    }
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
                  <div className={`text-5xl font-bold mb-2 ${getScoreColor()}`}>
                    {securityScore}%
                  </div>
                  <p className="text-lg font-semibold">
                    {getScoreMessage().title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {getScoreMessage().subtitle}
                  </p>
                </div>

                <div className="space-y-3">
                  {securityChecks.map((check, index) => (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: fixed security-check list in stable order
                      key={index}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="flex items-center gap-2">
                        {check.status === "complete" ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                        )}
                        <span>
                          {check.name}
                          {check.hint && (
                            <span className="block text-xs text-muted-foreground">
                              {check.hint}
                            </span>
                          )}
                        </span>
                      </span>
                      <Badge
                        variant={
                          check.status === "complete" ? "default" : "secondary"
                        }
                      >
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
                {sessionsLoading && (
                  <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading sessions…
                  </div>
                )}

                {sessionsError && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-orange-500" />
                    <p>Could not load your sessions.</p>
                  </div>
                )}

                {!sessionsLoading &&
                  !sessionsError &&
                  activeSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center gap-3 p-3 rounded-lg border"
                    >
                      <div className="p-2 bg-muted rounded-lg">
                        <Monitor className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-sm truncate">
                            {session.deviceName}
                          </h3>
                          {session.isCurrentSession && (
                            <Badge variant="default" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                        {/* Only shown when the server actually recorded one —
                            the old panel printed a made-up IP and a city
                            derived from the browser's timezone. */}
                        {session.ipAddress && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Globe className="w-3 h-3" />
                            <span>{session.ipAddress}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{formatLastActive(session.lastActivity)}</span>
                        </div>
                      </div>
                      {!session.isCurrentSession && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() =>
                            terminateSessionMutation.mutate(session.id)
                          }
                          disabled={terminateSessionMutation.isPending}
                        >
                          Sign out
                        </Button>
                      )}
                    </div>
                  ))}

                {!sessionsLoading &&
                  !sessionsError &&
                  activeSessions.length > 0 &&
                  otherSessionCount === 0 && (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      <Clock className="w-5 h-5 mx-auto mb-2 opacity-50" />
                      <p>This is your only active session.</p>
                    </div>
                  )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-destructive"
                  onClick={() => terminateAllOthersMutation.mutate()}
                  disabled={
                    otherSessionCount === 0 ||
                    terminateAllOthersMutation.isPending
                  }
                >
                  {terminateAllOthersMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing out…
                    </>
                  ) : (
                    `Sign out ${otherSessionCount} other session${otherSessionCount === 1 ? "" : "s"}`
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
