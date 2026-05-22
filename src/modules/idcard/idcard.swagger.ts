/**
 * @swagger
 * /idcards/preview:
 *   get:
 *     tags: [ID Cards]
 *     summary: Preview a single ID card (free — no payment)
 *     description: |
 *       Admin can preview how any person's ID card will look before ordering.
 *       Returns a PDF of the card front and back.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: attendeeId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: attendeeType
 *         required: true
 *         schema: { type: string, enum: [student, teacher, staff, admin] }
 *     responses:
 *       200:
 *         description: PDF preview
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *
 * /idcards/order:
 *   post:
 *     tags: [ID Cards]
 *     summary: Create an ID card order and initialize payment
 *     description: |
 *       ₦300 per card. Maximum 100 cards per order.
 *       Returns a KoraPay checkout URL for payment.
 *       ID cards can be downloaded after payment is confirmed.
 *       Order is valid for 30 days after payment.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [attendees]
 *             properties:
 *               attendees:
 *                 type: array
 *                 maxItems: 100
 *                 items:
 *                   type: object
 *                   required: [id, type]
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: User._id or Staff._id
 *                     type:
 *                       type: string
 *                       enum: [student, teacher, staff, admin]
 *     responses:
 *       201:
 *         description: Order created with checkout URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orderId: { type: string }
 *                 paymentRef: { type: string }
 *                 totalCards: { type: integer }
 *                 pricePerCard: { type: number, example: 300 }
 *                 totalAmountNaira: { type: number, example: 9000 }
 *                 checkoutUrl: { type: string }
 *                 message: { type: string }
 *
 * /idcards/order/class:
 *   post:
 *     tags: [ID Cards]
 *     summary: Quick order for all students in a class
 *     description: Automatically adds all active students in the class to the order
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [classId]
 *             properties:
 *               classId: { type: string }
 *     responses:
 *       201:
 *         description: Order created
 *
 * /idcards/orders:
 *   get:
 *     tags: [ID Cards]
 *     summary: List all ID card orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: paymentStatus
 *         schema: { type: string, enum: [pending, paid, failed] }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paginated order list
 *
 * /idcards/orders/{orderId}:
 *   get:
 *     tags: [ID Cards]
 *     summary: Get single order details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order details with all card items
 *
 * /idcards/orders/{orderId}/download:
 *   get:
 *     tags: [ID Cards]
 *     summary: Download ID cards as PDF
 *     description: |
 *       Payment must be confirmed before download is allowed.
 *       Each card includes front (photo + details) and back (QR code + school contact + principal signature).
 *       Cards are CR80 standard size (85.6mm × 54mm) — print-ready.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: PDF file with all ID cards
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       402:
 *         description: Payment required
 *
 * /idcards/webhook:
 *   post:
 *     tags: [ID Cards]
 *     summary: KoraPay webhook for ID card payments
 *     security: []
 *     responses:
 *       200:
 *         description: Processed
 */

export {};