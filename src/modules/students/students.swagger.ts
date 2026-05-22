/**
 * @swagger
 * /students:
 *   post:
 *     tags: [Students]
 *     summary: Enrol a new student
 *     description: |
 *       Creates student profile, auto-generates admission number, generates QR code
 *       for attendance, and creates/links parent account. All compulsory fields required.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateStudentInput'
 *     responses:
 *       201:
 *         description: Student enrolled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 student: { $ref: '#/components/schemas/User' }
 *                 admissionNumber: { type: string }
 *                 qrCode: { type: string, description: Base64 QR code data URL }
 *                 parent: { type: object }
 *
 *   get:
 *     tags: [Students]
 *     summary: List students
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
 *         name: classId
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by name or admission number
 *       - in: query
 *         name: gender
 *         schema: { type: string, enum: [male, female] }
 *     responses:
 *       200:
 *         description: Paginated list of students
 *
 * /students/{id}:
 *   get:
 *     tags: [Students]
 *     summary: Get student full profile
 *     description: Includes linked parents and calculated age
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Student profile with parents
 *       404:
 *         description: Student not found
 *
 *   patch:
 *     tags: [Students]
 *     summary: Update student profile
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
 *             description: Any field from CreateStudentInput (all optional)
 *     responses:
 *       200:
 *         description: Profile updated
 *
 * /students/{id}/passport:
 *   post:
 *     tags: [Students]
 *     summary: Upload student passport photo
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
 *             required: [passport]
 *             properties:
 *               passport:
 *                 type: string
 *                 format: binary
 *                 description: JPG/PNG — max 2MB
 *     responses:
 *       200:
 *         description: Passport uploaded
 *   delete:
 *     tags: [Students]
 *     summary: Remove student passport
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
 * /students/{id}/qrcode:
 *   get:
 *     tags: [Students]
 *     summary: Get / regenerate student QR code
 *     description: Returns Base64 QR code for attendance scanning
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: QR code data URL
 *
 * /students/{id}/deactivate:
 *   patch:
 *     tags: [Students]
 *     summary: Deactivate student
 *     description: Marks inactive and removes from class
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
 *         description: Student deactivated
 */

export {};