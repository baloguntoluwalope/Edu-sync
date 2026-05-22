/**
 * @swagger
 * /classes:
 *   post:
 *     tags: [Classes]
 *     summary: Create a custom class
 *     description: |
 *       EduSync auto-creates all standard classes (KG1–SS3) on school/branch setup.
 *       Use this ONLY for non-standard custom classes like "Pre-KG" or "Extra Studies".
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, category]
 *             properties:
 *               name: { type: string, example: 'Pre-KG' }
 *               category: { type: string, enum: [KG, Nursery, Primary, JSS, SSS] }
 *               formTeacherId: { type: string }
 *     responses:
 *       201:
 *         description: Custom class created
 *       409:
 *         description: Class already exists
 *   get:
 *     tags: [Classes]
 *     summary: List all classes in branch (cached)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All classes with form teacher
 *
 * /classes/{id}/students:
 *   post:
 *     tags: [Classes]
 *     summary: Add students to class
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
 *             required: [studentIds]
 *             properties:
 *               studentIds:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: Students added
 *   get:
 *     tags: [Classes]
 *     summary: Get all students in a class
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated student list
 */
export {};