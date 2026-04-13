import { useState, useEffect, useCallback, useContext, createContext } from 'react';
import { API_BASE_URL, API_URL } from '@/constants/urls';

interface Translation {
  [key: string]: string | Translation;
}

interface Locale {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  region: string;
  translations: Translation;
  dateFormat: string;
  timeFormat: string;
  numberFormat: {
    decimal: string;
    thousands: string;
    currency: string;
  };
  pluralRules: (count: number) => 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
}

interface I18nConfig {
  defaultLocale: string;
  fallbackLocale: string;
  supportedLocales: string[];
  autoDetect: boolean;
  persistLocale: boolean;
  loadTranslationsAsync: boolean;
  interpolationPattern: RegExp;
  namespace: string;
}

interface I18nContext {
  currentLocale: Locale;
  availableLocales: Locale[];
  isLoading: boolean;
  error: string | null;
  changeLocale: (localeCode: string) => Promise<void>;
  t: (key: string, params?: Record<string, any>, options?: TranslationOptions) => string;
  formatDate: (date: Date, format?: string) => string;
  formatTime: (date: Date, format?: string) => string;
  formatNumber: (number: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  formatRelativeTime: (date: Date) => string;
  getDirection: () => 'ltr' | 'rtl';
  isRTL: boolean;
}

interface TranslationOptions {
  count?: number;
  context?: string;
  defaultValue?: string;
  interpolation?: Record<string, any>;
  namespace?: string;
}

const I18nContext = createContext<I18nContext | null>(null);

// Predefined locales with comprehensive data
const predefinedLocales: Record<string, Omit<Locale, 'translations'>> = {
  'en-US': {
    code: 'en-US',
    name: 'English (United States)',
    nativeName: 'English (United States)',
    direction: 'ltr',
    region: 'US',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: 'h:mm a',
    numberFormat: {
      decimal: '.',
      thousands: ',',
      currency: '$'
    },
    pluralRules: (count: number) => count === 1 ? 'one' : 'other'
  },
  'es-ES': {
    code: 'es-ES',
    name: 'Spanish (Spain)',
    nativeName: 'Español (España)',
    direction: 'ltr',
    region: 'ES',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'HH:mm',
    numberFormat: {
      decimal: ',',
      thousands: '.',
      currency: '€'
    },
    pluralRules: (count: number) => count === 1 ? 'one' : 'other'
  },
  'fr-FR': {
    code: 'fr-FR',
    name: 'French (France)',
    nativeName: 'Français (France)',
    direction: 'ltr',
    region: 'FR',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'HH:mm',
    numberFormat: {
      decimal: ',',
      thousands: ' ',
      currency: '€'
    },
    pluralRules: (count: number) => count <= 1 ? 'one' : 'other'
  },
  'de-DE': {
    code: 'de-DE',
    name: 'German (Germany)',
    nativeName: 'Deutsch (Deutschland)',
    direction: 'ltr',
    region: 'DE',
    dateFormat: 'dd.MM.yyyy',
    timeFormat: 'HH:mm',
    numberFormat: {
      decimal: ',',
      thousands: '.',
      currency: '€'
    },
    pluralRules: (count: number) => count === 1 ? 'one' : 'other'
  },
  'ja-JP': {
    code: 'ja-JP',
    name: 'Japanese (Japan)',
    nativeName: '日本語（日本）',
    direction: 'ltr',
    region: 'JP',
    dateFormat: 'yyyy/MM/dd',
    timeFormat: 'HH:mm',
    numberFormat: {
      decimal: '.',
      thousands: ',',
      currency: '¥'
    },
    pluralRules: () => 'other'
  },
  'ar-SA': {
    code: 'ar-SA',
    name: 'Arabic (Saudi Arabia)',
    nativeName: 'العربية (المملكة العربية السعودية)',
    direction: 'rtl',
    region: 'SA',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'h:mm a',
    numberFormat: {
      decimal: '.',
      thousands: ',',
      currency: 'ر.س'
    },
    pluralRules: (count: number) => {
      if (count === 0) return 'zero';
      if (count === 1) return 'one';
      if (count === 2) return 'two';
      if (count >= 3 && count <= 10) return 'few';
      if (count >= 11 && count <= 99) return 'many';
      return 'other';
    }
  },
  'zh-CN': {
    code: 'zh-CN',
    name: 'Chinese (Simplified)',
    nativeName: '中文（简体）',
    direction: 'ltr',
    region: 'CN',
    dateFormat: 'yyyy/MM/dd',
    timeFormat: 'HH:mm',
    numberFormat: {
      decimal: '.',
      thousands: ',',
      currency: '¥'
    },
    pluralRules: () => 'other'
  }
};

// Default translations for common UI elements
const defaultTranslations: Record<string, Translation> = {
  'en-US': {
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      warning: 'Warning',
      info: 'Information',
      close: 'Close',
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      search: 'Search',
      filter: 'Filter',
      sort: 'Sort',
      refresh: 'Refresh',
      settings: 'Settings',
      profile: 'Profile',
      logout: 'Logout',
      login: 'Login',
      signup: 'Sign Up',
      dashboard: 'Dashboard',
      notifications: 'Notifications',
      messages: 'Messages',
      tasks: 'Tasks',
      projects: 'Projects',
      teams: 'Teams',
      calendar: 'Calendar',
      chat: 'Chat',
      video: 'Video',
      call: 'Call',
      file: 'File',
      attachment: 'Attachment',
      upload: 'Upload',
      download: 'Download',
      share: 'Share',
      copy: 'Copy',
      paste: 'Paste',
      cut: 'Cut',
      undo: 'Undo',
      redo: 'Redo',
      select: 'Select',
      all: 'All',
      none: 'None',
      yes: 'Yes',
      no: 'No',
      ok: 'OK',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      first: 'First',
      last: 'Last',
      page: 'Page',
      of: 'of',
      total: 'Total',
      today: 'Today',
      yesterday: 'Yesterday',
      tomorrow: 'Tomorrow',
      week: 'Week',
      month: 'Month',
      year: 'Year',
      hour: 'Hour',
      minute: 'Minute',
      second: 'Second',
      online: 'Online',
      offline: 'Offline',
      available: 'Available',
      busy: 'Busy',
      away: 'Away',
      invisible: 'Invisible'
    },
    accessibility: {
      skipToContent: 'Skip to main content',
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
      toggleSidebar: 'Toggle sidebar',
      searchButton: 'Search',
      notificationButton: 'Notifications',
      profileButton: 'Profile menu',
      settingsButton: 'Settings',
      helpButton: 'Help',
      homeButton: 'Home',
      backButton: 'Go back',
      nextButton: 'Go forward',
      closeButton: 'Close',
      minimizeButton: 'Minimize',
      maximizeButton: 'Maximize',
      restoreButton: 'Restore',
      muteButton: 'Mute',
      unmuteButton: 'Unmute',
      playButton: 'Play',
      pauseButton: 'Pause',
      stopButton: 'Stop',
      volumeControl: 'Volume control',
      brightnessControl: 'Brightness control',
      contrastControl: 'Contrast control',
      fontSizeControl: 'Font size control',
      languageSelector: 'Language selector',
      themeSelector: 'Theme selector',
      sortBy: 'Sort by {field}',
      filterBy: 'Filter by {field}',
      selectedItems: '{count} items selected',
      pageNavigation: 'Page {current} of {total}',
      loadingState: 'Loading {resource}',
      errorState: 'Error loading {resource}',
      emptyState: 'No {resource} found',
      searchResults: '{count} results for "{query}"',
      newNotification: 'New notification from {sender}',
      messageReceived: 'Message received from {sender}',
      taskAssigned: 'Task assigned to you',
      meetingReminder: 'Meeting starting in {minutes} minutes',
      fileUploaded: 'File uploaded successfully',
      connectionLost: 'Connection lost. Reconnecting...',
      connectionRestored: 'Connection restored',
      offlineMode: 'You are currently offline',
      syncingData: 'Syncing data...',
      dataUpToDate: 'Data is up to date'
    },
    chat: {
      typeMessage: 'Type a message...',
      sendMessage: 'Send message',
      newMessage: 'New message',
      messageFrom: 'Message from {sender}',
      messagesCount: '{count, plural, one {# message} other {# messages}}',
      typing: '{user} is typing...',
      multipleTyping: '{users} are typing...',
      online: '{user} is online',
      lastSeen: 'Last seen {time}',
      joinedChat: '{user} joined the chat',
      leftChat: '{user} left the chat',
      messageEdited: 'Message edited',
      messageDeleted: 'Message deleted',
      replyTo: 'Reply to {user}',
      forwardMessage: 'Forward message',
      copyMessage: 'Copy message',
      deleteMessage: 'Delete message',
      editMessage: 'Edit message',
      pinMessage: 'Pin message',
      unpinMessage: 'Unpin message',
      reactToMessage: 'React to message',
      startVideoCall: 'Start video call',
      startVoiceCall: 'Start voice call',
      addToChat: 'Add to chat',
      leaveChat: 'Leave chat',
      muteChat: 'Mute chat',
      unmuteChat: 'Unmute chat',
      searchInChat: 'Search in chat',
      chatSettings: 'Chat settings',
      createGroup: 'Create group',
      addMembers: 'Add members',
      removeMembers: 'Remove members',
      changeGroupName: 'Change group name',
      setGroupPhoto: 'Set group photo',
      viewGroupInfo: 'View group info',
      adminOnly: 'Admin only',
      everyoneCanAdd: 'Everyone can add members',
      approveNewMembers: 'Approve new members',
      allowGroupInvites: 'Allow group invites',
      showReadReceipts: 'Show read receipts',
      showOnlineStatus: 'Show online status',
      allowForwarding: 'Allow message forwarding',
      autoDownloadMedia: 'Auto-download media',
      soundNotifications: 'Sound notifications',
      vibrationNotifications: 'Vibration notifications',
      previewNotifications: 'Preview notifications',
      customNotificationSound: 'Custom notification sound',
      notificationSchedule: 'Notification schedule'
    },
    validation: {
      required: 'This field is required',
      invalidEmail: 'Please enter a valid email address',
      invalidPassword: 'Password must be at least 8 characters',
      passwordMismatch: 'Passwords do not match',
      invalidPhoneNumber: 'Please enter a valid phone number',
      invalidUrl: 'Please enter a valid URL',
      minLength: 'Must be at least {min} characters',
      maxLength: 'Must be no more than {max} characters',
      minValue: 'Must be at least {min}',
      maxValue: 'Must be no more than {max}',
      invalidDate: 'Please enter a valid date',
      invalidTime: 'Please enter a valid time',
      invalidNumber: 'Please enter a valid number',
      invalidFormat: 'Invalid format',
      fileTooBig: 'File size must be less than {size}',
      invalidFileType: 'File type not supported',
      networkError: 'Network error. Please try again.',
      serverError: 'Server error. Please try again later.',
      unauthorized: 'You are not authorized to perform this action',
      forbidden: 'Access denied',
      notFound: 'Resource not found',
      timeout: 'Request timed out. Please try again.',
      tooManyRequests: 'Too many requests. Please wait and try again.'
    }
  }
};

