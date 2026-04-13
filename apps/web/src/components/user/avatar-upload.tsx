import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Loader2, X, ZoomIn, ZoomOut, RotateCw, Check } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface AvatarUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvatar?: string | null;
  onSuccess?: (avatarUrl: string) => void;
}

export function AvatarUpload({ open, onOpenChange, currentAvatar, onSuccess }: AvatarUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'avatar');

      const response = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload avatar');
      }

      const result = await response.json();
      return result.files[0]; // Get first uploaded file
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      
      if (onSuccess && data.fileUrl) {
        onSuccess(data.fileUrl);
      }
      
      // Reset state
      handleReset();
      onOpenChange(false);
    },
  });

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setZoom(1);
    setRotation(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    // If zoom or rotation applied, we need to process the image
    if (zoom !== 1 || rotation !== 0) {
      // Create a canvas to apply transformations
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.src = previewUrl;

      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Set canvas size for circular crop
      const size = 400;
      canvas.width = size;
      canvas.height = size;

      // Apply transformations
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      // Draw circular clip
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.clip();

      // Draw image centered
      const scaledSize = Math.max(img.width, img.height) * zoom;
      ctx.drawImage(img, -scaledSize / 2, -scaledSize / 2, scaledSize, scaledSize);
      ctx.restore();

      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.95);
      });

      if (!blob) return;

      const processedFile = new File([blob], selectedFile.name, {
        type: 'image/jpeg',
      });

      uploadMutation.mutate(processedFile);
    } else {
      // Upload original file
      uploadMutation.mutate(selectedFile);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Avatar</DialogTitle>
          <DialogDescription>
            Choose a photo to represent yourself. Recommended: Square image, at least 400x400 pixels.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Input */}
          {!selectedFile && (
            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG or GIF (max 10MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Image Preview & Editor */}
          {selectedFile && previewUrl && (
            <div className="space-y-4">
              {/* Preview */}
              <div className="relative w-full aspect-square max-w-md mx-auto bg-muted rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="rounded-full overflow-hidden border-4 border-background shadow-lg"
                    style={{
                      width: '300px',
                      height: '300px',
                    }}
                  >
                    <img
                      src={previewUrl}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                      style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Reset button */}
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleReset}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Editing Controls */}
              <div className="space-y-4">
                {/* Zoom Control */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <ZoomIn className="h-4 w-4" />
                      Zoom
                    </Label>
                    <span className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
                  </div>
                  <Slider
                    value={[zoom]}
                    onValueChange={([value]) => setZoom(value)}
                    min={0.5}
                    max={3}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {/* Rotation Control */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <RotateCw className="h-4 w-4" />
                      Rotation
                    </Label>
                    <span className="text-xs text-muted-foreground">{rotation}°</span>
                  </div>
                  <Slider
                    value={[rotation]}
                    onValueChange={([value]) => setRotation(value)}
                    min={0}
                    max={360}
                    step={15}
                    className="w-full"
                  />
                </div>

                {/* Quick Rotation Buttons */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                  >
                    Rotate 90°
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom(1)}
                  >
                    Reset Zoom
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRotation(0)}
                  >
                    Reset Rotation
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {selectedFile ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={uploadMutation.isPending}
              >
                Choose Different Photo
              </Button>
              <Button
                type="button"
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Upload Avatar
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Compact avatar upload button component
interface AvatarUploadButtonProps {
  currentAvatar?: string | null;
  onSuccess?: (avatarUrl: string) => void;
}

export function AvatarUploadButton({ currentAvatar, onSuccess }: AvatarUploadButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative group"
      >
        <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-border bg-muted">
          {currentAvatar ? (
            <img
              src={currentAvatar}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
              {/* First letter of username or default icon */}
              <Upload className="h-8 w-8" />
            </div>
          )}
        </div>
        <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Upload className="h-6 w-6 text-white" />
        </div>
      </button>

      <AvatarUpload
        open={open}
        onOpenChange={setOpen}
        currentAvatar={currentAvatar}
        onSuccess={onSuccess}
      />
    </>
  );
}

// Label component (add if missing)
function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={className} {...props}>
      {children}
    </label>
  );
}

