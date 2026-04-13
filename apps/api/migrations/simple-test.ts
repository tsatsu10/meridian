// Direct test to see if schema import works
import { userExperienceTable } from '../src/database/schema';

console.log('✅ Schema imported successfully');
console.log('📋 userExperienceTable columns:', Object.keys(userExperienceTable));
console.log('📋 userId column:', userExperienceTable.userId);
console.log('📋 skills column:', userExperienceTable.skills);

