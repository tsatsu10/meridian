/**
 * Email Verification Success Page
 * Displays success message after email verification
 * Phase 0 - Day 3 Implementation
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

export function VerifyEmailSuccess() {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: '/email-verified' });
  const [countdown, setCountdown] = useState(5);

  const success = searchParams.success === 'true';
  const error = searchParams.error || 'Unknown error';

  useEffect(() => {
    if (success) {
      // Auto-redirect after 5 seconds
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate({ to: '/dashboard' });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [success, navigate]);

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            {/* Success Icon */}
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>

            {/* Success Message */}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              🎉 Email Verified!
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Your email has been successfully verified. You now have access to all features!
            </p>

            {/* Auto-redirect Notice */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Redirecting to your dashboard in <strong>{countdown}</strong> seconds...
              </p>
            </div>

            {/* Manual Navigation */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate({ to: '/dashboard' })}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg"
              >
                Go to Dashboard Now
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => navigate({ to: '/settings/profile' })}
                className="w-full px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium rounded-lg transition-colors"
              >
                Complete Your Profile
              </button>
            </div>

            {/* Welcome Tips */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                🚀 Quick Start Tips
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 text-left">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400">•</span>
                  <span>Create your first project to organize your work</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400">•</span>
                  <span>Invite team members to collaborate</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400">•</span>
                  <span>Customize your workspace in settings</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          {/* Error Icon */}
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>

          {/* Error Message */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Verification Failed
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-2">
            We couldn't verify your email address.
          </p>
          <p className="text-sm text-red-600 dark:text-red-400 mb-6">
            {decodeURIComponent(error)}
          </p>

          {/* Common Reasons */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-6 text-left">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Common reasons:
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• The link has expired (links are valid for 24 hours)</li>
              <li>• The link has already been used</li>
              <li>• The link is invalid or incomplete</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate({ to: '/login' })}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg"
            >
              Request New Verification Link
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="/help/email-verification"
              className="w-full px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium rounded-lg transition-colors"
            >
              Get Help
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

