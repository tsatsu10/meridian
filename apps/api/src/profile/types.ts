export interface ProfileUpdateData {
  name?: string;
  email?: string;
  jobTitle?: string;
  company?: string;
  bio?: string;
  headline?: string;
  website?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  twitterUrl?: string;
  location?: string;
  isPublic?: boolean;
  allowDirectMessages?: boolean;
  showOnlineStatus?: boolean;
}

export interface ProfileResponse {
  id: string;
  userId: string;
  name: string;
  email: string;
  jobTitle?: string;
  company?: string;
  bio?: string;
  headline?: string;
  website?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  twitterUrl?: string;
  location?: string;
  isPublic: boolean;
  allowDirectMessages: boolean;
  showOnlineStatus: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

