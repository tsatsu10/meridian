// Production name generation utilities
// Used for generating meaningful workspace and project names

const professionalAdjectives = [
  "innovative",
  "dynamic",
  "strategic",
  "agile",
  "collaborative",
  "efficient",
  "scalable",
  "robust",
  "modern",
  "advanced",
  "intelligent",
  "streamlined",
  "optimized",
  "comprehensive",
  "integrated",
  "flexible",
  "responsive",
  "secure",
  "reliable",
  "focused",
  "creative",
  "productive",
];

const businessTerms = [
  "workspace",
  "platform",
  "system",
  "solution",
  "framework",
  "environment",
  "ecosystem",
  "project",
  "initiative",
  "venture",
  "operation",
  "program",
  "development",
  "implementation",
  "deployment",
  "workflow",
  "process",
  "management",
  "collaboration",
  "innovation",
  "transformation",
  "optimization",
];

/**
 * Generate a professional workspace name
 * @param prefix Optional prefix to add
 * @param type Type of name to generate ('workspace' | 'project' | 'team')
 */
export function generateWorkspaceName(prefix?: string, type: 'workspace' | 'project' | 'team' = 'workspace'): string {
  const adjective = professionalAdjectives[Math.floor(Math.random() * professionalAdjectives.length)];
  const term = businessTerms[Math.floor(Math.random() * businessTerms.length)];
  
  const baseName = `${adjective}-${term}`;
  
  if (prefix) {
    return `${prefix}-${baseName}`;
  }
  
  return baseName;
}

/**
 * Generate a meaningful project name based on context
 * @param category Project category/domain
 * @param suffix Optional suffix
 */
export function generateProjectName(category?: string, suffix?: string): string {
  const categories = {
    development: ['app', 'platform', 'system', 'tool', 'service'],
    design: ['interface', 'experience', 'brand', 'visual', 'creative'],
    marketing: ['campaign', 'strategy', 'outreach', 'content', 'growth'],
    research: ['analysis', 'study', 'investigation', 'exploration', 'insight'],
    operations: ['process', 'workflow', 'optimization', 'automation', 'efficiency'],
  };
  
  const adjective = professionalAdjectives[Math.floor(Math.random() * professionalAdjectives.length)];
  
  let term: string;
  if (category && categories[category as keyof typeof categories]) {
    const categoryTerms = categories[category as keyof typeof categories];
    term = categoryTerms[Math.floor(Math.random() * categoryTerms.length)] || 'project';
  } else {
    term = businessTerms[Math.floor(Math.random() * businessTerms.length)] || 'project';
  }
  
  const baseName = `${adjective}-${term}`;
  
  if (suffix) {
    return `${baseName}-${suffix}`;
  }
  
  return baseName;
}

/**
 * Generate a team name based on function/role
 * @param function Team function ('frontend', 'backend', 'design', 'qa', etc.)
 */
export function generateTeamName(teamFunction?: string): string {
  const functions = {
    frontend: ['ui', 'ux', 'interface', 'client'],
    backend: ['api', 'server', 'database', 'infrastructure'],
    design: ['creative', 'visual', 'brand', 'graphics'],
    qa: ['testing', 'quality', 'validation', 'verification'],
    devops: ['deployment', 'operations', 'infrastructure', 'automation'],
    product: ['strategy', 'planning', 'management', 'development'],
  };
  
  const adjective = professionalAdjectives[Math.floor(Math.random() * professionalAdjectives.length)];
  
  let term: string;
  if (teamFunction && functions[teamFunction as keyof typeof functions]) {
    const functionTerms = functions[teamFunction as keyof typeof functions];
    term = functionTerms[Math.floor(Math.random() * functionTerms.length)] || 'team';
  } else {
    term = 'team';
  }
  
  return `${adjective}-${term}`;
}

/**
 * Generate a unique identifier with optional prefix
 * @param prefix Optional prefix
 * @param length Length of random part (default: 8)
 */
export function generateUniqueId(prefix?: string, length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  if (prefix) {
    return `${prefix}_${result}`;
  }
  
  return result;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use generateWorkspaceName, generateProjectName, or generateTeamName instead
 */
export function generateDemoName(): string {
  return generateWorkspaceName();
}

