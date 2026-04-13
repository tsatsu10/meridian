import { useState, useCallback, useEffect } from 'react';
import { toast } from '@/lib/toast';
import { fetchApi } from '@/lib/fetch';

interface Recipient {
  id: string;
  name: string;
  type: 'user' | 'team' | 'channel';
  email?: string;
  isOnline?: boolean;
  avatar?: string;
  memberCount?: number;
}

interface AttachmentFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

interface SendMessageOptions {
  recipients: Recipient[];
  content: string;
  attachments?: AttachmentFile[];
  contextType?: 'project' | 'task' | 'general';
  contextId?: string;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  sentTo: number;
  failed: number;
  errors?: string[];
}

export function useEnhancedSendMessage() {
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [lastSendResult, setLastSendResult] = useState<SendResult | null>(null);

  // Enhanced send message with proper error handling and retry logic
  const sendMessage = useCallback(async (options: SendMessageOptions): Promise<SendResult> => {
    const { recipients, content, attachments = [], contextType, contextId } = options;
    
    setIsSending(true);
    setSendProgress(0);
    setLastSendResult(null);

    try {
      // Step 1: Validate input (5%)
      setSendProgress(5);
      if (!content.trim()) {
        throw new Error('Message content is required');
      }
      if (recipients.length === 0) {
        throw new Error('At least one recipient is required');
      }

      // Step 2: Upload attachments if any (20-50% depending on file count)
      let uploadedAttachments: AttachmentFile[] = [];
      if (attachments.length > 0) {
        setSendProgress(20);
        uploadedAttachments = await uploadAttachments(attachments, (progress) => {
          setSendProgress(20 + (progress * 30)); // 20-50%
        });
      } else {
        setSendProgress(50);
      }

      // Step 3: Send messages to recipients (50-90%)
      setSendProgress(60);
      const results = await sendToRecipients(recipients, content, uploadedAttachments, contextType, contextId, (progress) => {
        setSendProgress(60 + (progress * 30)); // 60-90%
      });

      // Step 4: Process results (90-100%)
      setSendProgress(90);
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const errors = results.filter(r => !r.success).map(r => r.error).filter(Boolean);

      const result: SendResult = {
        success: successful > 0,
        messageId: results.find(r => r.messageId)?.messageId,
        sentTo: successful,
        failed,
        errors: errors.length > 0 ? errors : undefined,
      };

      setSendProgress(100);
      setLastSendResult(result);

      // Show appropriate notifications
      if (result.success) {
        if (result.failed > 0) {
          toast.success(`Message sent to ${result.sentTo} of ${recipients.length} recipients`);
          toast.warning(`Failed to send to ${result.failed} recipients`);
        } else {
          toast.success(`Message sent successfully to ${result.sentTo} recipient${result.sentTo > 1 ? 's' : ''}`);
        }
      } else {
        toast.error('Failed to send message to any recipients');
      }

      return result;
    } catch (error) {
      console.error('Send message error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      toast.error(errorMessage);
      
      const result: SendResult = {
        success: false,
        sentTo: 0,
        failed: recipients.length,
        errors: [errorMessage],
      };
      
      setLastSendResult(result);
      return result;
    } finally {
      setIsSending(false);
      // Reset progress after a short delay
      setTimeout(() => setSendProgress(0), 1000);
    }
  }, []);

  return {
    sendMessage,
    isSending,
    sendProgress,
    lastSendResult,
  };
}

// Helper function to upload attachments
async function uploadAttachments(
  attachments: File[], 
  onProgress: (progress: number) => void
): Promise<AttachmentFile[]> {
  const uploadedFiles: AttachmentFile[] = [];
  
  for (let i = 0; i < attachments.length; i++) {
    const file = attachments[i];
    onProgress((i + 0.5) / attachments.length);
    
    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'message-attachment');
      
      const response = await fetchApi('/api/attachment/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.success && response.data) {
        uploadedFiles.push({
          id: response.data.id,
          name: file.name,
          url: response.data.url,
          type: file.type,
          size: file.size,
        });
      } else {
        throw new Error(`Failed to upload ${file.name}`);
      }
    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
      // Continue with other files, but note the failure
      toast.error(`Failed to upload ${file.name}`);
    }
    
    onProgress((i + 1) / attachments.length);
  }
  
  return uploadedFiles;
}

