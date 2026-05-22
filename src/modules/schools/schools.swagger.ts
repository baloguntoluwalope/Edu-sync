/**
 * @swagger
 * /schools:
 *   get:
 *     tags: [School]
 *     summary: Get school profile
 *     description: Returns full school info, branches, user count and active subscription
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: School profile
 *
 *   patch:
 *     tags: [School]
 *     summary: Update school details
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               address: { type: string }
 *               website: { type: string }
 *     responses:
 *       200:
 *         description: School updated
 *
 * /schools/stats:
 *   get:
 *     tags: [School]
 *     summary: Get school statistics
 *     description: Users by role, branch count, subscription history, total revenue
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: School stats
 *
 * /schools/audit:
 *   get:
 *     tags: [School]
 *     summary: Get school audit logs
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 30 }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *         description: Filter by action keyword
 *     responses:
 *       200:
 *         description: Audit logs
 *
 * /schools/logo:
 *   post:
 *     tags: [School]
 *     summary: Upload school logo
 *     description: |
 *       Logo is uploaded to Cloudinary and synced to both the School document
 *       and the main Branch document. It appears on result cards and emails.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [logo]
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: JPG, PNG or WebP — max 2MB
 *     responses:
 *       200:
 *         description: Logo uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logoUrl:
 *                   type: string
 *   delete:
 *     tags: [School]
 *     summary: Remove school logo
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logo removed
 *
 * /schools/signature:
 *   post:
 *     tags: [School]
 *     summary: Upload principal signature
 *     description: |
 *       Uploads principal signature for the main branch (or a specific branch
 *       if branchId query param is provided). Auto-attached to result cards.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema: { type: string }
 *         description: Defaults to main branch if not provided
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [signature]
 *             properties:
 *               signature:
 *                 type: string
 *                 format: binary
 *                 description: JPG, PNG or WebP — max 2MB
 *     responses:
 *       200:
 *         description: Signature uploaded
 *   delete:
 *     tags: [School]
 *     summary: Remove principal signature
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Signature removed
 *
 * /schools/principal:
 *   patch:
 *     tags: [School]
 *     summary: Update principal name
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [principalName]
 *             properties:
 *               principalName:
 *                 type: string
 *                 example: Mrs Adebayo Funmilola
 *               branchId:
 *                 type: string
 *                 description: Defaults to main branch
 *     responses:
 *       200:
 *         description: Principal name updated
 */

export {};