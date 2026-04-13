/**
 * Email Verification Banner
 * Displays banner prompting user to verify their email
 * Phase 0 - Day 3 Implementation
 */

import { useState } from 'react';
import { AlertCircle, Mail, X } from 'lucide-react';

interface EmailVerificationBannerProps {
  userEmail: string;
  onResend?: () => void;
  onDismiss?: () => void;
}

export function EmailVerificationBanner({
  userEmail,
  onResend,
  onDismiss,
}: EmailVerificationBannerProps) {
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [message, setMessage] = useState('');

  const handleResend = async () => {
    if (countdown > 0) return;

    setIsResending(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('✅ Verification email sent! Check your inbox.');
        setCountdown(60); // 60 second cooldown
        
        // Countdown timer
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        if (onResend) onResend();
      } else {
        setMessage(data.error || '❌ Failed to send verification email');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      setMessage('❌ Failed to send verification email');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="relative bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 rounded-lg shadow-sm">
      <div className="px-4 py-3 sm:px-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                Email Verification Required
              </h3>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-200">
                Please verify your email address <strong>{userEmail}</strong> to unlock all features.
                Check your inbox for the verification link.
              </p>
              
              {message && (
                <p className={`mt-2 text-sm font-medium ${
                  message.startsWith('✅') 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {message}
                </p>
              )}
              
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={handleResend}
                  disabled={isResending || countdown > 0}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-amber-900 dark:text-amber-100 bg-amber-100 dark:bg-amber-800/50 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Mail className="h-4 w-4" />
                  {isResending ? 'Sending...' : countdown > 0 ? `Resend in ${countdown}s` : 'Resend Email'}
                </button>
                
                <a
                  href="/help/email-verification"
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 transition-colors"
                >
                  Need Help?
                </a>
              </div>
            </div>
          </div>
          
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="flex-shrink-0 ml-3 p-1 text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-100 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

