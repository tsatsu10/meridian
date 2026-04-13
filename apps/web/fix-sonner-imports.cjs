const fs = require('fs');
const path = require('path');

// Files that import from 'sonner'
const files = [
  'C:\\Users\\elike\\OneDrive\\Desktop\\project management\\meridian\\apps\\web\\src\\store\\consolidated\\tasks.ts',
  'C:\\Users\\elike\\OneDrive\\Desktop\\project management\\meridian\\apps\\web\\src\\store\\consolidated\\ui.ts',
  'C:\\Users\\elike\\OneDrive\\Desktop\\project management\\meridian\\apps\\web\\src\\components\\common\\sidebar\\sections\\user-info.tsx',
  'C:\\Users\\elike\\OneDrive\\Desktop\\project management\\meridian\\apps\\web\\src\\components\\dashboard\\page-header-actions.tsx',
  'C:\\Users\\elike\\OneDrive\\Desktop\\project management\\meridian\\apps\\web\\src\\routes\\dashboard\\workspace\\$workspaceId\\project\\$projectId\\_layout.list.tsx'
];

// Take just the first few critical files to start with
const criticalFiles = files.slice(0, 5);

criticalFiles.forEach(filePath => {
  try {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Replace direct sonner imports with our UI component
      const updatedContent = content
        .replace(/from ['"]sonner['"]/g, `from '@/components/ui/sonner'`)
        .replace(/import { toast } from ['"]sonner['"]/g, `import { toast } from '@/components/ui/minimal-toast'`)
        .replace(/import { Toaster } from ['"]sonner['"]/g, `import { Toaster } from '@/components/ui/sonner'`);
      
      if (content !== updatedContent) {
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        console.log(`Updated imports in: ${path.basename(filePath)}`);
      }
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
});

console.log('Sonner import fixes applied to critical files');