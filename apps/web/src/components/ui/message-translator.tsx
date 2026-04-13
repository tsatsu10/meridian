import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';
import { 
  Languages, 
  Loader2,
  Volume2,
  Copy,
  CheckCircle,
  AlertCircle,
  Globe,
  Zap,
  X
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { toast } from '@/lib/toast';

interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
}

interface MessageTranslatorProps {
  text: string;
  onTranslationComplete?: (result: TranslationResult) => void;
  trigger?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  autoDetectLanguage?: boolean;
  defaultTargetLanguage?: string;
}

// Supported languages with their codes and names
const LANGUAGES = [
  { code: 'auto', name: 'Auto Detect', flag: '🌐' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese (Simplified)', flag: '🇨🇳' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', flag: '🇹🇼' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'cs', name: 'Czech', flag: '🇨🇿' },
  { code: 'hu', name: 'Hungarian', flag: '🇭🇺' },
  { code: 'ro', name: 'Romanian', flag: '🇷🇴' },
  { code: 'bg', name: 'Bulgarian', flag: '🇧🇬' },
  { code: 'hr', name: 'Croatian', flag: '🇭🇷' },
  { code: 'sk', name: 'Slovak', flag: '🇸🇰' },
  { code: 'sl', name: 'Slovenian', flag: '🇸🇮' },
  { code: 'et', name: 'Estonian', flag: '🇪🇪' },
  { code: 'lv', name: 'Latvian', flag: '🇱🇻' },
  { code: 'lt', name: 'Lithuanian', flag: '🇱🇹' },
];

// Quick translation pairs for common use cases
const QUICK_TRANSLATIONS = [
  { from: 'en', to: 'es', label: 'English → Spanish' },
  { from: 'en', to: 'fr', label: 'English → French' },
  { from: 'en', to: 'de', label: 'English → German' },
  { from: 'en', to: 'zh', label: 'English → Chinese' },
  { from: 'es', to: 'en', label: 'Spanish → English' },
  { from: 'fr', to: 'en', label: 'French → English' },
];

