// @epic-2.1-files: Upload attachment API client
import { API_BASE_URL, API_URL } from '@/constants/urls';

export interface UploadAttachmentRequest {
  file: File;
  taskId?: string;
  commentId?: string;
  userEmail: string;
  description?: string;
  version?: string;
}

export async function uploadAttachment({
  file,
  taskId,
  commentId,
  userEmail,
  description,
  version
}: UploadAttachmentRequest) {const formData = new FormData();
  formData.append('file', file);
  formData.append('userEmail', userEmail);
  
  if (taskId) formData.append('taskId', taskId);
  if (commentId) formData.append('commentId', commentId);
  if (description) formData.append('description', description);
  if (version) formData.append('version', version);try {
    const response = await fetch(`${API_BASE_URL}/attachment/upload`, {
      method: 'POST',
      body: formData,
    });if (!response.ok) {
      const errorText = await response.text();
      console.error('🌐 API Error Response:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();return result;
  } catch (error) {
    console.error('🌐 Network/Fetch Error:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Could not connect to API server. Is it running on port 1337?');
    }
    throw error;
  }
}

export default uploadAttachment; 