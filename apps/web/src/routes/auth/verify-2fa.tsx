import { useState } from 'react';
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Shield, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { MeridianMark } from '@/components/branding/meridian-mark';
import { Label } from '@/components/ui/label';

export const Route = createFileRoute('/auth/verify-2fa')({
  component: Verify2FA,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      userId: search.userId as string,
      email: search.email as string,
    };
  },
});

function Verify2FA() {
  const [code, setCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const router = useRouter();
  const search = Route.useSearch();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!search.userId) {
      setError('Invalid session. Please sign in again.');
      return;
    }

    if (!useBackupCode && code.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    if (useBackupCode && !backupCode) {
      setError('Please enter a backup code');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      await apiClient.auth.twoFactor.verifyLogin({
        userId: search.userId,
        token: useBackupCode ? undefined : code,
        backupCode: useBackupCode ? backupCode : undefined,
      });
      
      toast.success('Verification successful!');
      navigate({ to: '/dashboard' });
    } catch (error) {
      const errorMessage = useBackupCode 
        ? 'Invalid backup code. Please try again.'
        : 'Invalid verification code. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate({ to: '/auth/sign-in' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex flex-col items-center justify-center gap-3 mb-2">
              <MeridianMark className="h-11 w-11" />
              <div className="p-3 bg-primary/10 rounded-full">
                <Shield className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">
              Two-Factor Authentication
            </CardTitle>
            <CardDescription className="text-center">
              {useBackupCode 
                ? 'Enter one of your backup codes' 
                : 'Enter the code from your authenticator app'}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {!useBackupCode ? (
                <div className="space-y-2">
                  <Label htmlFor="code">Verification Code</Label>
                  <Input
                    id="code"
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={code}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setCode(value);
                      setError('');
                    }}
                    className="text-center text-2xl tracking-widest font-mono"
                    autoFocus
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    The code changes every 30 seconds
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="backupCode">Backup Code</Label>
                  <Input
                    id="backupCode"
                    type="text"
                    placeholder="XXXX-XXXX"
                    value={backupCode}
                    onChange={(e) => {
                      setBackupCode(e.target.value.toUpperCase());
                      setError('');
                    }}
                    className="text-center text-xl tracking-wider font-mono"
                    autoFocus
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Enter one of the backup codes you saved during setup
                  </p>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading || (!useBackupCode && code.length !== 6) || (useBackupCode && !backupCode)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify and Continue'
                )}
              </Button>

              <div className="space-y-2">
                <button
                  type="button"
                  className="text-sm text-primary hover:underline w-full text-center"
                  onClick={() => {
                    setUseBackupCode(!useBackupCode);
                    setCode('');
                    setBackupCode('');
                    setError('');
                  }}
                  disabled={isLoading}
                >
                  {useBackupCode 
                    ? '← Back to authenticator code' 
                    : 'Use backup code instead →'}
                </button>

                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 w-full"
                  onClick={handleBackToLogin}
                  disabled={isLoading}
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to sign in
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Help Section */}
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Lost access to your authenticator?{' '}
            <button className="text-primary hover:underline">
              Contact support
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Verify2FA;

