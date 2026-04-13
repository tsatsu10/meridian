import { toast } from '@/lib/toast';
import { logger } from "../lib/logger";

export interface PWAConfig {
  name: string;
  shortName: string;
  description: string;
  themeColor: string;
  backgroundColor: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  orientation: 'portrait' | 'landscape' | 'any';
  scope: string;
  startUrl: string;
  icons: PWAIcon[];
  screenshots?: PWAScreenshot[];
  categories: string[];
  lang: string;
  dir: 'ltr' | 'rtl';
}

export interface PWAIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: 'maskable' | 'any';
}

export interface PWAScreenshot {
  src: string;
  sizes: string;
  type: string;
  formFactor: 'wide' | 'narrow';
  label: string;
}

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export class PWAManager {
  private static instance: PWAManager;
  private deferredPrompt: InstallPromptEvent | null = null;
  private isInstalled = false;
  private config: PWAConfig;

  private constructor() {
    this.config = {
      name: 'Meridian - Project Management',
      shortName: 'Meridian',
      description: 'Advanced project management with AI-powered insights and automation',
      themeColor: '#6366f1',
      backgroundColor: '#ffffff',
      display: 'standalone',
      orientation: 'any',
      scope: '/',
      startUrl: '/',
      icons: [
        {
          src: '/meridian-logomark.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: '/meridian-logomark.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: '/meridian-logomark.png',
          sizes: '96x96',
          type: 'image/png',
          purpose: 'any'
        }
      ],
      screenshots: [
        {
          src: '/screenshots/desktop-wide.png',
          sizes: '1280x720',
          type: 'image/png',
          formFactor: 'wide',
          label: 'Meridian Dashboard on Desktop'
        },
        {
          src: '/screenshots/mobile-narrow.png',
          sizes: '750x1334',
          type: 'image/png',
          formFactor: 'narrow',
          label: 'Meridian Dashboard on Mobile'
        }
      ],
      categories: ['productivity', 'business', 'project-management'],
      lang: 'en',
      dir: 'ltr'
    };

    this.initializePWA();
  }

  static getInstance(): PWAManager {
    if (!PWAManager.instance) {
      PWAManager.instance = new PWAManager();
    }
    return PWAManager.instance;
  }

  private async initializePWA(): Promise<void> {
    try {
      // In development, avoid SW registration to prevent reload loops and HMR conflicts
      if (import.meta.env.DEV) {
        if ('serviceWorker' in navigator) {
          try {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map((r) => r.unregister()));
            if (typeof caches !== 'undefined') {
              const cacheNames = await caches.keys();
              await Promise.all(cacheNames.map((c) => caches.delete(c)));
            }} catch (e) {
            console.warn('PWA dev cleanup warning:', e);
          }
        }
        return;
      }

      // Check if PWA is already installed
      this.isInstalled = this.checkIfInstalled();

      // Register service worker
      await this.registerServiceWorker();

      // Set up install prompt listener
      this.setupInstallPrompt();

      // Set up app update listener
      this.setupAppUpdateListener();

      // Initialize PWA features
      this.initializePWAFatures();

      logger.info("PWA Manager initialized successfully");
    } catch (error) {
      console.error('Failed to initialize PWA:', error);
    }
  }

  private checkIfInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  private async registerServiceWorker(): Promise<void> {
    // Only register in production
    if (!import.meta.env.PROD) return;
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: this.config.scope
        });

        logger.info("Service Worker registered successfully:");

        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.showUpdateNotification();
              }
            });
          }
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as InstallPromptEvent;
      this.showInstallPrompt();
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.deferredPrompt = null;
      toast.success('Meridian has been successfully installed on your device.');
    });
  }

  private setupAppUpdateListener(): void {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        toast.info('A new version of Meridian is available. Please refresh to update.');
      });
    }
  }

  private initializePWAFatures(): void {
    // Set theme color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', this.config.themeColor);
    }

    // Set viewport for mobile optimization
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
    }

    // Add mobile-specific meta tags
    this.addMobileMetaTags();

    // Initialize touch gestures
    this.initializeTouchGestures();

    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

  private addMobileMetaTags(): void {
    const head = document.head;

    // Apple touch icons
    this.config.icons.forEach(icon => {
      if (icon.sizes.includes('192')) {
        const appleTouchIcon = document.createElement('link');
        appleTouchIcon.rel = 'apple-touch-icon';
        appleTouchIcon.href = icon.src;
        head.appendChild(appleTouchIcon);
      }
    });

    // Apple mobile web app capable
    const appleMobileWebAppCapable = document.createElement('meta');
    appleMobileWebAppCapable.name = 'apple-mobile-web-app-capable';
    appleMobileWebAppCapable.content = 'yes';
    head.appendChild(appleMobileWebAppCapable);

    // Apple mobile web app status bar style
    const appleMobileWebAppStatusBarStyle = document.createElement('meta');
    appleMobileWebAppStatusBarStyle.name = 'apple-mobile-web-app-status-bar-style';
    appleMobileWebAppStatusBarStyle.content = 'default';
    head.appendChild(appleMobileWebAppStatusBarStyle);

    // Mobile web app manifest
    const manifest = document.createElement('link');
    manifest.rel = 'manifest';
    manifest.href = '/manifest.json';
    head.appendChild(manifest);
  }

  private initializeTouchGestures(): void {
    // Swipe navigation
    let startX = 0;
    let startY = 0;
    let endX = 0;
    let endY = 0;

    document.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    });

    document.addEventListener('touchend', (e) => {
      endX = e.changedTouches[0].clientX;
      endY = e.changedTouches[0].clientY;
      this.handleSwipe(startX, startY, endX, endY);
    });

    // Double tap to zoom prevention
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
  }

  private handleSwipe(startX: number, startY: number, endX: number, endY: number): void {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const minSwipeDistance = 50;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      // Horizontal swipe
      if (deltaX > 0) {
        // Swipe right - go back
        this.handleSwipeRight();
      } else {
        // Swipe left - go forward
        this.handleSwipeLeft();
      }
    } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > minSwipeDistance) {
      // Vertical swipe
      if (deltaY > 0) {
        // Swipe down - refresh
        this.handleSwipeDown();
      } else {
        // Swipe up - scroll to top
        this.handleSwipeUp();
      }
    }
  }

  private handleSwipeRight(): void {
    // Navigate back
    if (window.history.length > 1) {
      window.history.back();
    }
  }

  private handleSwipeLeft(): void {
    // Navigate forward
    if (window.history.length > 1) {
      window.history.forward();
    }
  }

  private handleSwipeDown(): void {
    // Pull to refresh
    window.location.reload();
  }

  private handleSwipeUp(): void {
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.handleSave();
      }

      // Ctrl/Cmd + N for new task
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        this.handleNewTask();
      }

      // Ctrl/Cmd + K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        this.handleSearch();
      }

      // Escape to close modals
      if (e.key === 'Escape') {
        this.handleEscape();
      }
    });
  }

  private handleSave(): void {
    // Trigger save action
    const saveEvent = new CustomEvent('pwa-save');
    window.dispatchEvent(saveEvent);
  }

  private handleNewTask(): void {
    // Trigger new task action
    const newTaskEvent = new CustomEvent('pwa-new-task');
    window.dispatchEvent(newTaskEvent);
  }

  private handleSearch(): void {
    // Trigger search action
    const searchEvent = new CustomEvent('pwa-search');
    window.dispatchEvent(searchEvent);
  }

  private handleEscape(): void {
    // Close modals or go back
    const escapeEvent = new CustomEvent('pwa-escape');
    window.dispatchEvent(escapeEvent);
  }

  private showInstallPrompt(): void {
    if (this.deferredPrompt && !this.isInstalled) {
      toast('Install Meridian for a better experience with offline support.');
    }
  }

  private showUpdateNotification(): void {
    toast.info('A new version of Meridian is available. Refresh to update.');
  }

  async installApp(): Promise<void> {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        logger.info("User accepted the install prompt");
      } else {
        logger.info("User dismissed the install prompt");
      }
      
      this.deferredPrompt = null;
    }
  }

  async checkForUpdates(): Promise<boolean> {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        return true;
      }
    }
    return false;
  }

  getConfig(): PWAConfig {
    return this.config;
  }

  isAppInstalled(): boolean {
    return this.isInstalled;
  }

  getDeviceInfo(): {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    platform: string;
    userAgent: string;
  } {
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?=.*\bMobile\b)(?=.*\bSafari\b)/i.test(userAgent);
    const isDesktop = !isMobile && !isTablet;

    let platform = 'unknown';
    if (/Android/i.test(userAgent)) platform = 'android';
    else if (/iPhone|iPad|iPod/i.test(userAgent)) platform = 'ios';
    else if (/Windows/i.test(userAgent)) platform = 'windows';
    else if (/Mac/i.test(userAgent)) platform = 'mac';
    else if (/Linux/i.test(userAgent)) platform = 'linux';

    return {
      isMobile,
      isTablet,
      isDesktop,
      platform,
      userAgent
    };
  }

  async shareData(data: ShareData): Promise<void> {
    if (navigator.share) {
      try {
        await navigator.share(data);
      } catch (error) {
        console.error('Error sharing data:', error);
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      this.fallbackShare(data);
    }
  }

  private fallbackShare(data: ShareData): void {
    if (data.url) {
      navigator.clipboard.writeText(data.url).then(() => {
        toast.success('The link has been copied to your clipboard.');
      });
    }
  }

  async requestNotificationPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission;
    }
    return 'denied';
  }

  async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, options);
      
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }
}

export const pwaManager = PWAManager.getInstance(); 