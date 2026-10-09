import crypto from 'crypto';

export const RAZORPAY_CONFIG = {
  get KEY_ID(): string {
    return process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
  },
  get KEY_SECRET(): string {
    return process.env.RAZORPAY_KEY_SECRET || '';
  },
  // The actual amount charged by Razorpay during checkout (₹800 while paying)
  get CHECKOUT_AMOUNT_RUPEES(): number {
    const envVal = process.env.RAZORPAY_PAYMENT_AMOUNT;
    if (envVal) {
      const parsed = parseFloat(envVal);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 800;
  },
  get CHECKOUT_AMOUNT_PAISE(): number {
    return Math.round(this.CHECKOUT_AMOUNT_RUPEES * 100);
  },
  get FEE_AMOUNT_PAISE(): number {
    return this.CHECKOUT_AMOUNT_PAISE;
  },
  get FEE_AMOUNT_RUPEES(): number {
    return this.CHECKOUT_AMOUNT_RUPEES;
  },
  OFFICIAL_FEE_RUPEES: 800,
  CURRENCY: 'INR',
};

export interface RazorpayOrderPayload {
  amount: number; // in paise
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

export interface RazorpayPaymentResponse {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string; // 'captured' | 'authorized' | 'failed'
  order_id: string;
  method: string;
  description?: string;
  email?: string;
  contact?: string;
}

function getBasicAuthHeader(): string {
  const credentials = `${RAZORPAY_CONFIG.KEY_ID}:${RAZORPAY_CONFIG.KEY_SECRET}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

/**
 * Creates an order on Razorpay servers
 */
export async function createRazorpayOrder(
  payload: RazorpayOrderPayload
): Promise<RazorpayOrderResponse> {
  if (!RAZORPAY_CONFIG.KEY_ID || !RAZORPAY_CONFIG.KEY_SECRET) {
    throw new Error('Razorpay API keys are not configured in environment variables.');
  }

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getBasicAuthHeader(),
    },
    body: JSON.stringify({
      amount: payload.amount,
      currency: payload.currency || RAZORPAY_CONFIG.CURRENCY,
      receipt: payload.receipt,
      notes: payload.notes || {},
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data?.error?.description || data?.error?.message || 'Failed to create Razorpay order';
    console.error('[Razorpay Order Creation Error]:', data);
    throw new Error(errorMsg);
  }

  return data as RazorpayOrderResponse;
}

/**
 * Verifies Razorpay payment signature using HMAC-SHA256
 */
export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const { orderId, paymentId, signature } = params;
  if (!orderId || !paymentId || !signature) {
    return false;
  }

  if (!RAZORPAY_CONFIG.KEY_SECRET) {
    console.error('Cannot verify Razorpay signature: RAZORPAY_KEY_SECRET is not configured.');
    return false;
  }

  try {
    const text = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_CONFIG.KEY_SECRET)
      .update(text)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  } catch (error) {
    console.error('Error verifying Razorpay signature:', error);
    return false;
  }
}

/**
 * Fetches payment details directly from Razorpay to verify payment state
 */
export async function fetchRazorpayPayment(
  paymentId: string
): Promise<RazorpayPaymentResponse | null> {
  try {
    const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        Authorization: getBasicAuthHeader(),
      },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as RazorpayPaymentResponse;
  } catch (err) {
    console.error(`Failed to fetch Razorpay payment ${paymentId}:`, err);
    return null;
  }
}
