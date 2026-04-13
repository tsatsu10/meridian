import * as z from "zod";

/**
 * URL validation that allows empty strings
 * More lenient than strict URL validation
 */
const urlSchema = z.string().max(200).optional().or(z.literal("")).refine(
  (val) => {
    if (!val || val === "") return true;
    try {
      new URL(val);
      return true;
    } catch {
      return val.startsWith('http://') || val.startsWith('https://');
    }
  },
  { message: "Please enter a valid URL (must start with http:// or https://)" }
);

/**
 * Phone number validation
 * Allows various international formats
 */
const phoneSchema = z.string()
  .max(20)
  .optional()
  .refine(
    (val) => {
      if (!val) return true;
      // Allow: +1234567890, (123) 456-7890, 123-456-7890, etc.
      return /^[\d\s\-\+\(\)]+$/.test(val);
    },
    { message: "Please enter a valid phone number" }
  );

/**
 * Timezone validation
 * Validates against common timezone formats
 */
const timezoneSchema = z.string()
  .max(100)
  .optional()
  .refine(
    (val) => {
      if (!val) return true;
      // Basic validation for timezone format (e.g., America/New_York, UTC, GMT+5)
      return /^[A-Za-z_\/\+\-0-9]+$/.test(val);
    },
    { message: "Please enter a valid timezone" }
  );

/**
 * Unified profile settings validation schema
 * Aligned with UserProfile type
 */
export const profileSettingsSchema = z.object({
  // Identity (Required)
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  
  // Avatar
  avatar: z.string().max(500).optional().or(z.literal("")),
  
  // Professional Information
  jobTitle: z.string().max(100).optional().or(z.literal("")),
  company: z.string().max(100).optional().or(z.literal("")),
  department: z.string().max(100).optional().or(z.literal("")),
  headline: z.string().max(200).optional().or(z.literal("")),
  
  // Personal Information
  bio: z.string().max(500).optional().or(z.literal("")),
  location: z.string().max(100).optional().or(z.literal("")),
  phone: phoneSchema,
  
  // Social Links
  website: urlSchema,
  linkedinUrl: urlSchema,
  githubUrl: urlSchema,
  twitterUrl: urlSchema,
  
  // Localization
  timezone: timezoneSchema,
  language: z.string().max(10).optional().or(z.literal("")), // ISO language codes (e.g., 'en', 'es')
  
  // Skills
  skills: z.array(z.string().max(50)).max(20).optional(),
  
  // Privacy & Preferences
  isPublic: z.boolean().default(true),
  allowDirectMessages: z.boolean().default(true),
  showOnlineStatus: z.boolean().default(true),
  
  // Custom Status
  customStatus: z.string().max(100).optional().or(z.literal("")),
});

/**
 * Profile update schema (all fields optional)
 * For PATCH/PUT requests
 */
export const profileUpdateSchema = profileSettingsSchema.partial();

/**
 * Basic profile schema (minimal required fields)
 * For registration/initial setup
 */
export const basicProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
});

/**
 * Avatar upload schema
 */
export const avatarUploadSchema = z.object({
  file: z.instanceof(File).refine(
    (file) => file.size <= 5 * 1024 * 1024,
    "File size must be less than 5MB"
  ).refine(
    (file) => file.type.startsWith('image/'),
    "File must be an image"
  ),
});

export type ProfileSettingsFormData = z.infer<typeof profileSettingsSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
export type BasicProfileFormData = z.infer<typeof basicProfileSchema>;
