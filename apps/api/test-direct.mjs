
      import getWorkspaces from './src/workspace/controllers/get-workspaces.js';
      
      (async () => {
        try {
          const workspaces = await getWorkspaces('admin@meridian.app');
          console.log('✅ Direct controller test SUCCESS!');
          console.log('Workspaces found:', JSON.stringify(workspaces, null, 2));
        } catch (error) {
          console.error('❌ Direct controller test FAILED:', error.message);
        }
      })();
    