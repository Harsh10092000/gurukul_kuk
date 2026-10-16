import { db } from '@/lib/db';
import { fetchRazorpayOrder, fetchRazorpayOrderPayments } from '@/lib/razorpay';
import { completePaymentAndRegistration } from '@/lib/payment-completion';

export interface RegistrationGateResult {
  allowed: boolean;
  status: 'ALLOWED' | 'ALREADY_REGISTERED' | 'PAYMENT_PENDING' | 'AUTO_CONFIRMED' | 'PURGED_AND_ALLOWED';
  message: string;
  orderId?: string;
  registrationNumber?: string;
}

/**
 * Checkpoint 1: Registration Gate Resolver
 * Resolves stuck payments or orphan records when a parent registers with an email:
 * 
 * Parent tries to register with same email
 *         │
 *         ▼
 * [Email already exists in users table?]
 *         │
 *         ├── NO → Allow registration normally
 *         │
 *         └── YES → Check: Does this user have a completed application?
 *                     │
 *                     ├── YES (already enrolled student) → Block: "You are already registered. Please login."
 *                     │
 *                     └── NO → Check: Is there a PENDING/PROCESSING payment order for this email?
 *                               │
 *                               ├── YES → Call Razorpay API for real status:
 *                               │         │
 *                               │         ├── CAPTURED → Auto-register, tell them: "Your payment was confirmed! Please login."
 *                               │         │
 *                               │         ├── FAILED/EXPIRED → Purge old data, allow fresh registration
 *                               │         │
 *                               │         └── STILL PENDING → Block: "Your payment is still being processed by the bank.
 *                               │                              Please login with your email & password to check status.
 *                               │                              You will receive an email once confirmed or rejected."
 *                               │
 *                               └── NO (orphan user, no order) → Purge old user record, allow fresh registration
 */
export async function resolveCandidateRegistrationGate(rawEmail: string): Promise<RegistrationGateResult> {
  const email = (rawEmail || '').trim().toLowerCase();
  if (!email) {
    return {
      allowed: true,
      status: 'ALLOWED',
      message: 'No email provided.',
    };
  }

  // 1. Check if user or application exists with this email
  const existingUser = await db.findUserByEmail(email);
  const existingApp = await db.findApplicationByEmail(email);

  // If no user and no application exists, allow registration normally
  if (!existingUser && !existingApp) {
    return {
      allowed: true,
      status: 'ALLOWED',
      message: 'New candidate, registration allowed.',
    };
  }

  // 2. Check if this is already an enrolled student with a completed application
  const isEnrolled =
    (existingApp && (existingApp.paymentStatus === 'completed' || existingApp.status === 'approved')) ||
    (existingUser && !!existingUser.registrationNumber);

  if (isEnrolled) {
    const regNo = existingUser?.registrationNumber || existingApp?.registrationNumber;
    return {
      allowed: false,
      status: 'ALREADY_REGISTERED',
      registrationNumber: regNo,
      message: 'You are already registered with an active application. Please login with your email and password.',
    };
  }

  // 3. Check: Is there a PENDING/PROCESSING payment order for this email? (No 15-minute time limit)
  const pendingOrder = await db.findActivePendingOrder({ email });

  if (pendingOrder) {
    let isCaptured = false;
    let isFailedOrExpired = false;
    let isStillPending = false;
    let capturedPaymentId = '';

    try {
      // Step A: Check payments associated with this order on Razorpay
      const paymentsRes = await fetchRazorpayOrderPayments(pendingOrder.orderId);
      if (paymentsRes && paymentsRes.items && paymentsRes.items.length > 0) {
        const captured = paymentsRes.items.find(
          (p) => p.status === 'captured' || p.status === 'authorized'
        );
        if (captured) {
          isCaptured = true;
          capturedPaymentId = captured.id;
        } else {
          const everyFailed = paymentsRes.items.every(
            (p) => p.status === 'failed' || p.status === 'refunded'
          );
          if (everyFailed) {
            isFailedOrExpired = true;
          } else {
            isStillPending = true;
          }
        }
      } else {
        // Step B: If no individual payments returned, query the order status itself
        const rzpOrder = await fetchRazorpayOrder(pendingOrder.orderId);
        if (rzpOrder) {
          if (rzpOrder.status === 'paid' || rzpOrder.amount_paid > 0) {
            isCaptured = true;
            capturedPaymentId = `pay_recovered_${Date.now()}`;
          } else if (rzpOrder.status === 'attempted') {
            isStillPending = true;
          } else {
            // Order status is 'created' (0 attempts made)
            // If order was created more than 5 minutes ago with zero attempts, it is abandoned/expired
            const orderAgeMs = Date.now() - new Date(pendingOrder.createdAt).getTime();
            if (orderAgeMs > 5 * 60 * 1000) {
              isFailedOrExpired = true;
            } else {
              isStillPending = true;
            }
          }
        } else {
          isFailedOrExpired = true;
        }
      }
    } catch (err) {
      console.warn(`[RegistrationGate] Error verifying Razorpay order ${pendingOrder.orderId}:`, err);
      isStillPending = true;
    }

    // Razorpay status: CAPTURED -> Auto-register candidate
    if (isCaptured) {
      const result = await completePaymentAndRegistration({
        orderId: pendingOrder.orderId,
        paymentId: capturedPaymentId,
        gateway: 'razorpay',
      });
      return {
        allowed: false,
        status: 'AUTO_CONFIRMED',
        orderId: pendingOrder.orderId,
        registrationNumber: result.registrationNumber,
        message: 'Your payment was confirmed! Please login to your dashboard with your email & password.',
      };
    }

    // Razorpay status: FAILED / EXPIRED -> Purge old data, allow fresh registration
    if (isFailedOrExpired) {
      await db.purgeFailedPaymentCandidate({
        email,
        orderId: pendingOrder.orderId,
        reason: 'Previous payment attempt failed or expired',
      });
      return {
        allowed: true,
        status: 'PURGED_AND_ALLOWED',
        message: 'Previous incomplete payment record cleared. You can now register fresh.',
      };
    }

    // Razorpay status: STILL PENDING -> Block with clear status message
    return {
      allowed: false,
      status: 'PAYMENT_PENDING',
      orderId: pendingOrder.orderId,
      message:
        'Your payment is still being processed by the bank. Please login with your email & password to check status. You will receive an email once confirmed or rejected.',
    };
  }

  // 4. Orphan user record with no pending order -> Purge old user record, allow fresh registration
  await db.purgeFailedPaymentCandidate({
    email,
    reason: 'Orphan user record without completed application or active order',
  });

  return {
    allowed: true,
    status: 'PURGED_AND_ALLOWED',
    message: 'Orphan account record cleared. Fresh registration allowed.',
  };
}
