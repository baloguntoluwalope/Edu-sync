/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new school
 *     description: |
 *       Creates a school, main branch, admin user, and auto-seeds all standard
 *       classes (KG1–SS3) and default subjects. Sends welcome email + OTP.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterSchoolInput'
 *     responses:
 *       201:
 *         description: School registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         token:
 *                           type: string
 *                         school:
 *                           $ref: '#/components/schemas/School'
 *                         requiresEmailVerification:
 *                           type: boolean
 *                           example: true
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation failed
 *
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login — School Admin / Teacher / SuperAdmin
 *     description: |
 *       Email + password login for schooladmin, teacher, and superadmin roles.
 *       Account is locked for 15 minutes after 5 failed attempts.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginEmailInput'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Account locked — too many failed attempts
 *
 * /auth/login/student:
 *   post:
 *     tags: [Auth]
 *     summary: Login — Student Portal
 *     description: Students login using admission number and last name
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginStudentInput'
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Student not found or surname mismatch
 *
 * /auth/login/parent:
 *   post:
 *     tags: [Auth]
 *     summary: Login — Parent Portal
 *     description: Parents login using phone number and surname. Returns linked students.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginParentInput'
 *     responses:
 *       200:
 *         description: Login successful — includes linkedStudents array
 *       401:
 *         description: Parent not found or surname mismatch
 *
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current logged in user
 *     description: |
 *       Returns full profile. Teachers also get assignedClasses and assignedSubjects.
 *       Parents also get linkedStudents.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile returned
 *       401:
 *         description: Unauthorized
 *
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout
 *     description: Blacklists the current JWT token in Redis for 7 days
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *
 * /auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change password
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Current password is incorrect
 *
 * /auth/verify-email:
 *   post:
 *     tags: [Auth]
 *     summary: Verify email with OTP
 *     description: OTP expires in 10 minutes. Max 5 attempts before OTP is invalidated.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *                 example: '482910'
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Incorrect OTP
 *       410:
 *         description: OTP expired
 *       429:
 *         description: Too many attempts
 *
 * /auth/resend-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Resend email verification OTP
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: OTP resent
 *       400:
 *         description: Email already verified
 */

export {};