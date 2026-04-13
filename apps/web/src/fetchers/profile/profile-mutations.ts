import { API_BASE_URL } from "../../constants/urls";

export interface ProfileData {
  jobTitle?: string;
  company?: string;
  industry?: string;
  bio?: string;
  headline?: string;
  phone?: string;
  website?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  twitterUrl?: string;
  location?: string;
  timezone?: string;
  language?: string;
  isPublic?: boolean;
  allowDirectMessages?: boolean;
  showOnlineStatus?: boolean;
  showEmail?: boolean;
  showPhone?: boolean;
}

export interface ExperienceData {
  title: string;
  company: string;
  location?: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  skills?: string[];
  achievements?: string[];
  companyLogo?: string;
  order?: number;
}

export interface EducationData {
  degree: string;
  fieldOfStudy?: string;
  school: string;
  location?: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  grade?: string;
  activities?: string[];
  schoolLogo?: string;
  order?: number;
}

export interface SkillData {
  name: string;
  category: "technical" | "soft" | "language" | "tool" | "other";
  level: number;
  yearsOfExperience?: number;
  verified?: boolean;
  order?: number;
}

export interface ConnectionData {
  followingId: string;
  note?: string;
}

// Profile mutations
export const updateProfile = async (profileData: ProfileData) => {
  const response = await fetch(`${API_BASE_URL}/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(profileData),
  });
  
  if (!response.ok) {
    throw new Error("Failed to update profile");
  }
  
  return response.json();
};

export const uploadProfilePicture = async (file: File) => {
  const formData = new FormData();
  formData.append("picture", file);
  
  const response = await fetch(`${API_BASE_URL}/profile/picture`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error("Failed to upload profile picture");
  }
  
  return response.json();
};

// Experience mutations
export const createExperience = async (experienceData: ExperienceData) => {
  const response = await fetch(`${API_BASE_URL}/profile/experience`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(experienceData),
  });
  
  if (!response.ok) {
    throw new Error("Failed to create experience");
  }
  
  return response.json();
};

export const updateExperience = async (id: string, experienceData: ExperienceData) => {
  const response = await fetch(`${API_BASE_URL}/profile/experience/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(experienceData),
  });
  
  if (!response.ok) {
    throw new Error("Failed to update experience");
  }
  
  return response.json();
};

export const deleteExperience = async (id: string) => {
  const response = await fetch(`${API_BASE_URL}/profile/experience/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error("Failed to delete experience");
  }
  
  return response.json();
};

// Education mutations
export const createEducation = async (educationData: EducationData) => {
  const response = await fetch(`${API_BASE_URL}/profile/education`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(educationData),
  });
  
  if (!response.ok) {
    throw new Error("Failed to create education");
  }
  
  return response.json();
};

export const updateEducation = async (id: string, educationData: EducationData) => {
  const response = await fetch(`${API_BASE_URL}/profile/education/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(educationData),
  });
  
  if (!response.ok) {
    throw new Error("Failed to update education");
  }
  
  return response.json();
};

export const deleteEducation = async (id: string) => {
  const response = await fetch(`${API_BASE_URL}/profile/education/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error("Failed to delete education");
  }
  
  return response.json();
};

// Skills mutations
export const createSkill = async (skillData: SkillData) => {
  const response = await fetch(`${API_BASE_URL}/profile/skills`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(skillData),
  });
  
  if (!response.ok) {
    throw new Error("Failed to create skill");
  }
  
  return response.json();
};

export const updateSkill = async (id: string, skillData: SkillData) => {
  const response = await fetch(`${API_BASE_URL}/profile/skills/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(skillData),
  });
  
  if (!response.ok) {
    throw new Error("Failed to update skill");
  }
  
  return response.json();
};

export const deleteSkill = async (id: string) => {
  const response = await fetch(`${API_BASE_URL}/profile/skills/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error("Failed to delete skill");
  }
  
  return response.json();
};

// Connections mutations
export const createConnection = async (connectionData: ConnectionData) => {
  const response = await fetch(`${API_BASE_URL}/profile/connections`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(connectionData),
  });
  
  if (!response.ok) {
    throw new Error("Failed to create connection");
  }
  
  return response.json();
};

export const updateConnection = async (id: string, connectionData: { status: "pending" | "accepted" | "blocked"; note?: string }) => {
  const response = await fetch(`${API_BASE_URL}/profile/connections/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(connectionData),
  });
  
  if (!response.ok) {
    throw new Error("Failed to update connection");
  }
  
  return response.json();
};

export const deleteConnection = async (id: string) => {
  const response = await fetch(`${API_BASE_URL}/profile/connections/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error("Failed to delete connection");
  }
  
  return response.json();
}; 