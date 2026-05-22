/**
 * @swagger
 * /branches:
 *   post:
 *     tags: [Branches]
 *     summary: Create a new branch
 *     description: |
 *       Creates a new school branch and auto-seeds all standard classes (KG1–SS3)
 *       and default subjects. Sends branch creation email to school admin.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBranchInput'
 *     responses:
 *       201:
 *         description: Branch created
 *       409:
 *         description: Branch name already exists
 *
 *   get:
 *     tags: [Branches]
 *     summary: List all branches
 *     description: Cached for 5 minutes in Redis
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of branches
 *
 * /branches/{id}:
 *   get:
 *     tags: [Branches]
 *     summary: Get a single branch
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Branch details
 *       404:
 *         description: Branch not found
 *
 *   patch:
 *     tags: [Branches]
 *     summary: Update branch details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBranchInput'
 *     responses:
 *       200:
 *         description: Branch updated
 *
 * /branches/{id}/logo:
 *   post:
 *     tags: [Branches]
 *     summary: Upload branch logo
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Logo uploaded
 *
 * /branches/{id}/signature:
 *   post:
 *     tags: [Branches]
 *     summary: Upload principal signature for this branch
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               signature:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Signature uploaded
 *
 * /branches/{id}/deactivate:
 *   patch:
 *     tags: [Branches]
 *     summary: Deactivate a branch
 *     description: Cannot deactivate the main branch
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Branch deactivated
 *       400:
 *         description: Cannot deactivate main branch
 */

export {};