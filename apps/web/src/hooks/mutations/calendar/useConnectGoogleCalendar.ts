import { useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL, API_URL } from '@/constants/urls';

interface ConnectGoogleCalendarParams {
  userId: string;
}

export function useConnectGoogleCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId }: ConnectGoogleCalendarParams) => {
      const response = await fetch(`${API_BASE_URL}/calendar/google/auth?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to get Google Calendar auth URL');
      }
      const data = await response.json();
      
      // Open Google OAuth popup
      const popup = window.open(
        data.authUrl,
        'google-calendar-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      // Wait for the popup to close or redirect
      return new Promise((resolve, reject) => {
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            // Refresh calendar status
            queryClient.invalidateQueries({ queryKey: ['calendar', 'status', userId] });
            resolve({ success: true });
          }
        }, 1000);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(checkClosed);
          popup?.close();
          reject(new Error('Authentication timeout'));
        }, 300000);
      });
    },
  });
} 