"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from '@/lib/toast';
import type { ProfileFormValues } from "@/types/profile";
import { getUserInitials } from "@/types/profile";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect, useCallback, useMemo } from "react";
import { updateProfile } from "@/lib/api/profile";
import { profileSettingsSchema } from "@/lib/validations/profile";
import { User } from "next-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Camera, Globe, Briefcase, Link, MapPin, Settings, User as UserIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDebounce } from "@/hooks/use-debounce";
import { optimizeAvatarImage, formatFileSize } from "@/lib/image-optimization";

/**
 * Performance Optimization: Constants moved outside component
 * Prevents recreation on each render, improving memory efficiency
 */
const REQUIRED_FIELDS = ['name', 'email'] as const;
const OPTIONAL_IMPORTANT_FIELDS = ['avatar', 'bio', 'jobTitle', 'location'] as const;
const OPTIONAL_FIELDS = ['company', 'department', 'headline', 'phone', 'website', 'linkedinUrl', 'githubUrl', 'twitterUrl', 'timezone', 'language'] as const;
const IGNORE_FIELDS = ['isPublic', 'allowDirectMessages', 'showOnlineStatus', 'skills'] as const;

/**
 * Field weights for profile completion calculation
 * Higher weight = more important for profile completion percentage
 */
const FIELD_WEIGHTS = {
  required: 3,     // Must-have fields
  important: 2,    // Recommended fields
  optional: 1,     // Nice-to-have fields
} as const;

interface ProfileSettingsFormProps {
  user: User;
}

