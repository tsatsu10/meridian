/**
 * Forgot Password Page
 * Request password reset link
 * Phase 0 - Day 3 Implementation
 */

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
      } else {
        setError(data.error || 'Failed to send reset email');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            {/* Success Icon */}
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>

            {/* Success Message */}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 text-center">
              Check Your Email
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
              If an account exists for <strong>{email}</strong>, we've sent password reset instructions to that email address.
            </p>

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                📬 What to do next:
              </h3>
              <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
                <li>Check your email inbox</li>
                <li>Look for an email from Meridian</li>
                <li>Click the password reset link</li>
                <li>Create your new password</li>
              </ol>
            </div>

            {/* Additional Info */}
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              <p className="mb-2">💡 <strong>Didn't receive the email?</strong></p>
              <ul className="space-y-1 ml-4">
                <li>• Check your spam/junk folder</li>
                <li>• Wait a few minutes (it may take time to arrive)</li>
                <li>• Make sure you entered the correct email</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setIsSuccess(false);
                  setEmail('');
                }}
                className="w-full px-6 py-3 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 font-medium rounded-lg transition-colors"
              >
                Try Different Email
              </button>

              <button
                onClick={() => navigate({ to: '/login' })}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Forgot Password?
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              No worries! Enter your email and we'll send you reset instructions.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !email}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-lg"
            >
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate({ to: '/login' })}
              className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </button>
          </div>

          {/* Security Note */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              🔒 For security, we won't confirm if this email exists in our system.
              If you have an account, you'll receive reset instructions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

