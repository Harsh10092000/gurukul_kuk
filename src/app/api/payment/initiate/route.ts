import { NextResponse } from 'next/server';
import { POST as handleRazorpayOrder } from '@/app/api/payment/razorpay/create-order/route';
import { POST as handleHdfcOrder } from '@/app/api/payment/hdfc/initiate/route';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const activeGateway = (process.env.ACTIVE_PAYMENT_GATEWAY || 'razorpay').toLowerCase();

  if (activeGateway === 'hdfc') {
    return handleHdfcOrder(request);
  }

  // Default to razorpay
  return handleRazorpayOrder(request);
}

export async function GET() {
  const activeGateway = (process.env.ACTIVE_PAYMENT_GATEWAY || 'razorpay').toLowerCase();
  return NextResponse.json({
    activeGateway,
  });
}