export function ProfileSettingsForm({ user }: ProfileSettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [profileProgress, setProfileProgress] = useState(0);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [autoSaveController, setAutoSaveController] = useState<AbortController | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: {
      name: user.name || "",
      email: user.email || "",
      avatar: user.image || "",
      jobTitle: "",
      company: "",
      department: "",
      headline: "",
      bio: "",
      location: "",
      phone: "",
      website: "",
      linkedinUrl: "",
      githubUrl: "",
      twitterUrl: "",
      timezone: "",
      language: "",
      skills: [],
      isPublic: true,
      allowDirectMessages: true,
      showOnlineStatus: true,
    },
  });

  const debouncedAutoSave = useDebounce(async (values: ProfileFormValues) => {
    if (!hasUnsavedChanges) return;
    
    // Cancel any in-flight auto-save request
    if (autoSaveController) {
      autoSaveController.abort();
    }
    
    // Create new abort controller for this request
    const controller = new AbortController();
    setAutoSaveController(controller);
    setAutoSaveStatus("saving");
    
    try {
      await updateProfile(values);
      
      // Only update status if this request wasn't aborted
      if (!controller.signal.aborted) {
        setAutoSaveStatus("saved");
        setHasUnsavedChanges(false);
        setAutoSaveController(null);
        
        // Reset "saved" status after 3 seconds
        setTimeout(() => {
          if (!controller.signal.aborted) {
            setAutoSaveStatus("idle");
          }
        }, 3000);
      }
    } catch (error: unknown) {
      // Don't show error if request was intentionally aborted
      const err = error as { name?: string };
      if (err?.name !== 'AbortError' && !controller.signal.aborted) {
        setAutoSaveStatus("error");
        const errorMessage = error instanceof Error ? error.message : "Changes couldn't be saved automatically. Please try manual save.";
        toast.error(errorMessage);
      }
      setAutoSaveController(null);
    }
  }, 2000);

  // Memoized profile progress calculation
  const calculateProfileProgress = useCallback((value: Partial<ProfileFormValues>) => {
    let totalWeight = 0;
    let filledWeight = 0;
    
    // Helper to check if field is filled
    const isFieldFilled = (field: string): boolean => {
      const val = value[field as keyof typeof value];
      return val != null && (typeof val === 'string' ? val.trim().length > 0 : true);
    };
    
    // Required fields (weight: 3)
    REQUIRED_FIELDS.forEach(field => {
      totalWeight += FIELD_WEIGHTS.required;
      if (isFieldFilled(field)) {
        filledWeight += FIELD_WEIGHTS.required;
      }
    });
    
    // Important optional fields (weight: 2)
    OPTIONAL_IMPORTANT_FIELDS.forEach(field => {
      totalWeight += FIELD_WEIGHTS.important;
      if (isFieldFilled(field)) {
        filledWeight += FIELD_WEIGHTS.important;
      }
    });
    
    // Other optional fields (weight: 1)
    OPTIONAL_FIELDS.forEach(field => {
      totalWeight += FIELD_WEIGHTS.optional;
      if (isFieldFilled(field)) {
        filledWeight += FIELD_WEIGHTS.optional;
      }
    });
    
    return totalWeight > 0 ? Math.round((filledWeight / totalWeight) * 100) : 0;
  }, []);

  // Debounced progress calculation to reduce re-renders
  const debouncedProgressCalculation = useDebounce((value: Partial<ProfileFormValues>) => {
    const progress = calculateProfileProgress(value);
    setProfileProgress(progress);
  }, 300); // 300ms debounce for progress updates

  useEffect(() => {
    const subscription = form.watch((value) => {
      setHasUnsavedChanges(true);
      setAutoSaveStatus("idle");
      debouncedAutoSave(value);
      
      // Calculate profile progress with debouncing
      debouncedProgressCalculation(value);
    });
    
    return () => subscription.unsubscribe();
  }, [form, debouncedAutoSave, debouncedProgressCalculation]);

  // Memoized image upload handler with optimization
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload a valid image file.");
      return;
    }

    // Validate file size (5MB max before optimization)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image size must be less than 5MB. Please choose a smaller file.");
      return;
    }

    setIsLoading(true);
    try {
      // Optimize image before upload
      const optimized = await optimizeAvatarImage(file);
      
      // Log compression stats
      const originalSize = formatFileSize(optimized.originalSize);
      const optimizedSize = formatFileSize(optimized.optimizedSize);
      const savings = optimized.compressionRatio.toFixed(0);
      
      console.log(`Image optimized: ${originalSize} → ${optimizedSize} (${savings}% reduction)`);
      
      // Upload optimized avatar to server
      const { uploadAvatar } = await import('@/lib/api/profile');
      const avatarUrl = await uploadAvatar(optimized.file);
      
      // Update form with new avatar URL
      form.setValue('avatar' as any, avatarUrl);
      
      toast.success(
        `Profile picture updated! Saved ${savings}% bandwidth (${originalSize} → ${optimizedSize})`,
        { duration: 4000 }
      );
    } catch (error) {
      console.error('Avatar upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile picture';
      toast.error(errorMessage + ". Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [form]);

  // Memoized submit handler
  const onSubmit = useCallback(async (values: ProfileFormValues) => {
    // Prevent submission if auto-save is in progress
    if (autoSaveController) {
      autoSaveController.abort();
      setAutoSaveController(null);
    }
    
    setIsLoading(true);
    setAutoSaveStatus("saving");
    
    try {
      await updateProfile(values);
      setHasUnsavedChanges(false);
      setAutoSaveStatus("saved");
      toast.success("Your profile settings have been updated successfully.");
    } catch (error) {
      setAutoSaveStatus("error");
      toast.error("Failed to update profile settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [autoSaveController]);
  
  // Cleanup: Abort any pending auto-save on unmount
  useEffect(() => {
    return () => {
      if (autoSaveController) {
        autoSaveController.abort();
      }
    };
  }, [autoSaveController]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Profile Progress */}
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle>Profile Completion</CardTitle>
              <Badge variant={profileProgress === 100 ? "success" : "secondary"}>
                {Math.round(profileProgress)}%
              </Badge>
            </div>
            <Progress value={profileProgress} className="h-2" />
          </CardHeader>
        </Card>

        {/* Auto-save Status */}
        {hasUnsavedChanges && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {autoSaveStatus === "saving" && "Saving changes..."}
              {autoSaveStatus === "saved" && "All changes saved"}
              {autoSaveStatus === "error" && "Failed to save changes"}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 gap-4" role="tablist" aria-label="Profile settings sections">
            <TabsTrigger 
              value="basic" 
              className="flex items-center gap-2"
              role="tab"
              aria-controls="basic-panel"
              aria-label="Basic information settings"
            >
              <UserIcon className="h-4 w-4" aria-hidden="true" />
              Basic Info
            </TabsTrigger>
            <TabsTrigger 
              value="professional" 
              className="flex items-center gap-2"
              role="tab"
              aria-controls="professional-panel"
              aria-label="Professional information settings"
            >
              <Briefcase className="h-4 w-4" aria-hidden="true" />
              Professional
            </TabsTrigger>
            <TabsTrigger 
              value="social" 
              className="flex items-center gap-2"
              role="tab"
              aria-controls="social-panel"
              aria-label="Social profile links"
            >
              <Link className="h-4 w-4" aria-hidden="true" />
              Social
            </TabsTrigger>
            <TabsTrigger 
              value="privacy" 
              className="flex items-center gap-2"
              role="tab"
              aria-controls="privacy-panel"
              aria-label="Privacy settings"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              Privacy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4" role="tabpanel" id="basic-panel" aria-labelledby="basic-tab">
            <Card>
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>Upload a profile picture or avatar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={user.image || ""} alt={user.name || ""} />
                    <AvatarFallback>{user.name ? getUserInitials(user.name) : "U"}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="max-w-xs"
                      aria-label="Upload profile picture"
                    />
                    <p className="text-sm text-muted-foreground">
                      Recommended: Square image, at least 400x400px
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Your primary account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Your name" 
                            {...field} 
                            aria-label="Full name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="Your email" 
                            {...field} 
                            aria-label="Email address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell us about yourself" 
                          {...field} 
                          aria-label="Biography"
                          className="min-h-[100px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Your location" 
                          {...field} 
                          aria-label="Location"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="professional" className="space-y-4" role="tabpanel" id="professional-panel" aria-labelledby="professional-tab">
            <Card>
              <CardHeader>
                <CardTitle>Professional Information</CardTitle>
                <CardDescription>Your work and professional details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="jobTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Your job title" 
                            {...field} 
                            aria-label="Job title"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Your company" 
                            {...field} 
                            aria-label="Company name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="headline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Professional Headline</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Your professional headline" 
                          {...field} 
                          aria-label="Professional headline"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social" className="space-y-4" role="tabpanel" id="social-panel" aria-labelledby="social-tab">
            <Card>
              <CardHeader>
                <CardTitle>Social Profiles</CardTitle>
                <CardDescription>Connect your social media accounts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Personal Website</FormLabel>
                      <FormControl>
                        <Input 
                          type="url" 
                          placeholder="Your website URL" 
                          {...field} 
                          aria-label="Personal website URL"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="linkedinUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LinkedIn</FormLabel>
                        <FormControl>
                          <Input 
                            type="url" 
                            placeholder="Your LinkedIn profile" 
                            {...field} 
                            aria-label="LinkedIn profile URL"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="githubUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GitHub</FormLabel>
                        <FormControl>
                          <Input 
                            type="url" 
                            placeholder="Your GitHub profile" 
                            {...field} 
                            aria-label="GitHub profile URL"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="twitterUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Twitter</FormLabel>
                        <FormControl>
                          <Input 
                            type="url" 
                            placeholder="Your Twitter profile" 
                            {...field} 
                            aria-label="Twitter profile URL"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-4" role="tabpanel" id="privacy-panel" aria-labelledby="privacy-tab">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>Control your profile visibility and interactions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="isPublic"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Public Profile</FormLabel>
                        <FormDescription>
                          Make your profile visible to other users
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          aria-label="Toggle public profile visibility"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="allowDirectMessages"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Direct Messages</FormLabel>
                        <FormDescription>
                          Allow other users to send you direct messages
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          aria-label="Toggle direct messages"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="showOnlineStatus"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Online Status</FormLabel>
                        <FormDescription>
                          Show your online status to other users
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          aria-label="Toggle online status visibility"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-4">
          <Button
            type="submit"
            disabled={isLoading || !hasUnsavedChanges}
            aria-label="Save all changes"
          >
            {isLoading ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}