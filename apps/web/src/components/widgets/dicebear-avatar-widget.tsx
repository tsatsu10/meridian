/**
 * 🎨 DiceBear Avatar Widget
 * 
 * Dashboard widget showing user's avatar with quick customization
 * Features:
 * - Live avatar preview
 * - Quick style switcher
 * - Role-based color indicator
 * - Link to full customization
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Palette, Settings, Sparkles, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { generateDiceBearAvatar, getAvailableStyles, type DiceBearStyle } from '@/lib/dicebear';
import { useAuthStore } from '@/store/consolidated/auth';
import { useRouter } from '@tanstack/react-router';

export interface DiceBearAvatarWidgetProps {
  className?: string;
}

const QUICK_STYLES: Array<{ value: DiceBearStyle; label: string; emoji: string }> = [
  { value: 'personas', label: 'Professional', emoji: '👔' },
  { value: 'adventurer', label: 'Friendly', emoji: '😊' },
  { value: 'bottts', label: 'Robot', emoji: '🤖' },
  { value: 'shapes', label: 'Abstract', emoji: '🎨' },
  { value: 'pixel-art', label: 'Retro', emoji: '👾' },
];

export const DiceBearAvatarWidget: React.FC<DiceBearAvatarWidgetProps> = ({
  className,
}) => {
  const { user } = useAuthStore();
  const router = useRouter();
  const [currentStyle, setCurrentStyle] = useState<DiceBearStyle>(
    (user?.avatarStyle as DiceBearStyle) || 'personas'
  );
  const [isHovering, setIsHovering] = useState(false);
  
  if (!user) {
    return null;
  }
  
  const avatarUrl = generateDiceBearAvatar({
    seed: user.email,
    style: currentStyle,
  });
  
  const handleStyleChange = (newStyle: DiceBearStyle) => {
    setCurrentStyle(newStyle);
    // TODO: Save to user preferences
  };
  
  const handleCustomize = () => {
    router.navigate({ to: '/dashboard/settings/profile' });
  };
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Palette className="h-4 w-4 text-purple-500" />
          My Avatar
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleCustomize}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Avatar Preview */}
        <div
          className="relative group"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <div className="flex justify-center">
            <div className="relative">
              <img
                src={avatarUrl}
                alt={`${user.name}'s avatar`}
                className={cn(
                  "h-32 w-32 rounded-full border-4 transition-all duration-300",
                  isHovering ? "border-primary shadow-lg scale-105" : "border-border shadow-md"
                )}
              />
              
              {/* Role badge */}
              {user.role && (
                <Badge
                  className="absolute bottom-0 right-0 capitalize"
                  variant="secondary"
                >
                  {user.role.replace('-', ' ')}
                </Badge>
              )}
            </div>
          </div>
          
          {/* User info */}
          <div className="text-center mt-3">
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        
        {/* Quick style switcher */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Quick Style
          </Label>
          <Select value={currentStyle} onValueChange={handleStyleChange}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUICK_STYLES.map((style) => (
                <SelectItem key={style.value} value={style.value}>
                  <span className="flex items-center gap-2">
                    <span>{style.emoji}</span>
                    <span>{style.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const randomStyle = QUICK_STYLES[Math.floor(Math.random() * QUICK_STYLES.length)];
              setCurrentStyle(randomStyle.value);
            }}
            className="gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Random
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleCustomize}
            className="gap-1"
          >
            <Palette className="h-3 w-3" />
            Customize
          </Button>
        </div>
        
        {/* Info */}
        <div className="p-2 bg-muted/50 rounded-md">
          <p className="text-xs text-muted-foreground text-center">
            Your avatar is automatically generated and appears throughout Meridian
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DiceBearAvatarWidget;

