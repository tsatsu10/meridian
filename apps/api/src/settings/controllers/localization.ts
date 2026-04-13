import { getDatabase } from "../../database/connection";
import { workspaces } from "../../database/schema";
import { eq } from "drizzle-orm";
import { logger } from "../../utils/logger";
import { createId } from "@paralleldrive/cuid2";

// ===================================
// TYPE DEFINITIONS
// ===================================

export interface Language {
  id: string;
  workspaceId: string;
  languageCode: string; // ISO 639-1 code (e.g., 'en', 'es', 'fr')
  languageName: string; // Display name (e.g., 'English', 'Español')
  isEnabled: boolean;
  isDefault: boolean;
  completionPercentage: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
}

export interface Translation {
  key: string;
  value: string;
  context?: string;
  pluralForm?: string;
}

export interface TranslationSet {
  languageCode: string;
  translations: Record<string, Translation>;
}

export interface LocalizationSettings {
  workspaceId: string;
  defaultLanguage: string;
  enabledLanguages: string[];
  fallbackLanguage: string;
  autoDetectLanguage: boolean;
  rtlLanguages: string[]; // Right-to-left languages
  dateFormat: string;
  timeFormat: '12h' | '24h';
  numberFormat: {
    decimalSeparator: string;
    thousandSeparator: string;
  };
  currencyFormat: {
    symbol: string;
    position: 'before' | 'after';
  };
  firstDayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday
  timezone: string;
  updatedAt: Date;
}

// ===================================
// SUPPORTED LANGUAGES
// ===================================

export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', nativeName: 'English', rtl: false },
  es: { name: 'Spanish', nativeName: 'Español', rtl: false },
  fr: { name: 'French', nativeName: 'Français', rtl: false },
  de: { name: 'German', nativeName: 'Deutsch', rtl: false },
  it: { name: 'Italian', nativeName: 'Italiano', rtl: false },
  pt: { name: 'Portuguese', nativeName: 'Português', rtl: false },
  ja: { name: 'Japanese', nativeName: '日本語', rtl: false },
  'zh-CN': { name: 'Chinese (Simplified)', nativeName: '简体中文', rtl: false },
  ar: { name: 'Arabic', nativeName: 'العربية', rtl: true },
  ru: { name: 'Russian', nativeName: 'Русский', rtl: false },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', rtl: false },
  ko: { name: 'Korean', nativeName: '한국어', rtl: false },
};

// ===================================
// DEFAULT TRANSLATIONS (English)
// ===================================

const DEFAULT_TRANSLATIONS: Record<string, Translation> = {
  'common.save': { key: 'common.save', value: 'Save' },
  'common.cancel': { key: 'common.cancel', value: 'Cancel' },
  'common.delete': { key: 'common.delete', value: 'Delete' },
  'common.edit': { key: 'common.edit', value: 'Edit' },
  'common.create': { key: 'common.create', value: 'Create' },
  'common.search': { key: 'common.search', value: 'Search' },
  'common.filter': { key: 'common.filter', value: 'Filter' },
  'common.export': { key: 'common.export', value: 'Export' },
  'common.import': { key: 'common.import', value: 'Import' },
  'nav.dashboard': { key: 'nav.dashboard', value: 'Dashboard' },
  'nav.projects': { key: 'nav.projects', value: 'Projects' },
  'nav.tasks': { key: 'nav.tasks', value: 'Tasks' },
  'nav.calendar': { key: 'nav.calendar', value: 'Calendar' },
  'nav.settings': { key: 'nav.settings', value: 'Settings' },
};

// ===================================
// CRUD OPERATIONS
// ===================================

/**
 * Get all languages for a workspace
 */
