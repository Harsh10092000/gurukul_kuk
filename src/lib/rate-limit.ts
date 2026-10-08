import { NextResponse } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

declare global {
  var _gurukulRateLimits: Map<string, RateLimitRecord> | undefined;
  var _rateLimitIntervalStarted: boolean | undefined;
}

const g = globalThis as any;
const rateLimitStore: Map<string, RateLimitRecord> = g._gurukulRateLimits || new Map<string, RateLimitRecord>();
g._gurukulRateLimits = rateLimitStore;

// Clean up expired rate limit records periodically
if (typeof setInterval !== 'undefined') {
  if (!g._rateLimitIntervalStarted) {
    g._rateLimitIntervalStarted = true;
    setInterval(() => {
      const now = Date.now();
      rateLimitStore.forEach((record, key) => {
        if (record.resetTime <= now) {
          rateLimitStore.delete(key);
        }
      });
    }, 60000);
  }
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfterSeconds: number;
}

export const RATE_LIMIT_CONFIGS = {
  // Global API limit: 120 requests per minute per IP
  GLOBAL_API: { limit: 120, windowMs: 60 * 1000, prefix: 'global' },
  // OTP sending: 5 requests per 10 minutes per IP/target
  OTP: { limit: 5, windowMs: 10 * 60 * 1000, prefix: 'otp' },
  // Login: 5 failed attempts per 15 minutes per IP
  LOGIN: { limit: 5, windowMs: 15 * 60 * 1000, prefix: 'login' },
  // Password Reset: 5 attempts per 15 minutes per IP
  RESET_PASSWORD: { limit: 5, windowMs: 15 * 60 * 1000, prefix: 'reset_pwd' },
  // Registration: 5 registrations per 15 minutes per IP
  REGISTER: { limit: 5, windowMs: 15 * 60 * 1000, prefix: 'register' },
  // Application Submission: 10 submissions per 10 minutes per IP
  APPLICATION_SUBMIT: { limit: 10, windowMs: 10 * 60 * 1000, prefix: 'app_sub' },
  // Contact enquiries: 5 submissions per 10 minutes per IP
  CONTACT: { limit: 5, windowMs: 10 * 60 * 1000, prefix: 'contact' },
  // Public search & lookup (track, admit-card, results): 30 requests per minute per IP
  TRACK: { limit: 30, windowMs: 60 * 1000, prefix: 'track' },
};

/**
 * Extracts client IP from request headers or fallbacks
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }
  return '127.0.0.1';
}

/**
 * Checks and increments request counter for a given key within windowMs
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || record.resetTime <= now) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return {
      success: true,
      limit,
      remaining: Math.max(0, limit - 1),
      reset: now + windowMs,
      retryAfterSeconds: 0,
    };
  }

  if (record.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
    return {
      success: false,
      limit,
      remaining: 0,
      reset: record.resetTime,
      retryAfterSeconds,
    };
  }

  record.count += 1;
  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - record.count),
    reset: record.resetTime,
    retryAfterSeconds: 0,
  };
}

/**
 * Resets/clears the rate limit counter for a key (e.g. on successful login)
 */
export function clearRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Returns a standard HTTP 429 Too Many Requests response with standard headers
 */
export function rateLimitResponse(result: RateLimitResult, customMessage?: string) {
  const minutes = Math.ceil(result.retryAfterSeconds / 60);
  const timeDesc = result.retryAfterSeconds > 60
    ? `${minutes} minute${minutes > 1 ? 's' : ''}`
    : `${result.retryAfterSeconds} second${result.retryAfterSeconds > 1 ? 's' : ''}`;

  const message = customMessage || `Too many requests. Please wait ${timeDesc} before trying again.`;

  return NextResponse.json(
    {
      error: message,
      rateLimited: true,
      retryAfterSeconds: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSeconds),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(result.reset / 1000)),
      },
    }
  );
}
