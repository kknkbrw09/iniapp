import CryptoJS from 'crypto-js';

/**
 * Hash sensitive data using SHA-256
 * Used for NIK, No KK, and password hashing (UU PDP compliance)
 */
export async function hashSensitiveData(data: string): Promise<string> {
  return CryptoJS.SHA256(data).toString();
}

/**
 * Mask NIK/No KK for display
 * Shows only first 4 and last 4 digits
 */
export function maskNik(nik: string): string {
  if (!nik || nik.length < 16) return nik;
  return `${nik.substring(0, 4)}****${nik.substring(nik.length - 4)}`;
}

/**
 * Generate random ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
