import { useState } from 'react';
import { useAuth } from '@/components/providers/unified-context-provider';
import { API_BASE_URL, API_URL } from '@/constants/urls';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState(Notification.permission);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestPermission() {
    if (!('Notification' in window)) {
      setError('Notifications not supported');
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }

  async function subscribe() {
    setLoading(true);
    setError(null);
    try {
      if (!user?.id) throw new Error('No user');
      if (!('serviceWorker' in navigator)) throw new Error('No service worker support');
      
      // Skip in development unless explicitly enabled
      if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_PUSH_NOTIFICATIONS !== 'true') {
        throw new Error('Push notifications disabled in development mode');
      }
      
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      await fetch(`${API_BASE_URL}/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          endpoint: sub.endpoint,
          keys: sub.toJSON().keys,
          deviceInfo: { userAgent: navigator.userAgent, platform: navigator.platform },
        }),
      });
      setLoading(false);
      return sub;
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
      throw e;
    }
  }

  async function unsubscribe() {
    setLoading(true);
    setError(null);
    try {
      if (!('serviceWorker' in navigator)) throw new Error('No service worker support');
      
      // Skip in development unless explicitly enabled
      if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_PUSH_NOTIFICATIONS !== 'true') {
        throw new Error('Push notifications disabled in development mode');
      }
      
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(`${API_BASE_URL}/push/unsubscribe`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setLoading(false);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
      throw e;
    }
  }

  return { permission, requestPermission, subscribe, unsubscribe, loading, error };
} 