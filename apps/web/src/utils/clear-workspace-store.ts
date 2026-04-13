// @epic-1.1-workspace: Clear workspace store utility
// @persona-sarah: PM needs clean workspace state for testing
// @persona-david: Team lead needs reliable workspace initialization

import useWorkspaceStore from '@/store/workspace';

/**
 * Clear the workspace store from localStorage
 * This ensures we start fresh with the demo workspace
 */
export function clearWorkspaceStore() {
  try {
    // Clear the workspace from localStorage
    localStorage.removeItem('meridian-workspace');// Also clear the workspace from the store
    const { setWorkspace } = useWorkspaceStore.getState();
    setWorkspace(undefined);} catch (error) {
    console.error('❌ Failed to clear workspace store:', error);
  }
}

/**
 * Force set the demo workspace
 */
export function setDemoWorkspace() {
  try {
    const { setWorkspace } = useWorkspaceStore.getState();
    setWorkspace({
      id: 'demo-workspace-123',
      name: 'Meridian Development',
      description: 'Main development workspace for Meridian project management',
      ownerEmail: 'elidegbotse@gmail.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });} catch (error) {
    console.error('❌ Failed to set demo workspace:', error);
  }
} 