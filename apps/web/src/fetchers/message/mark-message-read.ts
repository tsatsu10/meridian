// @epic-3.1-messaging: Mark message as read API
import { API_BASE_URL, API_URL } from '@/constants/urls';

export async function markMessageAsRead(
  messageId: string,
  options: {
    deviceType?: string;
    readMethod?: 'viewed' | 'clicked' | 'scrolled_past';
    timeSpentMs?: number;
  } = {}
): Promise<{ success: boolean; messageId: string; readAt: Date }> {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_BASE_URL}/messages/${messageId}/read`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      deviceType: options.deviceType || 'desktop',
      readMethod: options.readMethod || 'viewed',
      timeSpentMs: options.timeSpentMs || 0
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to mark message as read: ${response.statusText}`);
  }

  return response.json();
}