// Helper function to send messages to recipients
async function sendToRecipients(
  recipients: Recipient[],
  content: string,
  attachments: AttachmentFile[],
  contextType?: string,
  contextId?: string,
  onProgress?: (progress: number) => void
): Promise<Array<{ success: boolean; messageId?: string; error?: string }>> {
  const results = [];
  
  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    onProgress?.((i + 0.5) / recipients.length);
    
    try {
      let result;
      
      if (recipient.type === 'channel') {
        // Send to channel
        result = await fetchApi('/api/message', {
          method: 'POST',
          body: JSON.stringify({
            channelId: recipient.id,
            content,
            messageType: 'text',
            attachments: attachments.map(a => ({
              id: a.id,
              name: a.name,
              url: a.url,
              type: a.type,
              size: a.size,
            })),
            contextType,
            contextId,
          }),
        });
      } else if (recipient.type === 'user') {
        // Send direct message
        result = await fetchApi('/api/direct-messaging/send', {
          method: 'POST',
          body: JSON.stringify({
            recipientEmail: recipient.email,
            content,
            messageType: 'text',
            attachments: attachments.map(a => ({
              id: a.id,
              name: a.name,
              url: a.url,
              type: a.type,
              size: a.size,
            })),
            contextType,
            contextId,
          }),
        });
      } else if (recipient.type === 'team') {
        // For teams, send to team channel or broadcast to members
        // This is a simplified approach - in production you'd want a dedicated team messaging endpoint
        result = await fetchApi(`/api/team/${recipient.id}/broadcast`, {
          method: 'POST',
          body: JSON.stringify({
            content: `[Team Message] ${content}`,
            messageType: 'text',
            attachments,
            contextType,
            contextId,
          }),
        });
      }

      if (result?.success) {
        results.push({
          success: true,
          messageId: result.data?.messageId || result.data?.id,
        });
      } else {
        throw new Error(result?.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Failed to send to ${recipient.name}:`, error);
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    
    onProgress?.((i + 1) / recipients.length);
  }
  
  return results;
}

// Hook for managing draft messages
export function useDraftMessage(workspaceId: string) {
  const [draft, setDraft] = useState<{
    content: string;
    recipients: Recipient[];
    timestamp: number;
  } | null>(null);

  // Load draft on mount
  useEffect(() => {
    if (workspaceId) {
      loadDraft();
    }
  }, [workspaceId]);

  const loadDraft = useCallback(() => {
    try {
      const draftKey = `send-message-draft-${workspaceId}`;
      const draftStr = localStorage.getItem(draftKey);
      if (!draftStr) return;

      const draftData = JSON.parse(draftStr);
      
      // Check if draft is not too old (24 hours)
      if (Date.now() - draftData.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(draftKey);
        return;
      }

      setDraft(draftData);
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  }, [workspaceId]);

  const saveDraft = useCallback((content: string, recipients: Recipient[]) => {
    if (!workspaceId || (!content.trim() && recipients.length === 0)) return;

    try {
      const draftKey = `send-message-draft-${workspaceId}`;
      const draftData = {
        content,
        recipients,
        timestamp: Date.now(),
      };
      
      localStorage.setItem(draftKey, JSON.stringify(draftData));
      setDraft(draftData);
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }, [workspaceId]);

  const clearDraft = useCallback(() => {
    if (!workspaceId) return;

    try {
      const draftKey = `send-message-draft-${workspaceId}`;
      localStorage.removeItem(draftKey);
      setDraft(null);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }, [workspaceId]);

  return {
    draft,
    saveDraft,
    clearDraft,
    loadDraft,
  };
}