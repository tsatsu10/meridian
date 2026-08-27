import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Upload,
  Save,
  X,
  User,
  MapPin,
  Edit3,
  Loader2,
  Phone,
  Mail,
  Globe,
  ArrowLeft,
} from "lucide-react";
import { useSettingsStore } from "@/store/settings";
import { toast } from "sonner";
import { userMessage } from "@/lib/user-message";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import getProfile, { getProfileKey } from "@/fetchers/profile/get-profile";
import {
  updateProfile,
  uploadProfilePicture,
  deleteProfilePicture,
  type ProfileData,
} from "@/fetchers/profile/profile-mutations";

import { isValidPhone } from "@/lib/validation/phone";
import { withErrorBoundary } from "@/components/dashboard/universal-error-boundary";

export const Route = createFileRoute("/dashboard/settings/profile")({
  component: withErrorBoundary(ProfileSettings, "Profile Settings"),
});

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  bio?: string;
}

interface RawProfileData {
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  location?: string;
  bio?: string;
  jobTitle?: string;
  company?: string;
  timezone?: string;
  language?: string;
  profilePicture?: string;
  avatar?: string | null;
}

function ProfileSettings() {
  const { user } = useAuth();
  const { settings, updateSettings, addRecentlyViewed } = useSettingsStore();
  const queryClient = useQueryClient();

  // Normalize API data to prevent null values in form inputs
  const normalizeProfileData = (data: RawProfileData | null | undefined) => {
    return {
      name: data?.name || "",
      email: data?.email || "",
      phone: data?.phone || "",
      website: data?.website || "",
      location: data?.location || "",
      bio: data?.bio || "",
      jobTitle: data?.jobTitle || "",
      company: data?.company || "",
      timezone: data?.timezone || "UTC",
      language: data?.language || "en",
      avatar: data?.profilePicture || data?.avatar || undefined,
    };
  };

  // State
  const [localSettings, setLocalSettings] = useState(() =>
    normalizeProfileData(settings.profile),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(
    settings.profile.avatar || null,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API Data fetching
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: [getProfileKey()],
    queryFn: () => getProfile(),
    enabled: !!user,
  });

  // Only a "loading" state on the first fetch — background refetches after a
  // save must not blank the form out.
  const isProfileLoading = profileLoading && !profileData;

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [getProfileKey()] });
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(userMessage(error, "save your profile"));
      console.error("Profile update error:", error);
    },
  });

  const removePictureMutation = useMutation({
    mutationFn: deleteProfilePicture,
    onSuccess: () => {
      setProfileImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      queryClient.invalidateQueries({ queryKey: [getProfileKey()] });
      toast.success("Profile photo removed");
    },
    onError: (error) => {
      toast.error(userMessage(error, "remove your profile photo"));
      console.error("Picture removal error:", error);
    },
  });

  const uploadPictureMutation = useMutation({
    mutationFn: uploadProfilePicture,
    onSuccess: (data) => {
      setProfileImage(data.url);
      queryClient.invalidateQueries({ queryKey: [getProfileKey()] });
      toast.success("Profile picture uploaded successfully!");
    },
    onError: (error) => {
      toast.error(userMessage(error, "upload your profile picture"));
      console.error("Picture upload error:", error);
    },
  });

  // Update profile data when API data is loaded or store changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: sync profile from API/store; normalizeProfileData is a pure transform, effect keyed on profileData/user/settings
  useEffect(() => {
    let newSettings: ReturnType<typeof normalizeProfileData> | undefined;

    if (profileData && !profileLoading) {
      newSettings = normalizeProfileData(profileData);
    } else if (user && (!settings.profile.name || !settings.profile.email)) {
      const seededName = settings.profile.name || user.name || "";
      const seededEmail = settings.profile.email || user.email || "";

      newSettings = normalizeProfileData({
        ...settings.profile,
        name: seededName,
        email: seededEmail,
      });

      // Only write back when the seed actually adds something. This effect
      // depends on settings.profile and updates it, so an unconditional write
      // spins forever whenever the user record has no name/email to seed from
      // (the guard above stays true, so the next pass writes again).
      if (
        seededName !== (settings.profile.name || "") ||
        seededEmail !== (settings.profile.email || "")
      ) {
        updateSettings("profile", newSettings);
      }
    } else {
      newSettings = normalizeProfileData(settings.profile);
    }

    setLocalSettings(newSettings);
    setProfileImage(newSettings.avatar || null);
  }, [profileData, profileLoading, settings.profile, user, updateSettings]);

  useEffect(() => {
    addRecentlyViewed("profile");
  }, [addRecentlyViewed]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!localSettings.name.trim()) {
      newErrors.name = "Name is required";
    } else if (localSettings.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!localSettings.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(localSettings.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (localSettings.phone?.trim() && !isValidPhone(localSettings.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    if (localSettings.website?.trim()) {
      try {
        new URL(localSettings.website);
      } catch {
        newErrors.website = "Please enter a valid website URL";
      }
    }

    if (localSettings.bio && localSettings.bio.length > 500) {
      newErrors.bio = "Bio must be less than 500 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Please fix the validation errors");
      return;
    }

    setIsSaving(true);
    try {
      const profileData: ProfileData = {
        name: localSettings.name,
        bio: localSettings.bio,
        phone: localSettings.phone,
        website: localSettings.website,
        location: localSettings.location,
        timezone: localSettings.timezone,
        language: localSettings.language,
        jobTitle: localSettings.jobTitle,
        company: localSettings.company,
      };

      await updateProfileMutation.mutateAsync(profileData);

      // Also update the settings store for consistency
      await updateSettings("profile", {
        ...localSettings,
        avatar: profileImage || undefined,
      });
    } catch (error) {
      // Error handling is in the mutation
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setLocalSettings(normalizeProfileData(settings.profile));
    setProfileImage(settings.profile.avatar || null);
    setErrors({});
    setIsEditing(false);
  };

  const handleInputChange = (
    field: keyof typeof localSettings,
    value: string,
  ) => {
    setLocalSettings((prev) => ({ ...prev, [field]: value }));

    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handlePhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    setIsUploading(true);

    try {
      // Create a preview for immediate UI feedback
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to server. (There was a fake progress loop here that slept
      // ~1s before the real request; the value it produced was never rendered.)
      await uploadPictureMutation.mutateAsync(file);
    } catch (error) {
      // Reset preview if upload failed
      setProfileImage(settings.profile.avatar || null);
    } finally {
      setIsUploading(false);
    }
  };

  const removeProfilePhoto = () => {
    // This used to only clear local state and toast "Profile photo removed",
    // so the photo came straight back on the next reload.
    removePictureMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-6 lg:p-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 p-1">
                <div className="w-full h-full rounded-full bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-slate-400" />
                  )}
                </div>
              </div>
              <Button
                size="sm"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                onClick={handlePhotoUpload}
                disabled={isUploading}
                aria-label="Upload profile photo"
                title="Upload profile photo"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Profile Settings
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Manage your account information and preferences
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Update your personal details and contact information
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={isProfileLoading}
                onClick={() =>
                  isEditing ? handleCancel() : setIsEditing(true)
                }
              >
                <Edit3 className="w-4 h-4 mr-2" />
                {isEditing ? "Cancel" : "Edit"}
              </Button>
            </CardHeader>
            {/* profileLoading was fetched but never used, so the form rendered
                with empty values and then visibly repopulated once the request
                landed. */}
            {isProfileLoading ? (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    "name",
                    "email",
                    "phone",
                    "location",
                    "website",
                    "jobTitle",
                  ].map((field) => (
                    <div key={field} className="space-y-2">
                      <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                      <div className="h-9 w-full rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  <div className="h-24 w-full rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                </div>
              </CardContent>
            ) : (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      value={localSettings.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      disabled={!isEditing}
                      className={errors.name ? "border-red-500" : ""}
                      placeholder="Enter your full name"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </Label>
                    {/* Read-only: the email column is the FK target for ~19
                      tables with non-deferrable constraints, so it can't be
                      changed from here. This used to be an editable field that
                      silently discarded whatever you typed. */}
                    <Input
                      id="email"
                      type="email"
                      value={localSettings.email}
                      disabled
                      readOnly
                      placeholder="your.email@example.com"
                    />
                    <p className="text-sm text-slate-500">
                      Your email is used to sign in and can't be changed here.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      value={localSettings.phone}
                      onChange={(e) =>
                        handleInputChange("phone", e.target.value)
                      }
                      disabled={!isEditing}
                      className={errors.phone ? "border-red-500" : ""}
                      placeholder="+1 (555) 123-4567"
                    />
                    {errors.phone && (
                      <p className="text-sm text-red-600">{errors.phone}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="location"
                      className="flex items-center gap-2"
                    >
                      <MapPin className="w-4 h-4" />
                      Location
                    </Label>
                    <Input
                      id="location"
                      value={localSettings.location}
                      onChange={(e) =>
                        handleInputChange("location", e.target.value)
                      }
                      disabled={!isEditing}
                      placeholder="City, Country"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="website"
                      className="flex items-center gap-2"
                    >
                      <Globe className="w-4 h-4" />
                      Website
                    </Label>
                    <Input
                      id="website"
                      value={localSettings.website}
                      onChange={(e) =>
                        handleInputChange("website", e.target.value)
                      }
                      disabled={!isEditing}
                      className={errors.website ? "border-red-500" : ""}
                      placeholder="https://yourwebsite.com"
                    />
                    {errors.website && (
                      <p className="text-sm text-red-600">{errors.website}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input
                      id="jobTitle"
                      value={localSettings.jobTitle}
                      onChange={(e) =>
                        handleInputChange("jobTitle", e.target.value)
                      }
                      disabled={!isEditing}
                      placeholder="Your role"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={localSettings.company}
                      onChange={(e) =>
                        handleInputChange("company", e.target.value)
                      }
                      disabled={!isEditing}
                      placeholder="Your company"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={localSettings.bio}
                    onChange={(e) => handleInputChange("bio", e.target.value)}
                    disabled={!isEditing}
                    rows={4}
                    className={errors.bio ? "border-red-500" : ""}
                    placeholder="Tell us about yourself..."
                  />
                  <div className="flex items-center justify-between">
                    {errors.bio && (
                      <p className="text-sm text-red-600">{errors.bio}</p>
                    )}
                    <p className="text-sm text-slate-500 ml-auto">
                      {localSettings.bio?.length || 0}/500 characters
                    </p>
                  </div>
                </div>

                {isEditing && (
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={handleSave}
                      disabled={isSaving || updateProfileMutation.isPending}
                    >
                      {isSaving || updateProfileMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                    {profileImage && (
                      <Button
                        variant="destructive"
                        onClick={removeProfilePhoto}
                        className="ml-auto"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remove Photo
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
