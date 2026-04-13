// @epic-2.1-files: Upload new version API client
import { API_BASE_URL, API_URL } from '@/constants/urls';

export interface UploadNewVersionRequest {
  id: string;
  file: File;
  userEmail: string;
  versionNote?: string;
}

export async function uploadNewVersion({
  id,
  file,
  userEmail,
  versionNote
}: UploadNewVersionRequest) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('userEmail', userEmail);
  if (versionNote) formData.append('versionNote', versionNote);

  const response = await fetch(`${API_BASE_URL}/attachment/${id}/version`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default uploadNewVersion; 