// Security settings section with authentication, sessions, and privacy controls
import React, { useState } from 'react';
import { useSettings } from '../providers/SettingsProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Key, 
  Smartphone,
  Clock,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  X,
  Copy,
  RefreshCw,
  Download,
  Trash2,
  Save, 
  RotateCcw,
  Lock,
  Unlock,
  Fingerprint,
  Globe,
  Archive,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { logger } from "../../../lib/logger";

const sessionTimeouts = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' },
  { value: 480, label: '8 hours' },
  { value: 720, label: '12 hours' },
  { value: 1440, label: '24 hours' },
];

const dataRetentionOptions = [
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 180, label: '6 months' },
  { value: 365, label: '1 year' },
  { value: 730, label: '2 years' },
  { value: 2555, label: '7 years' },
];

const mockActiveSessions = [
  {
    id: '1',
    device: 'Chrome on Windows',
    location: 'San Francisco, CA',
    lastActive: '2 minutes ago',
    current: true,
  },
  {
    id: '2',
    device: 'Safari on iPhone',
    location: 'San Francisco, CA',
    lastActive: '1 hour ago',
    current: false,
  },
  {
    id: '3',
    device: 'Firefox on macOS',
    location: 'New York, NY',
    lastActive: '3 days ago',
    current: false,
  },
];

