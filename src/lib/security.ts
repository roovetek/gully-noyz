export async function hashSecret(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifySecret(secret: string, hash: string): Promise<boolean> {
  const secretHash = await hashSecret(secret);
  return secretHash === hash;
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function isValidMatchId(matchId: string): boolean {
  return /^[A-Z0-9]{6}$/.test(matchId);
}

export function generateSecureMatchId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);

  for (let i = 0; i < 6; i++) {
    result += chars[array[i] % chars.length];
  }

  return result;
}

export class SecureStorage {
  private static readonly PREFIX = 'gs_';

  static setItem(key: string, value: string): void {
    try {
      sessionStorage.setItem(this.PREFIX + key, value);
    } catch (error) {
      console.error('Storage error:', error);
    }
  }

  static getItem(key: string): string | null {
    try {
      return sessionStorage.getItem(this.PREFIX + key);
    } catch (error) {
      console.error('Storage error:', error);
      return null;
    }
  }

  static removeItem(key: string): void {
    try {
      sessionStorage.removeItem(this.PREFIX + key);
    } catch (error) {
      console.error('Storage error:', error);
    }
  }

  static clear(): void {
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith(this.PREFIX)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Storage error:', error);
    }
  }
}
