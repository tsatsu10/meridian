/**
 * 🎨 Avatar Customizer
 * 
 * Advanced avatar customization component with live preview
 * Allows users to fine-tune their DiceBear avatar appearance
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Palette, 
  RotateCw, 
  Maximize, 
  FlipHorizontal,
  Save,
  RotateCcw,
  Sparkles,
  Eye,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { generateDiceBearAvatar, ROLE_AVATAR_COLORS, type DiceBearStyle } from '@/lib/dicebear';
import { AvatarStyleSelector } from './avatar-style-selector';
import { toast } from 'sonner';

export interface AvatarCustomizerProps {
  /** User email for preview */
  userEmail: string;
  
  /** User name for display */
  userName: string;
  
  /** User role */
  userRole?: string;
  
  /** Initial style */
  initialStyle?: DiceBearStyle;
  
  /** Initial background color */
  initialBackgroundColor?: string;
  
  /** Initial scale */
  initialScale?: number;
  
  /** Initial rotation */
  initialRotation?: number;
  
  /** Initial flip */
  initialFlip?: boolean;
  
  /** Callback when settings are saved */
  onSave?: (preferences: {
    style: DiceBearStyle;
    backgroundColor?: string;
    scale?: number;
    rotation?: number;
    flip?: boolean;
    useRoleColors: boolean;
  }) => void;
  
  /** Show save button */
  showSaveButton?: boolean;
}

export const AvatarCustomizer: React.FC<AvatarCustomizerProps> = ({
  userEmail,
  userName,
  userRole,
  initialStyle = 'personas',
  initialBackgroundColor,
  initialScale = 100,
  initialRotation = 0,
  initialFlip = false,
  onSave,
  showSaveButton = true,
}) => {
  const [style, setStyle] = useState<DiceBearStyle>(initialStyle);
  const [backgroundColor, setBackgroundColor] = useState(
    initialBackgroundColor || ROLE_AVATAR_COLORS[userRole || 'member']
  );
  const [scale, setScale] = useState(initialScale);
  const [rotation, setRotation] = useState(initialRotation);
  const [flip, setFlip] = useState(initialFlip);
  const [useRoleColors, setUseRoleColors] = useState(!initialBackgroundColor);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Track changes
  useEffect(() => {
    const changed = 
      style !== initialStyle ||
      backgroundColor !== initialBackgroundColor ||
      scale !== initialScale ||
      rotation !== initialRotation ||
      flip !== initialFlip;
    setHasChanges(changed);
  }, [style, backgroundColor, scale, rotation, flip, initialStyle, initialBackgroundColor, initialScale, initialRotation, initialFlip]);
  
  // Update background color when role colors toggle changes
  useEffect(() => {
    if (useRoleColors && userRole) {
      setBackgroundColor(ROLE_AVATAR_COLORS[userRole] || ROLE_AVATAR_COLORS['member']);
    }
  }, [useRoleColors, userRole]);
  
  // Generate preview URL
  const previewUrl = generateDiceBearAvatar({
    seed: userEmail,
    style,
    backgroundColor: useRoleColors ? undefined : backgroundColor,
    scale,
    rotate: rotation,
    flip,
  });
  
  const handleSave = () => {
    if (onSave) {
      onSave({
        style,
        backgroundColor: useRoleColors ? undefined : backgroundColor,
        scale,
        rotation,
        flip,
        useRoleColors,
      });
    }
    toast.success('Avatar preferences saved!', {
      description: 'Your new avatar will appear throughout the platform',
    });
    setHasChanges(false);
  };
  
  const handleReset = () => {
    setStyle(initialStyle);
    setBackgroundColor(initialBackgroundColor || ROLE_AVATAR_COLORS[userRole || 'member']);
    setScale(initialScale);
    setRotation(initialRotation);
    setFlip(initialFlip);
    setUseRoleColors(!initialBackgroundColor);
    toast.info('Reset to initial settings');
  };
  
  const handleDownload = () => {
    // Download avatar as SVG
    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = `${userName.replace(/\s+/g, '-')}-avatar.svg`;
    link.click();
    toast.success('Avatar downloaded!');
  };
  
  return (
    <div className="space-y-6">
      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Live Preview
          </CardTitle>
          <CardDescription>
            See your avatar in real-time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-4">
            {/* Large preview */}
            <div className="relative">
              <img
                src={previewUrl}
                alt="Avatar preview"
                className="h-40 w-40 rounded-full border-4 border-primary shadow-lg"
              />
              {hasChanges && (
                <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                  Modified
                </Badge>
              )}
            </div>
            
            {/* User info */}
            <div className="text-center">
              <p className="font-semibold text-lg">{userName}</p>
              {userRole && (
                <Badge variant="outline" className="mt-1 capitalize">
                  {userRole.replace('-', ' ')}
                </Badge>
              )}
            </div>
            
            {/* Preview in different sizes */}
            <div className="flex items-center gap-3">
              <img src={previewUrl} alt="Small" className="h-8 w-8 rounded-full border-2 border-border" />
              <img src={previewUrl} alt="Medium" className="h-12 w-12 rounded-full border-2 border-border" />
              <img src={previewUrl} alt="Large" className="h-16 w-16 rounded-full border-2 border-border" />
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download SVG
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Style Selection */}
      <AvatarStyleSelector
        selectedStyle={style}
        onStyleChange={setStyle}
        userEmail={userEmail}
        userRole={userRole}
        useRoleColors={useRoleColors}
        onRoleColorsChange={setUseRoleColors}
      />
      
      {/* Advanced Customization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Advanced Customization
          </CardTitle>
          <CardDescription>
            Fine-tune your avatar appearance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Background Color (if not using role colors) */}
          {!useRoleColors && (
            <div className="space-y-3">
              <Label htmlFor="bg-color">Background Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="bg-color"
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value.replace('#', ''))}
                  placeholder="6366f1"
                  className="font-mono"
                  maxLength={6}
                />
                <div
                  className="h-10 w-10 rounded-md border-2 border-border flex-shrink-0"
                  style={{ backgroundColor: `#${backgroundColor}` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter hex color without # (e.g., 6366f1 for indigo)
              </p>
            </div>
          )}
          
          <Separator />
          
          {/* Scale */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="scale" className="flex items-center gap-2">
                <Maximize className="h-4 w-4" />
                Scale
              </Label>
              <Badge variant="outline">{scale}%</Badge>
            </div>
            <Slider
              id="scale"
              value={[scale]}
              onValueChange={([value]) => setScale(value)}
              min={50}
              max={150}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Zoom the avatar in or out
            </p>
          </div>
          
          <Separator />
          
          {/* Rotation */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="rotation" className="flex items-center gap-2">
                <RotateCw className="h-4 w-4" />
                Rotation
              </Label>
              <Badge variant="outline">{rotation}°</Badge>
            </div>
            <Slider
              id="rotation"
              value={[rotation]}
              onValueChange={([value]) => setRotation(value)}
              min={0}
              max={360}
              step={15}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Rotate the avatar clockwise
            </p>
          </div>
          
          <Separator />
          
          {/* Flip */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="flip" className="flex items-center gap-2">
                <FlipHorizontal className="h-4 w-4" />
                Flip Horizontally
              </Label>
              <p className="text-xs text-muted-foreground">
                Mirror the avatar left to right
              </p>
            </div>
            <Switch
              id="flip"
              checked={flip}
              onCheckedChange={setFlip}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Action buttons */}
      {showSaveButton && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Avatar Preferences
          </Button>
        </div>
      )}
    </div>
  );
};

export default AvatarCustomizer;