export async function getLanguages(workspaceId: string): Promise<Language[]> {
  const db = getDatabase();
  logger.info(`Fetching languages for workspace: ${workspaceId}`);

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const languages = (workspace.settings as any)?.languages || [];
  
  // Ensure English is always present
  if (languages.length === 0) {
    const defaultLanguage: Language = {
      id: createId(),
      workspaceId,
      languageCode: 'en',
      languageName: 'English',
      isEnabled: true,
      isDefault: true,
      completionPercentage: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    languages.push(defaultLanguage);
  }

  return languages;
}

/**
 * Get a single language
 */
export async function getLanguage(workspaceId: string, languageCode: string): Promise<Language | null> {
  const languages = await getLanguages(workspaceId);
  return languages.find(l => l.languageCode === languageCode) || null;
}

/**
 * Add a new language
 */
export async function addLanguage(
  workspaceId: string,
  languageCode: string
): Promise<Language> {
  const db = getDatabase();
  logger.info(`Adding language ${languageCode} to workspace: ${workspaceId}`);

  if (!SUPPORTED_LANGUAGES[languageCode as keyof typeof SUPPORTED_LANGUAGES]) {
    throw new Error("Unsupported language code");
  }

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const existingLanguages = (workspace.settings as any)?.languages || [];
  
  if (existingLanguages.some((l: Language) => l.languageCode === languageCode)) {
    throw new Error("Language already exists");
  }

  const langInfo = SUPPORTED_LANGUAGES[languageCode as keyof typeof SUPPORTED_LANGUAGES];
  const newLanguage: Language = {
    id: createId(),
    workspaceId,
    languageCode,
    languageName: langInfo.name,
    isEnabled: true,
    isDefault: false,
    completionPercentage: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const updatedLanguages = [...existingLanguages, newLanguage];

  await db
    .update(workspaces)
    .set({
      settings: {
        ...(workspace.settings as any),
        languages: updatedLanguages,
      },
    })
    .where(eq(workspaces.id, workspaceId));

  logger.info(`Language added: ${languageCode}`);
  return newLanguage;
}

/**
 * Update a language
 */
export async function updateLanguage(
  workspaceId: string,
  languageCode: string,
  updates: Partial<Omit<Language, 'id' | 'workspaceId' | 'languageCode' | 'createdAt'>>
): Promise<Language> {
  const db = getDatabase();
  logger.info(`Updating language ${languageCode} for workspace: ${workspaceId}`);

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const existingLanguages = (workspace.settings as any)?.languages || [];
  const langIndex = existingLanguages.findIndex((l: Language) => l.languageCode === languageCode);

  if (langIndex === -1) {
    throw new Error("Language not found");
  }

  const updatedLanguage = {
    ...existingLanguages[langIndex],
    ...updates,
    updatedAt: new Date(),
  };

  existingLanguages[langIndex] = updatedLanguage;

  await db
    .update(workspaces)
    .set({
      settings: {
        ...(workspace.settings as any),
        languages: existingLanguages,
      },
    })
    .where(eq(workspaces.id, workspaceId));

  logger.info(`Language updated: ${languageCode}`);
  return updatedLanguage;
}

/**
 * Delete a language
 */
export async function deleteLanguage(workspaceId: string, languageCode: string): Promise<void> {
  const db = getDatabase();
  logger.info(`Deleting language ${languageCode} from workspace: ${workspaceId}`);

  if (languageCode === 'en') {
    throw new Error("Cannot delete default English language");
  }

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const existingLanguages = (workspace.settings as any)?.languages || [];
  const updatedLanguages = existingLanguages.filter((l: Language) => l.languageCode !== languageCode);

  await db
    .update(workspaces)
    .set({
      settings: {
        ...(workspace.settings as any),
        languages: updatedLanguages,
        // Also remove translations for this language
        translations: {
          ...((workspace.settings as any)?.translations || {}),
          [languageCode]: undefined,
        },
      },
    })
    .where(eq(workspaces.id, workspaceId));

  logger.info(`Language deleted: ${languageCode}`);
}

/**
 * Get translations for a language
 */
export async function getTranslations(
  workspaceId: string,
  languageCode: string
): Promise<Record<string, Translation>> {
  const db = getDatabase();
  logger.info(`Fetching translations for ${languageCode} in workspace: ${workspaceId}`);

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const translations = (workspace.settings as any)?.translations?.[languageCode] || {};

  // Return default translations for English if none exist
  if (languageCode === 'en' && Object.keys(translations).length === 0) {
    return DEFAULT_TRANSLATIONS;
  }

  return translations;
}

/**
 * Update translations for a language
 */
export async function updateTranslations(
  workspaceId: string,
  languageCode: string,
  translations: Record<string, Translation>
): Promise<void> {
  const db = getDatabase();
  logger.info(`Updating translations for ${languageCode} in workspace: ${workspaceId}`);

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const currentTranslations = (workspace.settings as any)?.translations || {};
  const updatedTranslations = {
    ...currentTranslations,
    [languageCode]: translations,
  };

  // Calculate completion percentage
  const languages = (workspace.settings as any)?.languages || [];
  const langIndex = languages.findIndex((l: Language) => l.languageCode === languageCode);
  
  if (langIndex !== -1) {
    const totalKeys = Object.keys(DEFAULT_TRANSLATIONS).length;
    const translatedKeys = Object.keys(translations).filter(key => translations[key]?.value).length;
    languages[langIndex].completionPercentage = Math.round((translatedKeys / totalKeys) * 100);
    languages[langIndex].updatedAt = new Date();
  }

  await db
    .update(workspaces)
    .set({
      settings: {
        ...(workspace.settings as any),
        translations: updatedTranslations,
        languages,
      },
    })
    .where(eq(workspaces.id, workspaceId));

  logger.info(`Translations updated for ${languageCode}`);
}

/**
 * Export translations
 */
export async function exportTranslations(
  workspaceId: string,
  languageCode?: string,
  format: 'json' | 'csv' = 'json'
): Promise<string> {
  logger.info(`Exporting translations for workspace: ${workspaceId}, language: ${languageCode || 'all'}`);

  if (languageCode) {
    const translations = await getTranslations(workspaceId, languageCode);
    
    if (format === 'json') {
      return JSON.stringify(translations, null, 2);
    } else {
      // CSV format
      const csvRows = [
        ['Key', 'Value', 'Context'].join(','),
        ...Object.values(translations).map(t => 
          [t.key, `"${t.value.replace(/"/g, '""')}"`, t.context || ''].join(',')
        ),
      ];
      return csvRows.join('\n');
    }
  } else {
    // Export all languages
    const languages = await getLanguages(workspaceId);
    const allTranslations: Record<string, Record<string, Translation>> = {};
    
    for (const lang of languages) {
      allTranslations[lang.languageCode] = await getTranslations(workspaceId, lang.languageCode);
    }
    
    return JSON.stringify(allTranslations, null, 2);
  }
}

/**
 * Import translations
 */
export async function importTranslations(
  workspaceId: string,
  languageCode: string,
  data: string,
  format: 'json' | 'csv' = 'json'
): Promise<{ imported: number; errors: string[] }> {
  logger.info(`Importing translations for ${languageCode} in workspace: ${workspaceId}`);

  const errors: string[] = [];
  let imported = 0;

  try {
    let translations: Record<string, Translation> = {};

    if (format === 'json') {
      const parsed = JSON.parse(data);
      translations = parsed;
    } else {
      // CSV format
      const lines = data.split('\n');
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const match = line.match(/^([^,]+),"([^"]*(?:""[^"]*)*)",(.*)$/);
        if (match) {
          const [, key, value, context] = match;
          translations[key] = {
            key,
            value: value.replace(/""/g, '"'),
            context: context || undefined,
          };
        }
      }
    }

    await updateTranslations(workspaceId, languageCode, translations);
    imported = Object.keys(translations).length;
  } catch (error: any) {
    errors.push(error.message);
  }

  return { imported, errors };
}

/**
 * Get localization settings
 */
export async function getLocalizationSettings(workspaceId: string): Promise<LocalizationSettings> {
  const db = getDatabase();
  logger.info(`Fetching localization settings for workspace: ${workspaceId}`);

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const settings = (workspace.settings as any)?.localizationSettings || {};
  
  return {
    workspaceId,
    defaultLanguage: settings.defaultLanguage || 'en',
    enabledLanguages: settings.enabledLanguages || ['en'],
    fallbackLanguage: settings.fallbackLanguage || 'en',
    autoDetectLanguage: settings.autoDetectLanguage ?? true,
    rtlLanguages: settings.rtlLanguages || ['ar', 'he'],
    dateFormat: settings.dateFormat || 'YYYY-MM-DD',
    timeFormat: settings.timeFormat || '24h',
    numberFormat: settings.numberFormat || {
      decimalSeparator: '.',
      thousandSeparator: ',',
    },
    currencyFormat: settings.currencyFormat || {
      symbol: '$',
      position: 'before',
    },
    firstDayOfWeek: settings.firstDayOfWeek ?? 0,
    timezone: settings.timezone || 'UTC',
    updatedAt: new Date(settings.updatedAt || workspace.updatedAt),
  };
}

/**
 * Update localization settings
 */
export async function updateLocalizationSettings(
  workspaceId: string,
  updates: Partial<Omit<LocalizationSettings, 'workspaceId' | 'updatedAt'>>
): Promise<LocalizationSettings> {
  const db = getDatabase();
  logger.info(`Updating localization settings for workspace: ${workspaceId}`);

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const currentSettings = (workspace.settings as any)?.localizationSettings || {};
  const updatedSettings = {
    ...currentSettings,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await db
    .update(workspaces)
    .set({
      settings: {
        ...(workspace.settings as any),
        localizationSettings: updatedSettings,
      },
    })
    .where(eq(workspaces.id, workspaceId));

  logger.info(`Localization settings updated for workspace: ${workspaceId}`);
  
  return getLocalizationSettings(workspaceId);
}