export default function MessageTranslator({
  text,
  onTranslationComplete,
  trigger,
  disabled = false,
  className,
  autoDetectLanguage = true,
  defaultTargetLanguage = 'en'
}: MessageTranslatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState(autoDetectLanguage ? 'auto' : 'en');
  const [targetLanguage, setTargetLanguage] = useState(defaultTargetLanguage);
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const defaultTrigger = (
    <Button variant="ghost" size="sm" disabled={disabled} title="Translate message">
      <Languages className="w-4 h-4" />
    </Button>
  );

  // Mock translation function (in production, use Google Translate API, DeepL, etc.)
  const translateText = async (text: string, from: string, to: string): Promise<TranslationResult> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    
    // Mock translation results
    const mockTranslations: { [key: string]: string } = {
      'Hello, how are you?': {
        es: 'Hola, ¿cómo estás?',
        fr: 'Bonjour, comment allez-vous?',
        de: 'Hallo, wie geht es dir?',
        zh: '你好，你好吗？',
        ja: 'こんにちは、お元気ですか？',
        ru: 'Привет, как дела?'
      }[to] || `[${to.toUpperCase()}] ${text}`,
      
      'Thank you for your help!': {
        es: '¡Gracias por tu ayuda!',
        fr: 'Merci pour votre aide!',
        de: 'Danke für deine Hilfe!',
        zh: '感谢您的帮助！',
        ja: 'ご協力ありがとうございます！',
        ru: 'Спасибо за помощь!'
      }[to] || `[${to.toUpperCase()}] ${text}`
    };

    const translatedText = mockTranslations[text] || `[${to.toUpperCase()}] ${text}`;
    
    // Simulate occasional errors
    if (Math.random() < 0.1) {
      throw new Error('Translation service temporarily unavailable');
    }

    return {
      translatedText,
      sourceLanguage: from === 'auto' ? 'en' : from,
      targetLanguage: to,
      confidence: 0.85 + Math.random() * 0.15
    };
  };

  const handleTranslate = async () => {
    if (!text.trim()) {
      toast.error('No text to translate');
      return;
    }

    if (sourceLanguage === targetLanguage && sourceLanguage !== 'auto') {
      toast.error('Source and target languages cannot be the same');
      return;
    }

    setIsTranslating(true);
    setError(null);

    try {
      const result = await translateText(text, sourceLanguage, targetLanguage);
      setTranslationResult(result);
      
      if (onTranslationComplete) {
        onTranslationComplete(result);
      }
      
      toast.success('Translation completed!');
    } catch (error) {
      console.error('Translation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Translation failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleQuickTranslate = async (from: string, to: string) => {
    setSourceLanguage(from);
    setTargetLanguage(to);
    
    // Small delay to show the language change
    setTimeout(() => {
      handleTranslate();
    }, 100);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const playAudio = (text: string, language: string) => {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    } catch (error) {
      toast.error('Text-to-speech not available');
    }
  };

  const getLanguageName = (code: string) => {
    return LANGUAGES.find(lang => lang.code === code)?.name || code;
  };

  const getLanguageFlag = (code: string) => {
    return LANGUAGES.find(lang => lang.code === code)?.flag || '🌐';
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTranslationResult(null);
      setError(null);
      setIsCopied(false);
    }
  }, [isOpen]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger || defaultTrigger}
      </PopoverTrigger>
      <PopoverContent 
        className={cn("w-96 p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700", className)} 
        align="start"
      >
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Languages className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium">Translate Message</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Original Text */}
          <div>
            <Label className="text-sm font-medium">Original text</Label>
            <div className="mt-1 p-2 bg-muted/50 rounded-md text-sm max-h-20 overflow-y-auto">
              {text || 'No text selected'}
            </div>
          </div>

          {/* Quick Translation Options */}
          {!translationResult && (
            <div>
              <Label className="text-sm font-medium">Quick translations</Label>
              <div className="mt-2 grid grid-cols-1 gap-1">
                {QUICK_TRANSLATIONS.slice(0, 3).map((option, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickTranslate(option.from, option.to)}
                    disabled={isTranslating || !text.trim()}
                    className="justify-between text-left h-auto p-2"
                  >
                    <span className="text-xs">{option.label}</span>
                    <div className="flex items-center gap-1">
                      <span>{getLanguageFlag(option.from)}</span>
                      <span className="text-xs">→</span>
                      <span>{getLanguageFlag(option.to)}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Language Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium">From</Label>
              <select 
                value={sourceLanguage} 
                onChange={(e) => setSourceLanguage(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {LANGUAGES.slice(0, 15).map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.flag} {language.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <Label className="text-sm font-medium">To</Label>
              <select 
                value={targetLanguage} 
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {LANGUAGES.filter(lang => lang.code !== 'auto').slice(0, 15).map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.flag} {language.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Translate Button */}
          <Button
            onClick={handleTranslate}
            disabled={isTranslating || !text.trim()}
            className="w-full"
          >
            {isTranslating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Translating...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Translate
              </>
            )}
          </Button>

          {/* Error Display */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-red-700 dark:text-red-300">
                  Translation Error
                </div>
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {error}
                </div>
              </div>
            </div>
          )}

          {/* Translation Result */}
          {translationResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <Label className="text-sm font-medium">Translation</Label>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{getLanguageFlag(translationResult.sourceLanguage)}</span>
                  <span>→</span>
                  <span>{getLanguageFlag(translationResult.targetLanguage)}</span>
                  <span>({Math.round(translationResult.confidence * 100)}%)</span>
                </div>
              </div>
              
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                <div className="text-sm">{translationResult.translatedText}</div>
                
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(translationResult.translatedText)}
                    className="h-6 px-2"
                  >
                    {isCopied ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => playAudio(translationResult.translatedText, translationResult.targetLanguage)}
                    className="h-6 px-2"
                    title="Listen to pronunciation"
                  >
                    <Volume2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTranslationResult(null)}
                className="w-full"
              >
                Translate Again
              </Button>
            </div>
          )}

          {/* Info */}
          <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">
            <div className="flex items-start gap-2">
              <Globe className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <div>
                Auto-detect identifies the source language automatically. 
                Translations are powered by AI and may not be perfect.
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Hook for managing translation preferences
export function useMessageTranslation() {
  const [preferredLanguages, setPreferredLanguages] = useState<string[]>(['en', 'es', 'fr']);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [translationHistory, setTranslationHistory] = useState<TranslationResult[]>([]);

  const addToHistory = (result: TranslationResult) => {
    setTranslationHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10
  };

  const getCommonLanguagePairs = () => {
    const pairs = translationHistory.reduce((acc, result) => {
      const pair = `${result.sourceLanguage}-${result.targetLanguage}`;
      acc[pair] = (acc[pair] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return Object.entries(pairs)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([pair]) => {
        const [from, to] = pair.split('-');
        return { from, to };
      });
  };

  const updatePreferences = (languages: string[]) => {
    setPreferredLanguages(languages);
    localStorage.setItem('translation-preferences', JSON.stringify(languages));
  };

  // Load preferences on init
  useEffect(() => {
    const saved = localStorage.getItem('translation-preferences');
    if (saved) {
      setPreferredLanguages(JSON.parse(saved));
    }
  }, []);

  return {
    preferredLanguages,
    autoTranslate,
    translationHistory,
    setAutoTranslate,
    addToHistory,
    getCommonLanguagePairs,
    updatePreferences,
  };
}