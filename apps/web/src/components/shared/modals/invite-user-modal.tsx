import React, { useState } from "react";
import { X, Mail, UserPlus, Send } from "lucide-react";
import { useSendInvitation } from "../../../lib/api/workspace-invitations";

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
}

const roleOptions = [
  {
    value: "member" as const,
    label: "Member",
    description: "Can view and contribute to projects",
  },
  {
    value: "team-lead" as const,
    label: "Team Lead",
    description: "Can manage team members and lead projects",
  },
  {
    value: "project-manager" as const,
    label: "Project Manager",
    description: "Can create and manage projects",
  },
  {
    value: "department-head" as const,
    label: "Department Head",
    description: "Can manage departments and higher-level operations",
  },
];

export function InviteUserModal({ isOpen, onClose, workspaceId, workspaceName }: InviteUserModalProps) {
  const [inviteeEmail, setInviteeEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<"member" | "team-lead" | "project-manager" | "department-head">("member");
  const [message, setMessage] = useState("");

  const sendInvitation = useSendInvitation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteeEmail.trim()) {
      return;
    }

    try {
      await sendInvitation.mutateAsync({
        workspaceId,
        inviteeEmail: inviteeEmail.trim(),
        roleToAssign: selectedRole,
        message: message.trim() || undefined,
      });

      // Reset form and close modal on success
      setInviteeEmail("");
      setSelectedRole("member");
      setMessage("");
      onClose();
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleClose = () => {
    if (!sendInvitation.isPending) {
      setInviteeEmail("");
      setSelectedRole("member");
      setMessage("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Invite User</h2>
              <p className="text-sm text-gray-500">to {workspaceName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={sendInvitation.isPending}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="email"
                type="email"
                value={inviteeEmail}
                onChange={(e) => setInviteeEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                required
                disabled={sendInvitation.isPending}
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Role
            </label>
            <div className="space-y-2">
              {roleOptions.map((role) => (
                <label
                  key={role.value}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedRole === role.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role.value}
                    checked={selectedRole === role.value}
                    onChange={(e) => setSelectedRole(e.target.value as any)}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                    disabled={sendInvitation.isPending}
                  />
                  <div>
                    <div className="font-medium text-gray-900">{role.label}</div>
                    <div className="text-sm text-gray-500">{role.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Optional Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Personal Message (Optional)
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal message to your invitation..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
              disabled={sendInvitation.isPending}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={sendInvitation.isPending}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sendInvitation.isPending || !inviteeEmail.trim()}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sendInvitation.isPending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send Invitation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 