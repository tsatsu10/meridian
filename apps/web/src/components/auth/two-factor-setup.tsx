import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Shield, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

type SetupStep = 'intro' | 'scan' | 'verify' | 'complete';

interface TwoFactorSecret {
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
}

interface BackupCodesResponse {
  success: boolean;
  backupCodes: string[];
}

interface TwoFactorSetupProps {
  onComplete?: () => void;
}

export function TwoFactorSetup({ onComplete }: TwoFactorSetupProps = {}) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<SetupStep>('intro');
  const [secretData, setSecretData] = useState<TwoFactorSecret | null>(null);
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleGenerate = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await apiClient.auth.twoFactor.generate();
      setSecretData(response);
      setStep('scan');
    } catch (error) {
      setError('Failed to generate 2FA secret. Please try again.');
      toast.error('Failed to generate 2FA secret');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!secretData || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const response: BackupCodesResponse = await apiClient.auth.twoFactor.verify({
        secret: secretData.secret,
        token: verificationCode
      });
      
      setBackupCodes(response.backupCodes);
      setStep('complete');
      toast.success('2FA enabled successfully!');
      
      // Refresh 2FA status
      queryClient.invalidateQueries({ queryKey: ['twoFactor', 'status'] });
      
      // Call onComplete callback after showing backup codes
      if (onComplete) {
        setTimeout(() => {
          onComplete();
        }, 5000); // Give user time to save backup codes
      }
    } catch (error) {
      setError('Invalid verification code. Please try again.');
      toast.error('Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyBackupCodes = () => {
    const text = backupCodes.join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Backup codes copied to clipboard!');
  };

  const handleDownloadBackupCodes = () => {
    const text = `Meridian 2FA Backup Codes\nGenerated: ${new Date().toISOString()}\n\n${backupCodes.join('\n')}\n\nKeep these codes in a safe place. Each code can only be used once.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meridian-2fa-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Backup codes downloaded!');
  };

  if (step === 'intro') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <CardTitle>Enable Two-Factor Authentication</CardTitle>
          </div>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Two-factor authentication (2FA) enhances your account security by requiring a second form of verification in addition to your password.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
              <li>Scan a QR code with your authenticator app</li>
              <li>Enter a verification code to confirm setup</li>
              <li>Save backup codes for emergency access</li>
            </ul>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You'll need an authenticator app like Google Authenticator, Authy, or 1Password to continue.
            </AlertDescription>
          </Alert>

          <Button 
            onClick={handleGenerate} 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Generating...' : 'Get Started'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 'scan') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scan QR Code</CardTitle>
          <CardDescription>
            Use your authenticator app to scan this QR code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* QR Code Display */}
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
              {secretData && (
                <QRCodeSVG 
                  value={secretData.qrCodeUrl} 
                  size={256}
                  level="M"
                  includeMargin={true}
                />
              )}
            </div>
            
            {/* Manual Entry Option */}
            <div className="w-full">
              <p className="text-sm font-medium mb-2">Can't scan the code?</p>
              <div className="flex items-center gap-2">
                <Input
                  value={secretData?.manualEntryKey || ''}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(secretData?.manualEntryKey || '');
                    toast.success('Key copied!');
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Enter this key manually in your authenticator app
              </p>
            </div>
          </div>

          {/* Next Step Button */}
          <div className="space-y-2">
            <Button 
              onClick={() => setStep('verify')} 
              className="w-full"
            >
              I've Scanned the QR Code
            </Button>
            <Button 
              variant="outline"
              onClick={() => setStep('intro')} 
              className="w-full"
            >
              Back
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'verify') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verify Setup</CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Verification Code</label>
            <Input
              type="text"
              maxLength={6}
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setVerificationCode(value);
                setError('');
              }}
              className="text-center text-2xl tracking-widest font-mono"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              The code changes every 30 seconds
            </p>
          </div>

          <div className="space-y-2">
            <Button 
              onClick={handleVerify} 
              className="w-full"
              disabled={isLoading || verificationCode.length !== 6}
            >
              {isLoading ? 'Verifying...' : 'Verify and Enable'}
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                setStep('scan');
                setVerificationCode('');
                setError('');
              }}
              className="w-full"
            >
              Back to QR Code
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'complete') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-6 w-6" />
            <CardTitle>2FA Enabled Successfully!</CardTitle>
          </div>
          <CardDescription>
            Your account is now protected with two-factor authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Backup Codes Section */}
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>Important:</strong> Save these backup codes in a safe place. You can use them to access your account if you lose your device.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, i) => (
                <div 
                  key={i} 
                  className="p-3 bg-gray-50 border rounded-md font-mono text-sm text-center"
                >
                  {code}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button 
              onClick={handleCopyBackupCodes}
              variant="outline"
              className="w-full"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy All Codes
            </Button>
            <Button 
              onClick={handleDownloadBackupCodes}
              variant="outline"
              className="w-full"
            >
              Download as Text File
            </Button>
          </div>

          <Alert>
            <AlertDescription className="text-sm">
              <strong>Remember:</strong> Each backup code can only be used once. After using a code, it will no longer be valid.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return null;
}
