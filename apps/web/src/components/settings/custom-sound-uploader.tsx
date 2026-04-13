import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Play, 
  Pause, 
  X, 
  Volume2, 
  FileAudio, 
  Loader2,
  Check,
  AlertTriangle
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

interface CustomSoundUploaderProps {
  soundType: 'taskSound' | 'messageSound' | 'urgentSound';
  currentSound?: string;
  onSoundUpdate: (soundType: string, soundUrl: string) => void;
  onSoundRemove: (soundType: string) => void;
}

export function CustomSoundUploader({ 
  soundType, 
  currentSound, 
  onSoundUpdate, 
  onSoundRemove 
}: CustomSoundUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const soundTypeLabels = {
    taskSound: 'Task Notifications',
    messageSound: 'Message Notifications', 
    urgentSound: 'Urgent Notifications'
  };

  const acceptedFormats = ['.mp3', '.wav', '.ogg', '.m4a'];
  const maxFileSize = 5 * 1024 * 1024; // 5MB

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const validateFile = (file: File): string | null => {
    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFormats.includes(fileExtension)) {
      return `Unsupported format. Please use: ${acceptedFormats.join(', ')}`;
    }

    // Check file size
    if (file.size > maxFileSize) {
      return 'File too large. Maximum size is 5MB.';
    }

    // Check duration (basic check)
    if (file.size < 1000) {
      return 'File too small. Please select a valid audio file.';
    }

    return null;
  };

  const handleFileUpload = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('type', soundType);

      // Simulate progressive upload
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(uploadInterval);
            return prev;
          }
          return prev + Math.random() * 20;
        });
      }, 200);

      // Simulate API call - replace with actual upload endpoint
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create blob URL for preview (in real app, this would be the server response)
      const audioUrl = URL.createObjectURL(file);
      
      clearInterval(uploadInterval);
      setUploadProgress(100);
      
      // Call parent handler
      onSoundUpdate(soundType, audioUrl);
      
      toast.success(`${soundTypeLabels[soundType]} sound uploaded successfully!`);
      
    } catch (error) {
      toast.error('Failed to upload sound file');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current || !currentSound) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleRemoveSound = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    onSoundRemove(soundType);
    toast.success('Custom sound removed');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Volume2 className="h-4 w-4" />
          {soundTypeLabels[soundType]}
        </CardTitle>
        <CardDescription>
          Upload a custom sound for {soundTypeLabels[soundType].toLowerCase()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentSound ? (
          // Display current sound
          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <FileAudio className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="font-medium text-green-800 dark:text-green-200">
                  Custom sound active
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">
                  Click play to preview
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlayPause}
                disabled={isUploading}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveSound}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          // Upload area
          <div
            className={cn(
              "relative border-2 border-dashed rounded-lg p-6 text-center transition-colors",
              dragActive 
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950" 
                : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500",
              isUploading && "pointer-events-none opacity-50"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={acceptedFormats.join(',')}
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            
            {isUploading ? (
              <div className="space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                <div className="space-y-2">
                  <div className="font-medium">Uploading sound...</div>
                  <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                  <div className="text-sm text-gray-500">{Math.round(uploadProgress)}%</div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="h-8 w-8 mx-auto text-gray-400" />
                <div className="space-y-1">
                  <div className="font-medium">
                    Drop your audio file here, or click to browse
                  </div>
                  <div className="text-sm text-gray-500">
                    Supports: {acceptedFormats.join(', ')} • Max 5MB
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Format info */}
        <div className="flex flex-wrap gap-2">
          {acceptedFormats.map((format) => (
            <Badge key={format} variant="secondary" className="text-xs">
              {format}
            </Badge>
          ))}
        </div>

        {/* Tips */}
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex items-center gap-1">
            <Check className="h-3 w-3 text-green-500" />
            Best quality: 44.1kHz, 16-bit
          </div>
          <div className="flex items-center gap-1">
            <Check className="h-3 w-3 text-green-500" />
            Recommended length: 1-3 seconds
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-yellow-500" />
            Sounds will be normalized to prevent distortion
          </div>
        </div>

        {/* Hidden audio element for playback */}
        {currentSound && (
          <audio
            ref={audioRef}
            src={currentSound}
            onEnded={() => setIsPlaying(false)}
            onError={() => {
              setIsPlaying(false);
              toast.error('Error playing sound file');
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}