export function useInternationalization(config?: Partial<I18nConfig>) {
  const [currentLocale, setCurrentLocale] = useState<Locale | null>(null);
  const [availableLocales, setAvailableLocales] = useState<Locale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const i18nConfig: I18nConfig = {
    defaultLocale: 'en-US',
    fallbackLocale: 'en-US',
    supportedLocales: ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'ar-SA', 'zh-CN'],
    autoDetect: true,
    persistLocale: true,
    loadTranslationsAsync: false,
    interpolationPattern: /\{([^}]+)\}/g,
    namespace: 'meridian',
    ...config
  };

  // Initialize i18n
  useEffect(() => {
    initializeI18n();
  }, []);

  const initializeI18n = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load available locales
      const locales = await loadAvailableLocales();
      setAvailableLocales(locales);

      // Determine initial locale
      const initialLocale = determineInitialLocale();
      await changeLocale(initialLocale);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize internationalization');
      // Fallback to default locale
      const fallbackLocale = createLocaleFromPredefined(i18nConfig.fallbackLocale);
      if (fallbackLocale) {
        setCurrentLocale(fallbackLocale);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableLocales = async (): Promise<Locale[]> => {
    const locales: Locale[] = [];

    for (const localeCode of i18nConfig.supportedLocales) {
      const predefined = predefinedLocales[localeCode];
      if (predefined) {
        const translations = await loadTranslations(localeCode);
        locales.push({
          ...predefined,
          translations
        });
      }
    }

    return locales;
  };

  const loadTranslations = async (localeCode: string): Promise<Translation> => {
    // Try to load from default translations first
    let translations = defaultTranslations[localeCode] || {};

    if (i18nConfig.loadTranslationsAsync) {
      try {
        // In a real implementation, this would load from API or files
        const response = await fetch(`${API_BASE_URL}/translations/${localeCode}`);
        if (response.ok) {
          const apiTranslations = await response.json();
          translations = { ...translations, ...apiTranslations };
        }
      } catch (error) {
        console.warn(`Failed to load translations for ${localeCode}:`, error);
      }
    }

    return translations;
  };

  const determineInitialLocale = (): string => {
    // Check stored locale preference
    if (i18nConfig.persistLocale) {
      const stored = localStorage.getItem(`${i18nConfig.namespace}-locale`);
      if (stored && i18nConfig.supportedLocales.includes(stored)) {
        return stored;
      }
    }

    // Auto-detect from browser
    if (i18nConfig.autoDetect) {
      const browserLocales = navigator.languages || [navigator.language];
      
      for (const browserLocale of browserLocales) {
        // Exact match
        if (i18nConfig.supportedLocales.includes(browserLocale)) {
          return browserLocale;
        }
        
        // Language match (e.g., 'en' matches 'en-US')
        const language = browserLocale.split('-')[0];
        const match = i18nConfig.supportedLocales.find(locale => 
          locale.startsWith(language + '-')
        );
        if (match) {
          return match;
        }
      }
    }

    return i18nConfig.defaultLocale;
  };

  const createLocaleFromPredefined = (localeCode: string): Locale | null => {
    const predefined = predefinedLocales[localeCode];
    if (!predefined) return null;

    return {
      ...predefined,
      translations: defaultTranslations[localeCode] || {}
    };
  };

  const changeLocale = useCallback(async (localeCode: string) => {
    if (!i18nConfig.supportedLocales.includes(localeCode)) {
      throw new Error(`Locale ${localeCode} is not supported`);
    }

    setIsLoading(true);
    setError(null);

    try {
      let locale = availableLocales.find(l => l.code === localeCode);
      
      if (!locale) {
        // Create locale from predefined data
        locale = createLocaleFromPredefined(localeCode);
        if (!locale) {
          throw new Error(`Failed to create locale for ${localeCode}`);
        }
      }

      setCurrentLocale(locale);

      // Persist locale preference
      if (i18nConfig.persistLocale) {
        localStorage.setItem(`${i18nConfig.namespace}-locale`, localeCode);
      }

      // Update document attributes
      document.documentElement.lang = locale.code;
      document.documentElement.dir = locale.direction;

      // Dispatch locale change event
      window.dispatchEvent(new CustomEvent('localechange', { 
        detail: { locale: locale.code, direction: locale.direction }
      }));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change locale');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [availableLocales, i18nConfig.persistLocale, i18nConfig.supportedLocales, i18nConfig.namespace]);

  // Translation function
  const t = useCallback((
    key: string, 
    params?: Record<string, any>, 
    options?: TranslationOptions
  ): string => {
    if (!currentLocale) return key;

    const translation = getNestedTranslation(currentLocale.translations, key, options?.namespace);
    
    if (!translation) {
      // Try fallback locale
      const fallbackLocale = availableLocales.find(l => l.code === i18nConfig.fallbackLocale);
      if (fallbackLocale) {
        const fallbackTranslation = getNestedTranslation(fallbackLocale.translations, key, options?.namespace);
        if (fallbackTranslation) {
          return processTranslation(fallbackTranslation, params, options);
        }
      }
      
      return options?.defaultValue || key;
    }

    return processTranslation(translation, params, options);
  }, [currentLocale, availableLocales, i18nConfig.fallbackLocale]);

  const getNestedTranslation = (translations: Translation, key: string, namespace?: string): string | null => {
    let current: any = translations;
    
    // Handle namespace
    if (namespace) {
      current = current[namespace];
      if (!current) return null;
    }

    // Navigate nested keys
    const keys = key.split('.');
    for (const k of keys) {
      current = current[k];
      if (current === undefined) return null;
    }

    return typeof current === 'string' ? current : null;
  };

  const processTranslation = (
    translation: string, 
    params?: Record<string, any>, 
    options?: TranslationOptions
  ): string => {
    let result = translation;

    // Handle pluralization
    if (options?.count !== undefined && currentLocale) {
      result = handlePluralization(result, options.count, currentLocale.pluralRules);
    }

    // Handle interpolation
    if (params) {
      result = result.replace(i18nConfig.interpolationPattern, (match, key) => {
        const value = params[key.trim()];
        return value !== undefined ? String(value) : match;
      });
    }

    return result;
  };

  const handlePluralization = (
    translation: string, 
    count: number, 
    pluralRules: Locale['pluralRules']
  ): string => {
    // Handle ICU message format: {count, plural, one {# item} other {# items}}
    const pluralMatch = translation.match(/\{[^,]+,\s*plural,\s*(.+)\}/);
    if (pluralMatch) {
      const pluralForms = pluralMatch[1];
      const rule = pluralRules(count);
      
      // Parse plural forms
      const forms: Record<string, string> = {};
      const formRegex = /(\w+)\s*\{([^}]+)\}/g;
      let formMatch;
      
      while ((formMatch = formRegex.exec(pluralForms)) !== null) {
        forms[formMatch[1]] = formMatch[2];
      }
      
      const selectedForm = forms[rule] || forms['other'] || pluralForms;
      return selectedForm.replace(/#/g, count.toString());
    }

    return translation;
  };

  // Formatting functions
  const formatDate = useCallback((date: Date, format?: string): string => {
    if (!currentLocale) return date.toLocaleDateString();
    
    const formatStr = format || currentLocale.dateFormat;
    
    try {
      return new Intl.DateTimeFormat(currentLocale.code, {
        year: formatStr.includes('yyyy') ? 'numeric' : '2-digit',
        month: formatStr.includes('MM') ? '2-digit' : 'numeric',
        day: formatStr.includes('dd') ? '2-digit' : 'numeric'
      }).format(date);
    } catch {
      return date.toLocaleDateString(currentLocale.code);
    }
  }, [currentLocale]);

  const formatTime = useCallback((date: Date, format?: string): string => {
    if (!currentLocale) return date.toLocaleTimeString();
    
    const formatStr = format || currentLocale.timeFormat;
    const use24Hour = !formatStr.includes('a');
    
    try {
      return new Intl.DateTimeFormat(currentLocale.code, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: !use24Hour
      }).format(date);
    } catch {
      return date.toLocaleTimeString(currentLocale.code);
    }
  }, [currentLocale]);

  const formatNumber = useCallback((number: number, options?: Intl.NumberFormatOptions): string => {
    if (!currentLocale) return number.toString();
    
    try {
      return new Intl.NumberFormat(currentLocale.code, options).format(number);
    } catch {
      return number.toString();
    }
  }, [currentLocale]);

  const formatCurrency = useCallback((amount: number, currency?: string): string => {
    if (!currentLocale) return amount.toString();
    
    const currencyCode = currency || currentLocale.numberFormat.currency;
    
    try {
      return new Intl.NumberFormat(currentLocale.code, {
        style: 'currency',
        currency: currencyCode === '€' ? 'EUR' : 
                 currencyCode === '$' ? 'USD' :
                 currencyCode === '¥' ? 'JPY' :
                 currencyCode === 'ر.س' ? 'SAR' : 'USD'
      }).format(amount);
    } catch {
      return `${currencyCode}${amount}`;
    }
  }, [currentLocale]);

  const formatRelativeTime = useCallback((date: Date): string => {
    if (!currentLocale) return date.toString();
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    try {
      const rtf = new Intl.RelativeTimeFormat(currentLocale.code, { numeric: 'auto' });
      
      if (days > 0) return rtf.format(-days, 'day');
      if (hours > 0) return rtf.format(-hours, 'hour');
      if (minutes > 0) return rtf.format(-minutes, 'minute');
      return rtf.format(-seconds, 'second');
    } catch {
      if (days > 0) return `${days} days ago`;
      if (hours > 0) return `${hours} hours ago`;
      if (minutes > 0) return `${minutes} minutes ago`;
      return 'Just now';
    }
  }, [currentLocale]);

  const getDirection = useCallback(() => {
    return currentLocale?.direction || 'ltr';
  }, [currentLocale]);

  const isRTL = currentLocale?.direction === 'rtl';

  return {
    currentLocale: currentLocale!,
    availableLocales,
    isLoading,
    error,
    changeLocale,
    t,
    formatDate,
    formatTime,
    formatNumber,
    formatCurrency,
    formatRelativeTime,
    getDirection,
    isRTL
  };
}

// Context provider component
export function I18nProvider({ 
  children, 
  config 
}: { 
  children: React.ReactNode; 
  config?: Partial<I18nConfig> 
}) {
  const i18n = useInternationalization(config);

  return (
    <I18nContext.Provider value={i18n}>
      {children}
    </I18nContext.Provider>
  );
}

// Hook to use i18n context
export function useI18n(): I18nContext {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

// Convenience hook for translations only
export function useTranslation(namespace?: string) {
  const { t, currentLocale } = useI18n();
  
  const tNs = useCallback((key: string, params?: Record<string, any>, options?: TranslationOptions) => {
    return t(key, params, { ...options, namespace });
  }, [t, namespace]);

  return {
    t: tNs,
    locale: currentLocale?.code,
    direction: currentLocale?.direction,
    isRTL: currentLocale?.direction === 'rtl'
  };
}