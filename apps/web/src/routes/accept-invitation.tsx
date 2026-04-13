import React, { useEffect, useState } from "react";
import { Check, X, Mail, Building, UserCheck, AlertCircle } from "lucide-react";
import { useAcceptInvitation } from "../lib/api/workspace-invitations";
import { toast } from "sonner";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";

interface InvitationSearchParams {
  token?: string;
}

export const Route = createFileRoute("/accept-invitation")({
  component: AcceptInvitationPage,
  validateSearch: (search: Record<string, unknown>): InvitationSearchParams => {
    return {
      token: typeof search.token === "string" ? search.token : undefined,
    };
  },
});

function AcceptInvitationPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/accept-invitation" });
  const invitationToken = search.token;
  
  const [hasAttempted, setHasAttempted] = useState(false);
  const acceptInvitation = useAcceptInvitation();

  useEffect(() => {
    // If no token, redirect to home
    if (!invitationToken) {
      toast.error("Invalid invitation link");
      navigate({ to: "/" });
      return;
    }

    // Auto-accept invitation if token is present
    if (!hasAttempted) {
      setHasAttempted(true);
      handleAcceptInvitation();
    }
  }, [invitationToken, hasAttempted]);

  const handleAcceptInvitation = async () => {
    if (!invitationToken) return;

    try {
      await acceptInvitation.mutateAsync({ invitationToken });
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleRetry = () => {
    if (invitationToken) {
      setHasAttempted(false);
    }
  };

  const handleGoHome = () => {
    navigate({ to: "/" });
  };

  // Loading state
  if (acceptInvitation.isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Processing Invitation
          </h1>
          <p className="text-gray-600">
            Please wait while we add you to the workspace...
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (acceptInvitation.isSuccess) {
    const data = acceptInvitation.data;
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Welcome to {data.workspaceName}!
          </h1>
          <p className="text-gray-600 mb-6">
            You've successfully joined the workspace as a <span className="font-medium">{data.role}</span>.
          </p>
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg mb-6">
            <UserCheck className="w-5 h-5 text-green-600" />
            <div className="text-left">
              <div className="font-medium text-green-900">Invitation Accepted</div>
              <div className="text-sm text-green-700">You now have access to all workspace features</div>
            </div>
          </div>
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (acceptInvitation.isError) {
    const error = acceptInvitation.error as Error;
    const isExpired = error.message.includes("expired");
    const isInvalid = error.message.includes("Invalid");

    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            {isExpired ? (
              <AlertCircle className="w-8 h-8 text-red-600" />
            ) : (
              <X className="w-8 h-8 text-red-600" />
            )}
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {isExpired ? "Invitation Expired" : "Invitation Error"}
          </h1>
          <p className="text-gray-600 mb-6">
            {error.message}
          </p>
          
          {isExpired && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg mb-6">
              <Mail className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="text-left">
                <div className="font-medium text-amber-900">Need a New Invitation?</div>
                <div className="text-sm text-amber-700">Contact the workspace owner to send you a new invitation</div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {!isInvalid && (
              <button
                onClick={handleRetry}
                className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Try Again
              </button>
            )}
            <button
              onClick={handleGoHome}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Initial state (should not be reached due to useEffect)
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Building className="w-8 h-8 text-gray-600" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Workspace Invitation
        </h1>
        <p className="text-gray-600">
          Processing your invitation...
        </p>
      </div>
    </div>
  );
} 