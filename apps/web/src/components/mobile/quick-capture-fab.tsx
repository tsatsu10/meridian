import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Mic,
  Camera,
  MapPin,
  Send,
  X,
  Image as ImageIcon,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface QuickCaptureData {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  voiceNote?: File;
  photo?: File;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

export function QuickCaptureFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [formData, setFormData] = useState<QuickCaptureData>({
    title: "",
    description: "",
    priority: "medium",
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const queryClient = useQueryClient();

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: QuickCaptureData) => {
      const formDataToSend = new FormData();
      formDataToSend.append("title", data.title);
      formDataToSend.append("description", data.description);
      formDataToSend.append("priority", data.priority);
      
      if (data.voiceNote) {
        formDataToSend.append("voiceNote", data.voiceNote);
      }
      if (data.photo) {
        formDataToSend.append("photo", data.photo);
      }
      if (data.location) {
        formDataToSend.append("location", JSON.stringify(data.location));
      }

      const response = await fetch("/api/tasks/quick-capture", {
        method: "POST",
        body: formDataToSend,
      });

      if (!response.ok) throw new Error("Failed to create task");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Task Created", {
        description: "Your task has been successfully created",
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      handleClose();
    },
    onError: () => {
      toast.error("Error", {
        description: "Failed to create task. Please try again.",
      });
    },
  });

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], "voice-note.webm", { type: "audio/webm" });
        setFormData({ ...formData, voiceNote: audioFile });
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      
      // Start timer
      let seconds = 0;
      recordingIntervalRef.current = setInterval(() => {
        seconds++;
        setRecordingTime(seconds);
      }, 1000);

      toast.success("Recording Started", {
        description: "Speak your task details",
      });
    } catch (error) {
      toast.error("Microphone Access Denied", {
        description: "Please allow microphone access to record voice notes",
      });
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }

      toast.success("Recording Stopped", {
        description: `Voice note saved (${recordingTime}s)`,
      });
      setRecordingTime(0);
    }
  };

  // Handle photo capture
  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFormData({ ...formData, photo: file });
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      toast.success("Photo Attached", {
        description: file.name,
      });
    }
  };

  // Get current location
  const captureLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Try to get address (simplified)
          let address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          
          setFormData({
            ...formData,
            location: { latitude, longitude, address },
          });

          toast.success("Location Captured", {
            description: address,
          });
        },
        (error) => {
          toast.error("Location Access Denied", {
            description: "Please allow location access to tag tasks",
          });
        }
      );
    } else {
      toast.error("Location Not Supported", {
        description: "Your browser doesn't support geolocation",
      });
    }
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast.error("Title Required", {
        description: "Please enter a task title",
      });
      return;
    }

    createTaskMutation.mutate(formData);
  };

  // Close dialog
  const handleClose = () => {
    setIsOpen(false);
    setFormData({
      title: "",
      description: "",
      priority: "medium",
    });
    setPhotoPreview(null);
    if (isRecording) {
      stopRecording();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <>
      {/* Floating Action Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-16 w-16 rounded-full shadow-lg",
          "bg-primary hover:bg-primary/90 transition-all duration-300",
          "hover:scale-110 active:scale-95",
          "md:hidden" // Only show on mobile
        )}
        aria-label="Quick capture task"
      >
        <Plus className="h-8 w-8" />
      </Button>

      {/* Quick Capture Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quick Capture</DialogTitle>
            <DialogDescription>
              Quickly create a task with voice, photo, or location
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="What needs to be done?"
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add details..."
                rows={3}
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value as any })}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <Label>Quick Actions</Label>
              <div className="flex gap-2">
                {/* Voice Note */}
                <Button
                  type="button"
                  variant={formData.voiceNote || isRecording ? "default" : "outline"}
                  size="sm"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={createTaskMutation.isPending}
                >
                  <Mic className="h-4 w-4 mr-2" />
                  {isRecording ? formatTime(recordingTime) : formData.voiceNote ? "Recorded" : "Voice"}
                </Button>

                {/* Photo */}
                <Button
                  type="button"
                  variant={formData.photo ? "default" : "outline"}
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={createTaskMutation.isPending}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {formData.photo ? "Added" : "Photo"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  className="hidden"
                />

                {/* Location */}
                <Button
                  type="button"
                  variant={formData.location ? "default" : "outline"}
                  size="sm"
                  onClick={captureLocation}
                  disabled={createTaskMutation.isPending}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  {formData.location ? "Tagged" : "Location"}
                </Button>
              </div>
            </div>

            {/* Photo Preview */}
            {photoPreview && (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Task attachment"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setPhotoPreview(null);
                    setFormData({ ...formData, photo: undefined });
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Attachments Summary */}
            {(formData.voiceNote || formData.photo || formData.location) && (
              <div className="space-y-2">
                <Label>Attachments</Label>
                <div className="flex flex-wrap gap-2">
                  {formData.voiceNote && (
                    <Badge variant="outline" className="gap-1">
                      <Mic className="h-3 w-3" />
                      Voice Note
                    </Badge>
                  )}
                  {formData.photo && (
                    <Badge variant="outline" className="gap-1">
                      <ImageIcon className="h-3 w-3" />
                      Photo
                    </Badge>
                  )}
                  {formData.location && (
                    <Badge variant="outline" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      {formData.location.address}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={createTaskMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createTaskMutation.isPending}>
              {createTaskMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Create Task
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

