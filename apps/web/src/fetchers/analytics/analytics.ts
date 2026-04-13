import { api } from '@/lib/api';
import { StandardAPIResponse } from '@/types/api-response';

interface AnalyticsEvent {
  eventType: string;
  eventData?: any;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  metadata?: any;
}

interface ExportOptions {
  exportType: 'csv' | 'pdf' | 'json';
  dataRange: {
    startDate: string;
    endDate: string;
  };
  filters?: any;
}

/**
 * Get analytics data from the API
 */
export const getAnalytics = async (
  type: string,
  queryParams: string
): Promise<any> => {
  try {
    const response = await api.get(`/analytics/${type}?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch analytics: ${response.statusText}`);
    }

    const data: StandardAPIResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch analytics data');
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching analytics:', error);
    throw error;
  }
};

/**
 * Track an analytics event
 */
export const trackAnalyticsEvent = async (eventData: AnalyticsEvent): Promise<void> => {
  try {
    const response = await api.post('/analytics/events', eventData);
    
    if (!response.ok) {
      throw new Error(`Failed to track event: ${response.statusText}`);
    }

    const data: StandardAPIResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to track analytics event');
    }
  } catch (error) {
    console.error('Error tracking analytics event:', error);
    throw error;
  }
};

/**
 * Export analytics data
 */
export const exportAnalytics = async (exportOptions: ExportOptions): Promise<any> => {
  try {
    const response = await api.post('/analytics/export', exportOptions);
    
    if (!response.ok) {
      throw new Error(`Failed to create export: ${response.statusText}`);
    }

    const data: StandardAPIResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to create analytics export');
    }

    return data.data;
  } catch (error) {
    console.error('Error creating analytics export:', error);
    throw error;
  }
};

/**
 * Get export status
 */
export const getExportStatus = async (exportId: string): Promise<any> => {
  try {
    const response = await api.get(`/analytics/export/${exportId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get export status: ${response.statusText}`);
    }

    const data: StandardAPIResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to get export status');
    }

    return data.data;
  } catch (error) {
    console.error('Error getting export status:', error);
    throw error;
  }
};

/**
 * Get dashboard analytics data
 */
export const getDashboardAnalytics = async (
  startDate: string,
  endDate: string
): Promise<any> => {
  return getAnalytics('dashboard', `startDate=${startDate}&endDate=${endDate}`);
};

/**
 * Get message analytics data
 */
export const getMessageAnalytics = async (
  startDate: string,
  endDate: string,
  channelId?: string,
  userId?: string
): Promise<any> => {
  const params = new URLSearchParams({
    startDate,
    endDate,
    ...(channelId && { channelId }),
    ...(userId && { userId }),
  });
  
  return getAnalytics('messages', params.toString());
};

/**
 * Get channel analytics data
 */
export const getChannelAnalytics = async (
  startDate: string,
  endDate: string,
  channelId?: string
): Promise<any> => {
  const params = new URLSearchParams({
    startDate,
    endDate,
    ...(channelId && { channelId }),
  });
  
  return getAnalytics('channels', params.toString());
};

/**
 * Get user analytics data
 */
export const getUserAnalytics = async (
  startDate: string,
  endDate: string,
  userId?: string
): Promise<any> => {
  const params = new URLSearchParams({
    startDate,
    endDate,
    ...(userId && { userId }),
  });
  
  return getAnalytics('users', params.toString());
};

/**
 * Get team analytics data
 */
export const getTeamAnalytics = async (
  startDate: string,
  endDate: string,
  teamId?: string
): Promise<any> => {
  const params = new URLSearchParams({
    startDate,
    endDate,
    ...(teamId && { teamId }),
  });
  
  return getAnalytics('teams', params.toString());
};

/**
 * Get real-time analytics data
 */
export const getRealtimeAnalytics = async (): Promise<any> => {
  return getAnalytics('realtime', '');
};

/**
 * Get trend analytics data
 */
export const getTrendAnalytics = async (
  startDate: string,
  endDate: string
): Promise<any> => {
  return getAnalytics('trends', `startDate=${startDate}&endDate=${endDate}`);
}; 