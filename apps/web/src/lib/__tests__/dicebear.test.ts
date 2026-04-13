/**
 * 🧪 DiceBear Utility Tests
 * 
 * Comprehensive tests for DiceBear avatar generation
 */

import { describe, it, expect } from 'vitest';
import {
  generateDiceBearAvatar,
  getRoleBasedAvatar,
  getWorkspaceAvatar,
  getProjectAvatar,
  getGuestAvatar,
  getUserAvatarUrl,
  getInitials,
  isValidStyle,
  getAvailableStyles,
  getRecommendedStyle,
  getCachedAvatar,
  clearAvatarCache,
  ROLE_AVATAR_COLORS,
  DEFAULT_AVATAR_STYLE,
} from '../dicebear';

describe('DiceBear Avatar Generation', () => {
  describe('generateDiceBearAvatar', () => {
    it('should generate basic avatar URL', () => {
      const url = generateDiceBearAvatar({ seed: 'test@example.com' });
      expect(url).toContain('api.dicebear.com');
      expect(url).toContain('seed=test%40example.com');
      expect(url).toContain(DEFAULT_AVATAR_STYLE);
    });

    it('should include style in URL', () => {
      const url = generateDiceBearAvatar({ 
        seed: 'test@example.com', 
        style: 'adventurer' 
      });
      expect(url).toContain('/adventurer/');
    });

    it('should include background color', () => {
      const url = generateDiceBearAvatar({ 
        seed: 'test@example.com',
        backgroundColor: '6366f1'
      });
      expect(url).toContain('backgroundColor=6366f1');
    });

    it('should handle multiple background colors', () => {
      const url = generateDiceBearAvatar({ 
        seed: 'test@example.com',
        backgroundColor: ['6366f1', 'ef4444']
      });
      expect(url).toContain('backgroundColor=6366f1%2Cef4444');
    });

    it('should include size parameter', () => {
      const url = generateDiceBearAvatar({ 
        seed: 'test@example.com',
        size: 100
      });
      expect(url).toContain('size=100');
    });

    it('should include flip parameter', () => {
      const url = generateDiceBearAvatar({ 
        seed: 'test@example.com',
        flip: true
      });
      expect(url).toContain('flip=true');
    });

    it('should include rotation', () => {
      const url = generateDiceBearAvatar({ 
        seed: 'test@example.com',
        rotate: 90
      });
      expect(url).toContain('rotate=90');
    });

    it('should include scale', () => {
      const url = generateDiceBearAvatar({ 
        seed: 'test@example.com',
        scale: 120
      });
      expect(url).toContain('scale=120');
    });

    it('should support different formats', () => {
      const svgUrl = generateDiceBearAvatar({ 
        seed: 'test@example.com',
        format: 'svg'
      });
      const pngUrl = generateDiceBearAvatar({ 
        seed: 'test@example.com',
        format: 'png'
      });
      
      expect(svgUrl).toContain('/svg?');
      expect(pngUrl).toContain('/png?');
    });

    it('should handle custom options', () => {
      const url = generateDiceBearAvatar({ 
        seed: 'test@example.com',
        customOptions: { radius: 10, foo: 'bar' }
      });
      expect(url).toContain('radius=10');
      expect(url).toContain('foo=bar');
    });
  });

  describe('getRoleBasedAvatar', () => {
    it('should generate avatar with role-based color', () => {
      const url = getRoleBasedAvatar({
        email: 'admin@example.com',
        role: 'admin',
      });
      expect(url).toContain(ROLE_AVATAR_COLORS['admin']);
    });

    it('should use default color for unknown role', () => {
      const url = getRoleBasedAvatar({
        email: 'user@example.com',
        role: 'unknown-role',
      });
      expect(url).toContain(ROLE_AVATAR_COLORS['member']);
    });

    it('should use member color if no role specified', () => {
      const url = getRoleBasedAvatar({
        email: 'user@example.com',
      });
      expect(url).toContain(ROLE_AVATAR_COLORS['member']);
    });

    it('should respect custom style', () => {
      const url = getRoleBasedAvatar({
        email: 'user@example.com',
        style: 'adventurer',
      });
      expect(url).toContain('/adventurer/');
    });
  });

  describe('getWorkspaceAvatar', () => {
    it('should generate workspace avatar with shapes style', () => {
      const url = getWorkspaceAvatar({
        id: 'workspace-123',
        name: 'My Workspace',
      });
      expect(url).toContain('/shapes/');
      expect(url).toContain('seed=My%20Workspace');
    });

    it('should use custom color', () => {
      const url = getWorkspaceAvatar({
        id: 'workspace-123',
        color: '#3b82f6',
      });
      expect(url).toContain('backgroundColor=3b82f6');
    });
  });

  describe('getProjectAvatar', () => {
    it('should generate project avatar with identicon style', () => {
      const url = getProjectAvatar({
        id: 'project-456',
        name: 'My Project',
      });
      expect(url).toContain('/identicon/');
      expect(url).toContain('seed=My%20Project');
    });

    it('should use custom color', () => {
      const url = getProjectAvatar({
        id: 'project-456',
        color: '#10b981',
      });
      expect(url).toContain('backgroundColor=10b981');
    });
  });

  describe('getGuestAvatar', () => {
    it('should generate guest avatar with gray color', () => {
      const url = getGuestAvatar({
        email: 'guest@example.com',
      });
      expect(url).toContain('backgroundColor=64748b');
    });

    it('should use email as seed', () => {
      const url = getGuestAvatar({
        email: 'guest@example.com',
        name: 'Guest User',
      });
      expect(url).toContain('seed=guest%40example.com');
    });
  });

  describe('getUserAvatarUrl', () => {
    it('should use custom avatar if provided', () => {
      const customUrl = 'https://example.com/custom-avatar.jpg';
      const url = getUserAvatarUrl({
        email: 'user@example.com',
        name: 'User',
        avatar: customUrl,
      });
      expect(url).toBe(customUrl);
    });

    it('should not use dicebear URL as custom avatar', () => {
      const url = getUserAvatarUrl({
        email: 'user@example.com',
        name: 'User',
        avatar: 'https://api.dicebear.com/old-avatar.svg',
      });
      expect(url).not.toBe('https://api.dicebear.com/old-avatar.svg');
      expect(url).toContain('api.dicebear.com/9.x');
    });

    it('should not use avatar.vercel as custom avatar', () => {
      const url = getUserAvatarUrl({
        email: 'user@example.com',
        name: 'User',
        avatar: 'https://avatar.vercel.sh/user@example.com',
      });
      expect(url).not.toContain('avatar.vercel.sh');
      expect(url).toContain('api.dicebear.com');
    });

    it('should use user style preference', () => {
      const url = getUserAvatarUrl({
        email: 'user@example.com',
        name: 'User',
        avatarStyle: 'adventurer',
      });
      expect(url).toContain('/adventurer/');
    });

    it('should use user custom background color', () => {
      const url = getUserAvatarUrl({
        email: 'user@example.com',
        name: 'User',
        avatarBackgroundColor: 'ff0000',
      });
      expect(url).toContain('backgroundColor=ff0000');
    });

    it('should use role-based color by default', () => {
      const url = getUserAvatarUrl({
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
      });
      expect(url).toContain(ROLE_AVATAR_COLORS['admin']);
    });
  });

  describe('getInitials', () => {
    it('should get initials from full name', () => {
      expect(getInitials('John Doe')).toBe('JD');
    });

    it('should get initials from single name', () => {
      expect(getInitials('Madonna')).toBe('M');
    });

    it('should handle three-part names', () => {
      expect(getInitials('John Paul Jones')).toBe('JP');
    });

    it('should uppercase initials', () => {
      expect(getInitials('john doe')).toBe('JD');
    });

    it('should limit to 2 characters', () => {
      expect(getInitials('John Paul George Ringo')).toBe('JP');
    });
  });

  describe('isValidStyle', () => {
    it('should validate correct styles', () => {
      expect(isValidStyle('personas')).toBe(true);
      expect(isValidStyle('adventurer')).toBe(true);
      expect(isValidStyle('bottts')).toBe(true);
    });

    it('should reject invalid styles', () => {
      expect(isValidStyle('invalid-style')).toBe(false);
      expect(isValidStyle('')).toBe(false);
      expect(isValidStyle('random')).toBe(false);
    });
  });

  describe('getAvailableStyles', () => {
    it('should return array of style options', () => {
      const styles = getAvailableStyles();
      expect(Array.isArray(styles)).toBe(true);
      expect(styles.length).toBeGreaterThan(0);
    });

    it('should include required properties', () => {
      const styles = getAvailableStyles();
      const firstStyle = styles[0];
      expect(firstStyle).toHaveProperty('value');
      expect(firstStyle).toHaveProperty('label');
      expect(firstStyle).toHaveProperty('description');
      expect(firstStyle).toHaveProperty('category');
      expect(firstStyle).toHaveProperty('preview');
    });

    it('should include personas style', () => {
      const styles = getAvailableStyles();
      const personasStyle = styles.find(s => s.value === 'personas');
      expect(personasStyle).toBeDefined();
      expect(personasStyle?.category).toBe('professional');
    });
  });

  describe('getRecommendedStyle', () => {
    it('should recommend personas for users', () => {
      expect(getRecommendedStyle('user')).toBe('personas');
    });

    it('should recommend shapes for workspaces', () => {
      expect(getRecommendedStyle('workspace')).toBe('shapes');
    });

    it('should recommend identicon for projects', () => {
      expect(getRecommendedStyle('project')).toBe('identicon');
    });

    it('should recommend bottts for bots', () => {
      expect(getRecommendedStyle('bot')).toBe('bottts');
    });
  });

  describe('getCachedAvatar', () => {
    it('should cache generated URLs', () => {
      clearAvatarCache(); // Clear before test
      
      let callCount = 0;
      const generator = () => {
        callCount++;
        return 'https://example.com/avatar.svg';
      };
      
      const url1 = getCachedAvatar('test-key', generator);
      const url2 = getCachedAvatar('test-key', generator);
      
      expect(url1).toBe(url2);
      expect(callCount).toBe(1); // Generator called only once
    });

    it('should handle different cache keys separately', () => {
      clearAvatarCache();
      
      const url1 = getCachedAvatar('key1', () => 'url1');
      const url2 = getCachedAvatar('key2', () => 'url2');
      
      expect(url1).toBe('url1');
      expect(url2).toBe('url2');
    });
  });

  describe('ROLE_AVATAR_COLORS', () => {
    it('should have colors for all primary roles', () => {
      expect(ROLE_AVATAR_COLORS).toHaveProperty('workspace-manager');
      expect(ROLE_AVATAR_COLORS).toHaveProperty('admin');
      expect(ROLE_AVATAR_COLORS).toHaveProperty('team-lead');
      expect(ROLE_AVATAR_COLORS).toHaveProperty('project-manager');
      expect(ROLE_AVATAR_COLORS).toHaveProperty('member');
      expect(ROLE_AVATAR_COLORS).toHaveProperty('guest');
    });

    it('should have valid hex colors', () => {
      Object.values(ROLE_AVATAR_COLORS).forEach(color => {
        expect(color).toMatch(/^[0-9a-f]{6}$/i);
      });
    });
  });

  describe('Deterministic Generation', () => {
    it('should generate same URL for same seed', () => {
      const url1 = generateDiceBearAvatar({ seed: 'test@example.com' });
      const url2 = generateDiceBearAvatar({ seed: 'test@example.com' });
      expect(url1).toBe(url2);
    });

    it('should generate different URLs for different seeds', () => {
      const url1 = generateDiceBearAvatar({ seed: 'user1@example.com' });
      const url2 = generateDiceBearAvatar({ seed: 'user2@example.com' });
      expect(url1).not.toBe(url2);
    });

    it('should be case-sensitive for seeds', () => {
      const url1 = generateDiceBearAvatar({ seed: 'TEST@EXAMPLE.COM' });
      const url2 = generateDiceBearAvatar({ seed: 'test@example.com' });
      expect(url1).not.toBe(url2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty seed gracefully', () => {
      const url = generateDiceBearAvatar({ seed: '' });
      expect(url).toContain('seed=');
    });

    it('should handle special characters in seed', () => {
      const url = generateDiceBearAvatar({ seed: 'user+tag@example.com' });
      expect(url).toContain('api.dicebear.com');
    });

    it('should handle Unicode in seed', () => {
      const url = generateDiceBearAvatar({ seed: 'user@例え.com' });
      expect(url).toContain('api.dicebear.com');
    });

    it('should handle very long seeds', () => {
      const longSeed = 'a'.repeat(1000) + '@example.com';
      const url = generateDiceBearAvatar({ seed: longSeed });
      expect(url).toContain('api.dicebear.com');
    });
  });

  describe('URL Format Validation', () => {
    it('should generate valid HTTPS URLs', () => {
      const url = generateDiceBearAvatar({ seed: 'test@example.com' });
      expect(url).toMatch(/^https:\/\//);
    });

    it('should properly encode URL parameters', () => {
      const url = generateDiceBearAvatar({ 
        seed: 'user+test@example.com',
        backgroundColor: 'ff00ff'
      });
      expect(url).toContain('%');  // URL encoded
    });
  });
});

describe('Role-Based Features', () => {
  it('should generate different colors for different roles', () => {
    const adminUrl = getRoleBasedAvatar({ 
      email: 'user@example.com', 
      role: 'admin' 
    });
    const memberUrl = getRoleBasedAvatar({ 
      email: 'user@example.com', 
      role: 'member' 
    });
    
    expect(adminUrl).toContain(ROLE_AVATAR_COLORS['admin']);
    expect(memberUrl).toContain(ROLE_AVATAR_COLORS['member']);
    expect(adminUrl).not.toBe(memberUrl);
  });

  it('should maintain same avatar for same role and email', () => {
    const url1 = getRoleBasedAvatar({ 
      email: 'admin@example.com', 
      role: 'admin' 
    });
    const url2 = getRoleBasedAvatar({ 
      email: 'admin@example.com', 
      role: 'admin' 
    });
    expect(url1).toBe(url2);
  });
});

describe('Entity-Specific Avatars', () => {
  describe('Workspace Avatars', () => {
    it('should use shapes style for workspaces', () => {
      const url = getWorkspaceAvatar({ id: 'ws-1', name: 'My Workspace' });
      expect(url).toContain('/shapes/');
    });

    it('should be deterministic for same workspace', () => {
      const url1 = getWorkspaceAvatar({ id: 'ws-1', name: 'Workspace' });
      const url2 = getWorkspaceAvatar({ id: 'ws-1', name: 'Workspace' });
      expect(url1).toBe(url2);
    });
  });

  describe('Project Avatars', () => {
    it('should use identicon style for projects', () => {
      const url = getProjectAvatar({ id: 'proj-1', name: 'My Project' });
      expect(url).toContain('/identicon/');
    });

    it('should be deterministic for same project', () => {
      const url1 = getProjectAvatar({ id: 'proj-1', name: 'Project' });
      const url2 = getProjectAvatar({ id: 'proj-1', name: 'Project' });
      expect(url1).toBe(url2);
    });
  });

  describe('Guest Avatars', () => {
    it('should use initials style for guests', () => {
      const url = getGuestAvatar({ email: 'guest@example.com' });
      expect(url).toContain('/initials/');
    });

    it('should use gray color for guests', () => {
      const url = getGuestAvatar({ email: 'guest@example.com' });
      expect(url).toContain('backgroundColor=64748b');
    });
  });
});

describe('Helper Functions', () => {
  describe('getInitials', () => {
    it('should extract first letters', () => {
      expect(getInitials('John Doe')).toBe('JD');
      expect(getInitials('Alice Bob Charlie')).toBe('AB');
    });

    it('should uppercase results', () => {
      expect(getInitials('john doe')).toBe('JD');
    });

    it('should handle single names', () => {
      expect(getInitials('Madonna')).toBe('M');
    });
  });

  describe('Style Validation', () => {
    it('should validate known styles', () => {
      expect(isValidStyle('personas')).toBe(true);
      expect(isValidStyle('bottts')).toBe(true);
    });

    it('should reject unknown styles', () => {
      expect(isValidStyle('unknown')).toBe(false);
    });
  });
});

describe('Performance & Caching', () => {
  it('should cache URLs efficiently', () => {
    clearAvatarCache();
    
    const start = performance.now();
    const url1 = getCachedAvatar('perf-test', () => 
      generateDiceBearAvatar({ seed: 'test@example.com' })
    );
    const firstCallTime = performance.now() - start;
    
    const start2 = performance.now();
    const url2 = getCachedAvatar('perf-test', () => 
      generateDiceBearAvatar({ seed: 'test@example.com' })
    );
    const secondCallTime = performance.now() - start2;
    
    expect(url1).toBe(url2);
    expect(secondCallTime).toBeLessThan(firstCallTime);
  });

  it('should clear cache successfully', () => {
    getCachedAvatar('test', () => 'url');
    clearAvatarCache();
    
    let called = false;
    getCachedAvatar('test', () => {
      called = true;
      return 'url';
    });
    
    expect(called).toBe(true);
  });
});

