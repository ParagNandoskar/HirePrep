const crypto = require('crypto');
const Razorpay = require('razorpay');
const Candidate = require('../models/Candidate');
const { successResponse, errorResponse } = require('../utils/helpers');

const PLAN_PRICING = {
  pro: 499,
  elite: 999
};

const hasRazorpayKeys = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const isMockPaymentMode = () => {
  // Explicit mock mode always wins
  if (process.env.PAYMENT_MODE === 'mock') return true;

  // Safe default for local/dev setups without keys
  if (process.env.NODE_ENV !== 'production' && !hasRazorpayKeys()) return true;

  return false;
};

const getPlanAmountInInr = (plan, billingCycle = 'monthly') => {
  const monthly = PLAN_PRICING[plan];
  if (!monthly) return 0;
  if (billingCycle === 'yearly') return Math.round(monthly * 12 * 0.8);
  return monthly;
};

const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay keys are not configured');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
};

const createOrder = async (req, res) => {
  try {
    const { plan, billingCycle = 'monthly' } = req.body;

    if (!['pro', 'elite'].includes(plan)) {
      return errorResponse(res, 'Only Pro and Elite plans require payment', 400);
    }

    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return errorResponse(res, 'Invalid billing cycle', 400);
    }

    const amountInr = getPlanAmountInInr(plan, billingCycle);
    const amount = amountInr * 100; // paise

    if (!amount || amount <= 0) {
      return errorResponse(res, 'Unable to compute payment amount', 400);
    }

    if (isMockPaymentMode()) {
      return successResponse(res, {
        mode: 'mock',
        orderId: `mock_order_${Date.now()}`,
        amount,
        currency: 'INR',
        plan,
        billingCycle,
        keyId: 'rzp_test_mock'
      }, 'Mock payment order created');
    }

    const razorpay = getRazorpayClient();
    const receipt = `hp_${plan}_${billingCycle}_${Date.now()}`.slice(0, 40);

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt,
      notes: {
        candidateId: String(req.user.id),
        plan,
        billingCycle
      }
    });

    return successResponse(res, {
      mode: 'live',
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      plan,
      billingCycle,
      keyId: process.env.RAZORPAY_KEY_ID
    }, 'Razorpay order created');
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    return errorResponse(res, error.message || 'Failed to create payment order', 500);
  }
};

const verifyPayment = async (req, res) => {
  try {
    const {
      plan,
      billingCycle = 'monthly',
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (!['pro', 'elite'].includes(plan)) {
      return errorResponse(res, 'Invalid plan for paid subscription', 400);
    }

    if (!isMockPaymentMode()) {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return errorResponse(res, 'Missing payment verification fields', 400);
      }

      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return errorResponse(res, 'Payment signature verification failed', 400);
      }

      const razorpay = getRazorpayClient();
      const order = await razorpay.orders.fetch(razorpay_order_id);

      const expectedAmount = getPlanAmountInInr(plan, billingCycle) * 100;
      if (order.amount !== expectedAmount) {
        return errorResponse(res, 'Payment amount mismatch', 400);
      }
    }

    const now = new Date();
    const renewDate = new Date(now);
    if (billingCycle === 'yearly') renewDate.setFullYear(now.getFullYear() + 1);
    else renewDate.setMonth(now.getMonth() + 1);

    const candidate = await Candidate.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: {
          subscription: {
            plan,
            billingCycle,
            status: 'active',
            startedAt: now,
            renewsAt: renewDate
          }
        }
      },
      { new: true }
    );

    if (!candidate) {
      return errorResponse(res, 'Candidate profile not found', 404);
    }

    return successResponse(res, {
      subscription: candidate.subscription,
      payment: {
        orderId: razorpay_order_id || `mock_order_${Date.now()}`,
        paymentId: razorpay_payment_id || `mock_payment_${Date.now()}`,
        signatureVerified: !isMockPaymentMode()
      }
    }, 'Payment verified and subscription activated');
  } catch (error) {
    console.error('Verify Razorpay payment error:', error);
    return errorResponse(res, error.message || 'Failed to verify payment', 500);
  }
};

module.exports = {
  createOrder,
  verifyPayment
};
