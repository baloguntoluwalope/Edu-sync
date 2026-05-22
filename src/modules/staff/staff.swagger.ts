/**
 * @swagger
 * /staff:
 *   post:
 *     tags: [Non-Teaching Staff]
 *     summary: Add a non-teaching staff member
 *     description: |
 *       Creates staff profile and auto-generates a QR code for attendance.
 *       Staff roles include: bursar, librarian, security, cleaner, driver, cook, nurse, counselor, it_support, other.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, gender, phone, homeAddress, city, state, staffRole, emergencyContactName, emergencyContactPhone, emergencyContactRelationship]
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               middleName: { type: string }
 *               gender: { type: string, enum: [male, female] }
 *               dateOfBirth: { type: string, format: date }
 *               phone: { type: string }
 *               email: { type: string }
 *               homeAddress: { type: string }
 *               city: { type: string }
 *               state: { type: string }
 *               staffRole:
 *                 type: string
 *                 enum: [non_teaching, bursar, librarian, security, cleaner, driver, cook, nurse, counselor, it_support, other]
 *               customRole: { type: string }
 *               department: { type: string }
 *               qualification: { type: string }
 *               dateEmployed: { type: string, format: date }
 *               emergencyContactName: { type: string }
 *               emergencyContactPhone: { type: string }
 *               emergencyContactRelationship: { type: string }
 *     responses:
 *       201:
 *         description: Staff created with QR code
 *
 *   get:
 *     tags: [Non-Teaching Staff]
 *     summary: List non-teaching staff
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: staffRole
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paginated staff list
 *
 * /staff/{id}:
 *   get:
 *     tags: [Non-Teaching Staff]
 *     summary: Get staff member profile
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Staff profile with age
 *
 *   patch:
 *     tags: [Non-Teaching Staff]
 *     summary: Update staff profile
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Updated
 *
 * /staff/{id}/passport:
 *   post:
 *     tags: [Non-Teaching Staff]
 *     summary: Upload staff passport photo
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
 *               passport: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Passport uploaded
 *
 * /staff/{id}/qrcode:
 *   get:
 *     tags: [Non-Teaching Staff]
 *     summary: Get staff QR code for attendance
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
 * /staff/{id}/qrcode/regenerate:
 *   post:
 *     tags: [Non-Teaching Staff]
 *     summary: Regenerate staff QR code
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: New QR code
 *
 * /staff/{id}/deactivate:
 *   patch:
 *     tags: [Non-Teaching Staff]
 *     summary: Deactivate staff member
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deactivated
 *
 * /staff/{id}/reactivate:
 *   patch:
 *     tags: [Non-Teaching Staff]
 *     summary: Reactivate staff member
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Reactivated
 */

export {};