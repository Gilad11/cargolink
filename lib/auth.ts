import { createHmac } from 'crypto';
import { cookies } from 'next/headers';
import { UserRole } from './types';

const SECRET = process.env.AUTH_SECRET ?? 'cargolink-dev-secret';
const COOKIE_NAME = 'cl_auth';

export function signRole(role: UserRole): string {
  const sig = createHmac('sha256', SECRET).update(role).digest('hex');
  return `${role}.${sig}`;
}

export function verifyToken(token: string): UserRole | null {
  const [role, sig] = token.split('.');
  if (!role || !sig) return null;
  const expected = createHmac('sha256', SECRET).update(role).digest('hex');
  if (sig !== expected) return null;
  if (role !== 'viewer' && role !== 'admin') return null;
  return role as UserRole;
}

export async function getRole(): Promise<UserRole | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function makeAuthCookie(role: UserRole) {
  return {
    name: COOKIE_NAME,
    value: signRole(role),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
}
