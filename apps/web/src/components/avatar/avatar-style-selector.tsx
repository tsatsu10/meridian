/**
 * 🎨 Avatar Style Selector
 * 
 * Component for users to choose their preferred avatar style
 * Displays all available DiceBear styles with live previews
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Palette, Check, Sparkles, Briefcase, Heart, Cpu, Shapes as ShapesIcon, Smile } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getAvailableStyles, generateDiceBearAvatar, type DiceBearStyle } from '@/lib/dicebear';
import type { AvatarStyleCategory } from '@/types/dicebear';

export interface AvatarStyleSelectorProps {
  /** Current selected style */
  selectedStyle: DiceBearStyle;
  
  /** Callback when style changes */
  onStyleChange: (style: DiceBearStyle) => void;
  
  /** User email for preview */
  userEmail: string;
  
  /** User role */
  userRole?: string;
  
  /** Whether to use role-based colors */
  useRoleColors?: boolean;
  
  /** Callback when role color toggle changes */
  onRoleColorsChange?: (enabled: boolean) => void;
  
  /** Show only specific categories */
  categories?: AvatarStyleCategory[];
  
  /** Compact mode */
  compact?: boolean;
}

const categoryIcons: Record<AvatarStyleCategory, any> = {
  professional: Briefcase,
  friendly: Heart,
  tech: Cpu,
  abstract: ShapesIcon,
  fun: Smile,
};

const categoryLabels: Record<AvatarStyleCategory, string> = {
  professional: 'Professional',
  friendly: 'Friendly',
  tech: 'Tech',
  abstract: 'Abstract',
  fun: 'Fun',
};

export const AvatarStyleSelector: React.FC<AvatarStyleSelectorProps> = ({
  selectedStyle,
  onStyleChange,
  userEmail,
  userRole,
  useRoleColors = true,
  onRoleColorsChange,
  categories,
  compact = false,
}) => {
  const allStyles = getAvailableStyles();
  
  // Filter by categories if provided
  const availableStyles = categories
    ? allStyles.filter(style => categories.includes(style.category))
    : allStyles;
  
  // Group styles by category
  const stylesByCategory = availableStyles.reduce((acc, style) => {
    if (!acc[style.category]) {
      acc[style.category] = [];
    }
    acc[style.category].push(style);
    return acc;
  }, {} as Record<AvatarStyleCategory, typeof availableStyles>);
  
  const categoriesToShow = (categories || Object.keys(stylesByCategory)) as AvatarStyleCategory[];
  
  // Get preview URL with current settings
  const getPreviewUrl = (style: DiceBearStyle) => {
    return generateDiceBearAvatar({
      seed: userEmail,
      style,
      backgroundColor: useRoleColors && userRole 
        ? undefined // Will use role color
        : '6366f1', // Default indigo
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Avatar Style
        </CardTitle>
        <CardDescription>
          Choose your preferred avatar appearance
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Role-based colors toggle */}
        {onRoleColorsChange && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="role-colors" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Use Role-Based Colors
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatically color your avatar based on your role
              </p>
            </div>
            <Switch
              id="role-colors"
              checked={useRoleColors}
              onCheckedChange={onRoleColorsChange}
            />
          </div>
        )}
        
        {/* Style selector with tabs */}
        <Tabs defaultValue={categoriesToShow[0]} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${categoriesToShow.length}, 1fr)` }}>
            {categoriesToShow.map(category => {
              const Icon = categoryIcons[category];
              return (
                <TabsTrigger key={category} value={category} className="gap-1">
                  <Icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{categoryLabels[category]}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
          
          {categoriesToShow.map(category => (
            <TabsContent key={category} value={category} className="mt-4">
              <RadioGroup value={selectedStyle} onValueChange={onStyleChange}>
                <div className={cn(
                  'grid gap-4',
                  compact ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-4'
                )}>
                  {stylesByCategory[category]?.map(style => (
                    <div key={style.value} className="relative">
                      <RadioGroupItem
                        value={style.value}
                        id={`style-${style.value}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`style-${style.value}`}
                        className={cn(
                          'flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all',
                          'hover:border-primary/50 hover:shadow-sm',
                          selectedStyle === style.value
                            ? 'border-primary bg-primary/5 shadow-md'
                            : 'border-border bg-background'
                        )}
                      >
                        {/* Preview */}
                        <div className="relative">
                          <img
                            src={getPreviewUrl(style.value)}
                            alt={style.label}
                            className={cn(
                              'rounded-full border-2',
                              compact ? 'h-16 w-16' : 'h-20 w-20',
                              selectedStyle === style.value ? 'border-primary' : 'border-border'
                            )}
                          />
                          {selectedStyle === style.value && (
                            <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-1">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                        
                        {/* Label */}
                        <div className="text-center w-full">
                          <p className={cn(
                            'font-medium truncate',
                            compact ? 'text-xs' : 'text-sm'
                          )}>
                            {style.label}
                          </p>
                          {!compact && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {style.description}
                            </p>
                          )}
                        </div>
                        
                        {/* Recommended badge */}
                        {style.value === 'personas' && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Recommended
                          </Badge>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </TabsContent>
          ))}
        </Tabs>
        
        {/* Selected style info */}
        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="flex items-start gap-2">
            <Palette className="h-4 w-4 mt-0.5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {allStyles.find(s => s.value === selectedStyle)?.label || 'Current Style'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {allStyles.find(s => s.value === selectedStyle)?.description}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AvatarStyleSelector;