export const SecuritySettings: React.FC = () => {
  const { state, updateField, saveSettings, isDirty, hasErrors } = useSettings();
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const security = state.settings.security;
  const loading = state.loading.security;
  const error = state.errors.security;

  const handleSave = async () => {
    await saveSettings('security');
  };

  const handleReset = () => {
    // Reset functionality would be handled by the provider
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      return;
    }
    
    setIsChangingPassword(true);
    try {
      // TODO: Implement password change API call
      logger.info("Changing password...");
      
      // Clear form
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
    } catch (error) {
      console.error('Password change failed:', error);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const enable2FA = async () => {
    // TODO: Generate QR code and backup codes
    setQrCode('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+');
    setBackupCodes(['ABC123', 'DEF456', 'GHI789', 'JKL012', 'MNO345', 'PQR678', 'STU901', 'VWX234']);
    updateField('security', 'twoFactorEnabled', true);
  };

  const disable2FA = async () => {
    updateField('security', 'twoFactorEnabled', false);
    setQrCode(null);
    setBackupCodes([]);
  };

  const revokeSession = (sessionId: string) => {
    // TODO: Implement session revocation
    logger.info("Revoking session:");
  };

  const passwordStrength = React.useMemo(() => {
    let score = 0;
    if (newPassword.length >= 8) score += 25;
    if (/[A-Z]/.test(newPassword)) score += 25;
    if (/[0-9]/.test(newPassword)) score += 25;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 25;
    return score;
  }, [newPassword]);

  const getPasswordStrengthLabel = (score: number) => {
    if (score < 25) return 'Weak';
    if (score < 50) return 'Fair';
    if (score < 75) return 'Good';
    return 'Strong';
  };

  const getPasswordStrengthColor = (score: number) => {
    if (score < 25) return 'bg-red-500';
    if (score < 50) return 'bg-orange-500';
    if (score < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Security Settings</h2>
        <p className="text-muted-foreground">
          Manage your account security and privacy preferences.
        </p>
      </div>

      <Tabs defaultValue="authentication" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="authentication" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Authentication
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        {/* Authentication */}
        <TabsContent value="authentication" className="space-y-6">
          {/* Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Password
              </CardTitle>
              <CardDescription>
                Change your password to keep your account secure.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                  />
                  
                  {newPassword && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Progress value={passwordStrength} className="flex-1" />
                        <span className="text-sm font-medium">
                          {getPasswordStrengthLabel(passwordStrength)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Use at least 8 characters with uppercase, lowercase, numbers, and symbols.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                  />
                  
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-sm text-red-600">Passwords do not match</p>
                  )}
                </div>

                <Button
                  onClick={changePassword}
                  disabled={
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword ||
                    newPassword !== confirmPassword ||
                    passwordStrength < 50 ||
                    isChangingPassword
                  }
                >
                  {isChangingPassword ? 'Changing Password...' : 'Change Password'}
                </Button>
              </div>
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
                Add an extra layer of security to your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    {security.twoFactorEnabled ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    )}
                    Two-Factor Authentication
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {security.twoFactorEnabled 
                      ? 'Your account is protected with 2FA' 
                      : 'Secure your account with an authenticator app'
                    }
                  </p>
                </div>
                <Switch
                  checked={security.twoFactorEnabled}
                  onCheckedChange={(checked) => checked ? enable2FA() : disable2FA()}
                />
              </div>

              {qrCode && !security.twoFactorEnabled && (
                <Alert>
                  <Fingerprint className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-4">
                      <p>Scan this QR code with your authenticator app:</p>
                      <div className="flex justify-center">
                        <img src={qrCode} alt="2FA QR Code" className="border rounded" />
                      </div>
                      <p className="text-sm">
                        Save these backup codes in a safe place. You can use them to access your account if you lose your device.
                      </p>
                      <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                        {backupCodes.map((code, index) => (
                          <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                            <span>{code}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigator.clipboard.writeText(code)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions */}
        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Session Management
              </CardTitle>
              <CardDescription>
                Manage your active sessions and timeout settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Session Timeout</Label>
                    <p className="text-sm text-muted-foreground">
                      How long before you're automatically signed out
                    </p>
                  </div>
                  <Select
                    value={security.sessionTimeout.toString()}
                    onValueChange={(value) => updateField('security', 'sessionTimeout', parseInt(value))}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sessionTimeouts.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Login Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when someone signs into your account
                    </p>
                  </div>
                  <Switch
                    checked={security.loginNotifications}
                    onCheckedChange={(checked) => updateField('security', 'loginNotifications', checked)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-base font-medium">Active Sessions</Label>
                <div className="space-y-3">
                  {mockActiveSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{session.device}</span>
                          {session.current && (
                            <Badge variant="outline" className="text-xs">Current</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {session.location} • Last active {session.lastActive}
                        </p>
                      </div>
                      
                      {!session.current && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => revokeSession(session.id)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy */}
        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Privacy Controls
              </CardTitle>
              <CardDescription>
                Control how your information is tracked and stored.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Device Tracking</Label>
                  <p className="text-sm text-muted-foreground">
                    Track devices used to access your account
                  </p>
                </div>
                <Switch
                  checked={security.deviceTracking}
                  onCheckedChange={(checked) => updateField('security', 'deviceTracking', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>Data Retention Period</Label>
                <p className="text-sm text-muted-foreground">
                  How long to keep your activity data
                </p>
                <Select
                  value={security.dataRetention.toString()}
                  onValueChange={(value) => updateField('security', 'dataRetention', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dataRetentionOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Advanced Security
              </CardTitle>
              <CardDescription>
                Advanced security features and data management.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Force Password Change</Label>
                  <p className="text-sm text-muted-foreground">
                    Require password change on next login
                  </p>
                </div>
                <Switch
                  checked={security.passwordChangeRequired}
                  onCheckedChange={(checked) => updateField('security', 'passwordChangeRequired', checked)}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-base font-medium">Data Export & Deletion</Label>
                
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Export Account Data
                  </Button>
                  
                  <Button variant="destructive" className="flex-1">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Export includes all your messages, files, and activity data. Account deletion is permanent and cannot be undone.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-2">
          {isDirty('security') && (
            <Badge variant="secondary" className="gap-1">
              <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
              Unsaved changes
            </Badge>
          )}
          {error && (
            <Badge variant="destructive">
              Error: {error}
            </Badge>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={loading || !isDirty('security')}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={loading || !isDirty('security') || hasErrors('security')}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;