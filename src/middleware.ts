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

  // Handle CORS preflight request
  if (pathname.startsWith('/api/') && request.method === 'OPTIONS') {
    const origin = request.headers.get('origin') || '*';
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie, x-user-id, x-user-role',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  }

  // Redirect root to login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  let response: NextResponse;

  // Define public routes
  const publicRoutes = ['/login', '/forgot-password', '/reset-password'];
  if (publicRoutes.some(route => pathname.startsWith(route)) || pathname.startsWith('/api/auth/')) {
    response = NextResponse.next();
  } else {
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

        response = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      } catch (error) {
        // Token is invalid or expired
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } else {
      response = NextResponse.next();
    }
  }

  // Add CORS headers for actual API requests
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin') || '*';
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, x-user-id, x-user-role');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
