/**
 * @swagger
 * /teachers:
 *   post:
 *     tags: [Teachers]
 *     summary: Create a new teacher
 *     description: |
 *       Creates teacher account, generates staff ID, sends welcome email
 *       with login credentials. Optionally assigns to classes and subjects.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTeacherInput'
 *     responses:
 *       201:
 *         description: Teacher created and email sent
 *       409:
 *         description: Email or phone already exists
 *
 *   get:
 *     tags: [Teachers]
 *     summary: List teachers
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Paginated teacher list
 *
 * /teachers/me/passport:
 *   post:
 *     tags: [Teachers]
 *     summary: Teacher uploads own passport photo (self-service)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [passport]
 *             properties:
 *               passport:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Passport uploaded
 *
 * /teachers/assign/classes:
 *   post:
 *     tags: [Teachers]
 *     summary: Assign teacher as form teacher to classes
 *     description: Removes teacher from old classes first, then assigns to new ones
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [teacherId, classIds]
 *             properties:
 *               teacherId: { type: string }
 *               classIds:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: Classes assigned
 *
 * /teachers/assign/subjects:
 *   post:
 *     tags: [Teachers]
 *     summary: Assign teacher to subjects
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [teacherId, subjectIds]
 *             properties:
 *               teacherId: { type: string }
 *               subjectIds:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: Subjects assigned
 *
 * /teachers/{id}:
 *   get:
 *     tags: [Teachers]
 *     summary: Get teacher full profile
 *     description: Returns profile + assigned classes + assigned subjects + summary
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Teacher profile
 *
 *   patch:
 *     tags: [Teachers]
 *     summary: Update teacher profile
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
 *     responses:
 *       200:
 *         description: Profile updated
 *
 * /teachers/{id}/passport:
 *   post:
 *     tags: [Teachers]
 *     summary: Admin uploads passport for a teacher
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
 *               passport:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Passport uploaded
 *   delete:
 *     tags: [Teachers]
 *     summary: Remove teacher passport
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Passport removed
 *
 * /teachers/{id}/deactivate:
 *   patch:
 *     tags: [Teachers]
 *     summary: Deactivate teacher
 *     description: Deactivates and unassigns from all classes and subjects
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
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Teacher deactivated
 *
 * /teachers/{id}/reactivate:
 *   patch:
 *     tags: [Teachers]
 *     summary: Reactivate teacher
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Teacher reactivated
 *
 * /teachers/{id}/reset-password:
 *   post:
 *     tags: [Teachers]
 *     summary: Reset teacher password
 *     description: Generates random temp password and emails it to the teacher
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Password reset and sent to teacher email
 */

export {};