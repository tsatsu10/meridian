import { createCipheriv, createDecipheriv, randomBytes, scrypt, createHash } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

class EncryptionService {
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.ENCRYPTION_SECRET_KEY || 
                    'meridian-default-encryption-key-2024-secure';
  }

  async encrypt(data: string): Promise<string> {
    try {
      const salt = randomBytes(64);
      const iv = randomBytes(16);
      const key = await scryptAsync(this.secretKey, salt, 32);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();
      
      const result = Buffer.concat([salt, iv, authTag, Buffer.from(encrypted, 'hex')]);
      return result.toString('base64');
    } catch (error) {
      throw new Error('Failed to encrypt data');
    }
  }

  async decrypt(encryptedData: string): Promise<string> {
    try {
      const data = Buffer.from(encryptedData, 'base64');
      const salt = data.subarray(0, 64);
      const iv = data.subarray(64, 80);
      const authTag = data.subarray(80, 96);
      const encrypted = data.subarray(96);
      
      const key = await scryptAsync(this.secretKey, salt, 32);
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      throw new Error('Failed to decrypt data');
    }
  }

  hash(data: string, salt?: string): { hash: string; salt: string } {
    const generatedSalt = salt || randomBytes(32).toString('hex');
    const hash = createHash('sha256')
      .update(data + generatedSalt)
      .digest('hex');
    return { hash, salt: generatedSalt };
  }

  verifyHash(data: string, hash: string, salt: string): boolean {
    const { hash: computedHash } = this.hash(data, salt);
    return computedHash === hash;
  }

  generateSecureToken(): string {
    return randomBytes(64).toString('base64url');
  }
}

const encryptionService = new EncryptionService();
export default encryptionService; 

