/**
 * Two-Factor Verification Component
 * UI for verifying 2FA code during login
 * Phase 1 - Two-Factor Authentication
 */

import React, { useState, useRef, useEffect } from 'react';
import { Shield, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';

interface TwoFactorVerifyProps {
  userId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function TwoFactorVerify({ userId, onSuccess, onCancel }: TwoFactorVerifyProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBackupCode, setShowBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  /**
   * Handle code input
   */
  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(0, 1);
    
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setError(null);

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (newCode.every(d => d !== '') && index === 5) {
      handleVerify(newCode.join(''));
    }
  };

  /**
   * Handle backspace
   */
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  /**
   * Handle paste
   */
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    
    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      handleVerify(pastedData);
    }
  };

  /**
   * Verify code
   */
  const handleVerify = async (verificationCode: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          code: verificationCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid code');
      }

      // Show warning if backup code was used
      if (data.usedBackupCode) {
        console.warn('⚠️  Backup code used:', data.message);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verify backup code
   */
  const handleVerifyBackupCode = async () => {
    if (backupCode.length < 6) {
      setError('Please enter a valid backup code');
      return;
    }

    await handleVerify(backupCode);
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <CardTitle>Two-Factor Authentication</CardTitle>
            <CardDescription>
              {showBackupCode 
                ? 'Enter a backup code' 
                : 'Enter the code from your authenticator app'
              }
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!showBackupCode ? (
          <>
            {/* 6-digit code inputs */}
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={loading}
                  className="w-12 h-14 text-center text-2xl font-mono"
                />
              ))}
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Open your authenticator app and enter the 6-digit code
            </p>
          </>
        ) : (
          <>
            {/* Backup code input */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Backup Code</label>
              <Input
                type="text"
                placeholder="Enter 8-character code"
                value={backupCode}
                onChange={(e) => {
                  setBackupCode(e.target.value.toUpperCase());
                  setError(null);
                }}
                maxLength={8}
                className="text-center font-mono text-lg tracking-wider"
              />
              <p className="text-xs text-muted-foreground">
                Use one of the backup codes you saved during setup
              </p>
            </div>

            <Button
              onClick={handleVerifyBackupCode}
              disabled={loading || backupCode.length < 6}
              className="w-full"
            >
              {loading ? 'Verifying...' : 'Verify Backup Code'}
            </Button>
          </>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Toggle backup code */}
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setShowBackupCode(!showBackupCode);
              setError(null);
              setCode(['', '', '', '', '', '']);
              setBackupCode('');
            }}
            className="text-sm"
          >
            {showBackupCode ? (
              <>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Use authenticator app
              </>
            ) : (
              'Use backup code instead'
            )}
          </Button>

          {onCancel && (
            <Button variant="ghost" onClick={onCancel} className="text-sm">
              Cancel & sign out
            </Button>
          )}
        </div>

        {/* Help text */}
        <div className="pt-4 border-t space-y-2">
          <h4 className="text-sm font-medium">Having trouble?</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Make sure your device's time is correct</li>
            <li>• Try refreshing the code in your authenticator app</li>
            <li>• Use a backup code if you don't have access to your phone</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

