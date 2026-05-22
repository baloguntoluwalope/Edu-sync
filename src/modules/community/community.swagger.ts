/**
 * @swagger
 * /community:
 *   post:
 *     tags: [Community]
 *     summary: Create a community post
 *     description: |
 *       Notifies all active users in the branch via in-app and email.
 *       Supports WhatsApp link for continuing discussions.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePostInput'
 *     responses:
 *       201:
 *         description: Post created and notifications sent
 *
 *   get:
 *     tags: [Community]
 *     summary: List community posts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [news, event, discussion] }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paginated posts (pinned first)
 *
 * /community/{id}:
 *   get:
 *     tags: [Community]
 *     summary: Get single post
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Post details
 *
 *   patch:
 *     tags: [Community]
 *     summary: Edit post (author or admin)
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
 *             type: object
 *             properties:
 *               title: { type: string }
 *               body: { type: string }
 *               whatsappLink: { type: string }
 *               isPinned: { type: boolean, description: 'Admin only' }
 *     responses:
 *       200:
 *         description: Post updated
 *
 *   delete:
 *     tags: [Community]
 *     summary: Delete post
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Post deleted
 *
 * /community/{id}/like:
 *   post:
 *     tags: [Community]
 *     summary: Like a post
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Like registered
 *
 * /community/{id}/moderate:
 *   patch:
 *     tags: [Community]
 *     summary: Hide/unhide a post (admin/teacher only)
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
 *             type: object
 *             required: [hide]
 *             properties:
 *               hide: { type: boolean }
 *     responses:
 *       200:
 *         description: Post moderation status updated
 */

export {};