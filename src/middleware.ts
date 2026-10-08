import { NextResponse, type NextRequest } from 'next/server';
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apply baseline rate limiting to all /api routes
  if (pathname.startsWith('/api')) {
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

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
