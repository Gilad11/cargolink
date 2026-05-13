import { NextRequest, NextResponse } from 'next/server';
import { makeAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { code } = await req.json();

  const viewer = process.env.VIEWER_PASSCODE;
  const admin  = process.env.ADMIN_PASSCODE;

  let role: 'viewer' | 'admin' | null = null;
  if (code === admin)  role = 'admin';
  else if (code === viewer) role = 'viewer';

  if (!role) {
    return NextResponse.json({ error: 'Invalid passcode' }, { status: 401 });
  }

  const cookie = makeAuthCookie(role);
  const res = NextResponse.json({ role });
  res.cookies.set(cookie);
  // Readable (non-httpOnly) cookie for UI role display only
  res.cookies.set({ name: 'cl_role', value: role, path: '/', maxAge: 60 * 60 * 24 * 7, sameSite: 'lax' });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: 'cl_auth', value: '', maxAge: 0, path: '/' });
  res.cookies.set({ name: 'cl_role', value: '', maxAge: 0, path: '/' });
  return res;
}
