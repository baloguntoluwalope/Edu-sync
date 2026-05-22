/**
 * @swagger
 * /subscriptions/plans:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Get all available subscription plans
 *     description: Returns pricing for monthly, termly and annual plans. Public endpoint.
 *     security: []
 *     responses:
 *       200:
 *         description: Available plans
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key: { type: string, enum: [monthly, termly, annual] }
 *                       label: { type: string, example: 'Monthly Plan' }
 *                       amountNaira: { type: number, example: 5000 }
 *                       durationDays: { type: integer, example: 30 }
 *                       description: { type: string }
 *                       savingsPercent: { type: integer, nullable: true }
 *
 * /subscriptions/current:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Get current subscription status
 *     description: Returns school status, active subscription, days remaining and all plans
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current subscription info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 school:
 *                   type: object
 *                   properties:
 *                     subscriptionStatus:
 *                       type: string
 *                       enum: [trial, active, expired, suspended]
 *                     trialEndsAt: { type: string, format: date-time }
 *                     subscriptionEndsAt: { type: string, format: date-time, nullable: true }
 *                 activeSubscription: { type: object, nullable: true }
 *                 daysLeft: { type: integer }
 *                 isExpired: { type: boolean }
 *                 plans: { type: array }
 *
 * /subscriptions/initialize:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Initialize a subscription payment via KoraPay
 *     description: |
 *       Creates a pending subscription and returns a KoraPay checkout URL.
 *       School is activated automatically via webhook after successful payment.
 *
 *       Plans:
 *       - monthly  → ₦5,000  / 30 days
 *       - termly   → ₦12,000 / 120 days
 *       - annual   → ₦40,000 / 365 days
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [plan]
 *             properties:
 *               plan:
 *                 type: string
 *                 enum: [monthly, termly, annual]
 *     responses:
 *       200:
 *         description: Payment initialized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 subscriptionId: { type: string }
 *                 paymentRef: { type: string }
 *                 plan: { type: string }
 *                 planLabel: { type: string }
 *                 amountNaira: { type: number }
 *                 durationDays: { type: integer }
 *                 checkoutUrl: { type: string }
 *                 message: { type: string }
 *       400:
 *         description: Invalid plan
 *       502:
 *         description: Payment gateway error
 *
 * /subscriptions/webhook:
 *   post:
 *     tags: [Subscriptions]
 *     summary: KoraPay payment webhook (public)
 *     description: |
 *       Called by KoraPay on payment events.
 *       Validates HMAC SHA256 signature from x-korapay-signature header.
 *       On success — activates school, updates subscription, emails admin.
 *     security: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed
 *
 * /subscriptions/verify/{paymentRef}:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Manually verify a payment with KoraPay
 *     description: |
 *       Use this when the webhook may not have fired.
 *       Queries KoraPay directly and activates if paid.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentRef
 *         required: true
 *         schema: { type: string, example: 'SUB-ABC12345' }
 *     responses:
 *       200:
 *         description: Verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 message: { type: string }
 *       502:
 *         description: Could not reach payment gateway
 *
 * /subscriptions/history:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Get subscription payment history
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Paginated payment history
 *
 * /subscriptions/cancel:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Cancel a pending payment
 *     description: Marks a pending subscription as failed/cancelled
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentRef]
 *             properties:
 *               paymentRef: { type: string }
 *     responses:
 *       200:
 *         description: Cancelled
 */

export {};