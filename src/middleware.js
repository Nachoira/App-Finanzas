import { NextResponse } from 'next/server';

export function middleware(request) {
  const session = request.cookies.get('session');
  const isLoginPage = request.nextUrl.pathname === '/login';

  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (session && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};