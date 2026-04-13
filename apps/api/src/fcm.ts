import { lazyLoaders } from './utils/lazy-loader';
import { logger } from './utils/logger';
import fs from 'fs';

let initialized = false;
let adminInstance: any = null;

async function initFirebase() {
  if (initialized) return adminInstance;
  
  const admin = await lazyLoaders.firebaseAdmin();
  adminInstance = admin.default;
  
  const serviceAccountPath = process.env.FCM_SERVICE_ACCOUNT;
  if (!serviceAccountPath || !fs.existsSync(serviceAccountPath)) {
    logger.warn('FCM service account JSON not found:', serviceAccountPath);
    return adminInstance;
  }
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  adminInstance.initializeApp({
    credential: adminInstance.credential.cert(serviceAccount),
  });
  initialized = true;
  return adminInstance;
}

export async function sendFcmNotification(tokens: string[], payload: any): Promise<void | unknown> {
  const admin = await initFirebase();
  if (!initialized || !admin) return;
  if (!tokens.length) return;
  try {
    const multicastMessage = {
      tokens,
      ...payload,
    };
    const response = await admin.messaging().sendEachForMulticast(multicastMessage);
    logger.info('FCM sent:', response.successCount, 'success,', response.failureCount, 'failure');
    return response;
  } catch (err) {
    logger.error('FCM send error:', err);
  }
} 

