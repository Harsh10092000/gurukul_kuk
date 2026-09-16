import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { User, UserRole } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'gurukul_kurukshetra_super_secret_jwt_key_2026';
const TOKEN_NAME = 'gurukul_auth_token';

export interface TokenPayload {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  registrationNumber?: string;
}

export function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, 10);
}

export function comparePassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

export async function getCurrentUser(): Promise<TokenPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(TOKEN_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function getAuthCookieOptions() {
  return {
    name: TOKEN_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  };
}
