/**
 * Hook for managing saved filter presets
 * Persists filter presets to localStorage
 */

import { useState, useEffect, useCallback } from 'react';
import { FilterPreset, SYSTEM_FILTER_PRESETS, DashboardFilters } from '@/types/filters';
import { createId } from '@paralleldrive/cuid2';

const STORAGE_KEY = 'meridian-filter-presets';

export function useSavedFilters() {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load presets from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const userPresets = JSON.parse(stored) as FilterPreset[];
        
        // Combine system presets with user presets
        const systemPresets: FilterPreset[] = SYSTEM_FILTER_PRESETS.map((preset, index) => ({
          ...preset,
          id: `system-${index}`,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        
        setPresets([...systemPresets, ...userPresets]);
        
        // Set default active preset
        const defaultPreset = systemPresets.find(p => p.isDefault);
        if (defaultPreset) {
          setActivePresetId(defaultPreset.id);
        }
      } else {
        // Initialize with system presets only
        const systemPresets: FilterPreset[] = SYSTEM_FILTER_PRESETS.map((preset, index) => ({
          ...preset,
          id: `system-${index}`,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        
        setPresets(systemPresets);
        
        const defaultPreset = systemPresets.find(p => p.isDefault);
        if (defaultPreset) {
          setActivePresetId(defaultPreset.id);
        }
      }
    } catch (error) {
      console.error('Failed to load filter presets:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save user presets to localStorage (excluding system presets)
  const saveToStorage = useCallback((allPresets: FilterPreset[]) => {
    try {
      const userPresets = allPresets.filter(p => !p.isSystem);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userPresets));
    } catch (error) {
      console.error('Failed to save filter presets:', error);
    }
  }, []);

  // Create a new preset
  const createPreset = useCallback((name: string, filters: DashboardFilters, description?: string) => {
    const newPreset: FilterPreset = {
      id: createId(),
      name,
      description,
      filters,
      isDefault: false,
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const updated = [...presets, newPreset];
    setPresets(updated);
    saveToStorage(updated);
    
    return newPreset;
  }, [presets, saveToStorage]);

  // Update an existing preset
  const updatePreset = useCallback((id: string, updates: Partial<FilterPreset>) => {
    const updated = presets.map(p => 
      p.id === id && !p.isSystem
        ? { ...p, ...updates, updatedAt: new Date() }
        : p
    );
    
    setPresets(updated);
    saveToStorage(updated);
  }, [presets, saveToStorage]);

  // Delete a preset (only user presets)
  const deletePreset = useCallback((id: string) => {
    const preset = presets.find(p => p.id === id);
    if (preset?.isSystem) {
      console.warn('Cannot delete system preset');
      return;
    }
    
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    saveToStorage(updated);
    
    // Clear active preset if it was deleted
    if (activePresetId === id) {
      const defaultPreset = updated.find(p => p.isDefault);
      setActivePresetId(defaultPreset?.id || null);
    }
  }, [presets, activePresetId, saveToStorage]);

  // Set active preset
  const setActivePreset = useCallback((id: string | null) => {
    setActivePresetId(id);
  }, []);

  // Get active preset
  const getActivePreset = useCallback(() => {
    return presets.find(p => p.id === activePresetId) || null;
  }, [presets, activePresetId]);

  // Get active filters
  const getActiveFilters = useCallback((): DashboardFilters => {
    const activePreset = getActivePreset();
    return activePreset?.filters || {
      timeRange: 'all',
      projectIds: [],
      userIds: [],
      priorities: [],
      status: [],
      tags: []
    };
  }, [getActivePreset]);

  return {
    presets,
    activePresetId,
    activePreset: getActivePreset(),
    activeFilters: getActiveFilters(),
    isLoading,
    createPreset,
    updatePreset,
    deletePreset,
    setActivePreset
  };
}

