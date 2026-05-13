import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/', '/api/auth'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith('/api/auth'));
  if (isPublic) return NextResponse.next();

  const token = request.cookies.get('cl_auth')?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
