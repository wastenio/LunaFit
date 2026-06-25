import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCallback);
const PASSWORD_KEY_LENGTH = 64;
const DUMMY_PASSWORD_HASH =
  'scrypt$a41c96e59f8a56c02d85d824565f7909$3b9bffb344598faca98e31b4f03d200574296063624d26a1b1bef9ca50a4549985da7962c3bef4e1f18d1608e6c078ce8012920c7085aa00f3c22dc0cf774053';

export type PasswordValidationResult =
  | { success: true }
  | { success: false; error: string };

export function validatePassword(password: string): PasswordValidationResult {
  if (password.length < 8) {
    return { success: false, error: 'A senha precisa ter pelo menos 8 caracteres.' };
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return {
      success: false,
      error: 'Use pelo menos uma letra maiuscula, uma minuscula e um numero.',
    };
  }

  if (password.length > 128) {
    return { success: false, error: 'A senha informada e muito longa.' };
  }

  return { success: true };
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;

  return `scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash?: string | null) {
  const hash = storedHash || DUMMY_PASSWORD_HASH;
  const [algorithm, saltHex, keyHex] = hash.split('$');

  if (algorithm !== 'scrypt' || !saltHex || !keyHex) {
    await scrypt(password, Buffer.alloc(16), PASSWORD_KEY_LENGTH);
    return false;
  }

  try {
    const expectedKey = Buffer.from(keyHex, 'hex');
    const derivedKey = (await scrypt(
      password,
      Buffer.from(saltHex, 'hex'),
      expectedKey.length
    )) as Buffer;

    return (
      Boolean(storedHash) &&
      expectedKey.length === derivedKey.length &&
      timingSafeEqual(expectedKey, derivedKey)
    );
  } catch {
    return false;
  }
}
