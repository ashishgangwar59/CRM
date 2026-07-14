import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Middleware runs in Edge runtime, so we need to use `jose` instead of `jsonwebtoken`
// Let's create a minimal edge-compatible verify function
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "super-secret-key-for-development-only-change-in-prod"
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect root to login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Define public routes
  const publicRoutes = ['/login', '/forgot-password', '/reset-password'];
  if (publicRoutes.some(route => pathname.startsWith(route)) || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Define protected routes
  const protectedRoutes = ['/dashboard'];
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtected) {
    const accessToken = request.cookies.get('accessToken')?.value;

    if (!accessToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      // Verify token
      const { payload } = await jwtVerify(accessToken, JWT_SECRET);
      
      // Role-Based Access Control Example
      // If we wanted to protect an admin route:
      if (pathname.startsWith('/admin') && payload.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      // Add user info to headers for downstream use if needed
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', payload.userId as string);
      requestHeaders.set('x-user-role', payload.role as string);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      // Token is invalid or expired
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
