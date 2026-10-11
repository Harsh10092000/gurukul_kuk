import { NextResponse, type NextRequest } from 'next/server';
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import { verifyTokenInEdge, TOKEN_NAME } from '@/lib/edge-auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. ADMIN PAGES PROTECTION (/admin/*)
  if (pathname.startsWith('/admin')) {
    // Admin login page
    if (pathname === '/admin/login') {
      const token = request.cookies.get(TOKEN_NAME)?.value;
      if (token) {
        const payload = await verifyTokenInEdge(token);
        if (payload && payload.role === 'admin') {
          return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        }
      }
      return NextResponse.next();
    }

    // All other admin pages: strictly require authenticated admin
    const token = request.cookies.get(TOKEN_NAME)?.value;
    if (!token) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const payload = await verifyTokenInEdge(token);
    if (!payload || payload.role !== 'admin') {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // 2. ADMIN API ROUTE PROTECTION (/api/admin/*)
  if (pathname.startsWith('/api/admin')) {
    const token = request.cookies.get(TOKEN_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }
    const payload = await verifyTokenInEdge(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin privileges required' }, { status: 403 });
    }
  }

  // 3. Baseline rate limiting for /api routes
  if (pathname.startsWith('/api')) {
    // Exempt /api/auth/me from global rate limit to ensure reliable auth checks
    if (pathname !== '/api/auth/me') {
      const ip = getClientIp(request);
      const result = checkRateLimit(
        `global:${ip}`,
        RATE_LIMIT_CONFIGS.GLOBAL_API.limit,
        RATE_LIMIT_CONFIGS.GLOBAL_API.windowMs
      );

      if (!result.success) {
        return rateLimitResponse(
          result,
          'High request volume detected from this network. Please slow down and try again shortly.'
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*'],
};
