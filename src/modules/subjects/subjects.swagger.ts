/**
 * @swagger
 * /subjects:
 *   post:
 *     tags: [Subjects]
 *     summary: Add a custom subject
 *     description: EduSync auto-creates defaults. Use this for extras like French or Computer Science.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, classId]
 *             properties:
 *               name: { type: string, example: 'French Language' }
 *               classId: { type: string }
 *               code: { type: string }
 *               teacherId: { type: string }
 *     responses:
 *       201:
 *         description: Subject created
 *   get:
 *     tags: [Subjects]
 *     summary: List all subjects in branch (cached)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All subjects
 *
 * /subjects/bulk:
 *   post:
 *     tags: [Subjects]
 *     summary: Bulk add custom subjects for a class
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [classId, names]
 *             properties:
 *               classId: { type: string }
 *               names:
 *                 type: array
 *                 items: { type: string }
 *                 example: ['French', 'Computer Science', 'Music']
 *     responses:
 *       200:
 *         description: Subjects created
 *
 * /subjects/class/{classId}:
 *   get:
 *     tags: [Subjects]
 *     summary: List subjects for a specific class (cached)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Subjects for the class
 *
 * /subjects/{id}/assign-teacher:
 *   patch:
 *     tags: [Subjects]
 *     summary: Assign teacher to subject
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
 *             required: [teacherId]
 *             properties:
 *               teacherId: { type: string }
 *     responses:
 *       200:
 *         description: Teacher assigned
 */
export {};