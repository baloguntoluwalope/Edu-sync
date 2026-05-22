/**
 * @swagger
 * /dashboard/admin:
 *   get:
 *     tags: [Dashboard]
 *     summary: School admin dashboard
 *     description: |
 *       Stats cached in Redis for 5 minutes.
 *       Returns: student/teacher/parent counts, today's attendance, recent notifications, audit logs, subscription status.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin dashboard data
 *
 * /dashboard/teacher:
 *   get:
 *     tags: [Dashboard]
 *     summary: Teacher dashboard
 *     description: Today's attendance count, pending grading, unread notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Teacher dashboard data
 *
 * /dashboard/student:
 *   get:
 *     tags: [Dashboard]
 *     summary: Student portal dashboard
 *     description: Recent attendance, pending assignments, unread notifications, attendance summary
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student portal data
 *
 * /dashboard/parent:
 *   get:
 *     tags: [Dashboard]
 *     summary: Parent portal dashboard
 *     description: Attendance records for all linked students, unread notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Parent portal data
 *
 * /superadmin/overview:
 *   get:
 *     tags: [SuperAdmin]
 *     summary: Full platform overview
 *     description: |
 *       Cached 2 minutes. Returns:
 *       - School counts by status (active/trial/expired/suspended)
 *       - User counts by role
 *       - Today's activity (attendance, CBT)
 *       - Revenue (this month vs last month + growth %)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform overview
 *
 * /superadmin/health:
 *   get:
 *     tags: [SuperAdmin]
 *     summary: System health check
 *     description: DB ping, Redis ping, memory usage, uptime, Node version
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System health status
 *
 * /superadmin/schools:
 *   get:
 *     tags: [SuperAdmin]
 *     summary: List all schools on the platform
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [trial, active, expired, suspended] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paginated schools list
 *
 * /superadmin/schools/{schoolId}/suspend:
 *   patch:
 *     tags: [SuperAdmin]
 *     summary: Suspend a school
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: schoolId
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
 *         description: School suspended
 *
 * /superadmin/schools/{schoolId}/extend-trial:
 *   patch:
 *     tags: [SuperAdmin]
 *     summary: Extend school trial period
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: schoolId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [days]
 *             properties:
 *               days: { type: integer, example: 30 }
 *     responses:
 *       200:
 *         description: Trial extended
 *
 * /superadmin/schools/{schoolId}/manual-pay:
 *   post:
 *     tags: [SuperAdmin]
 *     summary: Manually activate a school subscription (offline payment)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: schoolId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [plan]
 *             properties:
 *               plan: { type: string, enum: [monthly, termly, annual] }
 *               reference: { type: string }
 *     responses:
 *       200:
 *         description: Subscription activated
 *
 * /superadmin/email/templates:
 *   post:
 *     tags: [SuperAdmin]
 *     summary: Create email template
 *     description: Templates support {{variable}} syntax for dynamic content
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, subject, bodyHtml]
 *             properties:
 *               name: { type: string, example: 'Trial Expiry Warning' }
 *               description: { type: string }
 *               subject: { type: string, example: 'Your trial expires in {{daysLeft}} days' }
 *               bodyHtml: { type: string }
 *               variables:
 *                 type: array
 *                 items: { type: string }
 *                 example: ['daysLeft', 'schoolName']
 *     responses:
 *       201:
 *         description: Template created
 *
 *   get:
 *     tags: [SuperAdmin]
 *     summary: List all email templates
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Template list
 *
 * /superadmin/email/broadcast:
 *   post:
 *     tags: [SuperAdmin]
 *     summary: Send email broadcast to target audience
 *     description: |
 *       Sends in batches of 10 with 500ms delay between batches.
 *       Targets: all_schools, active_schools, trial_schools, expired_schools,
 *       specific_schools, all_admins, all_teachers, all_parents
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subject, bodyHtml, target]
 *             properties:
 *               subject: { type: string }
 *               bodyHtml: { type: string }
 *               target:
 *                 type: string
 *                 enum: [all_schools, active_schools, trial_schools, expired_schools, specific_schools, all_admins, all_teachers, all_parents]
 *               targetSchoolIds:
 *                 type: array
 *                 items: { type: string }
 *                 description: Required if target is specific_schools
 *     responses:
 *       200:
 *         description: Broadcast sent
 *
 * /superadmin/platform/settings:
 *   get:
 *     tags: [SuperAdmin]
 *     summary: Get EduSync platform settings
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform settings
 *
 *   patch:
 *     tags: [SuperAdmin]
 *     summary: Update EduSync platform settings
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               platformName: { type: string }
 *               supportEmail: { type: string, format: email }
 *               supportPhone: { type: string }
 *               tagline: { type: string }
 *               primaryColor: { type: string, example: '#1a56db' }
 *     responses:
 *       200:
 *         description: Settings updated
 *
 * /superadmin/platform/logo:
 *   post:
 *     tags: [SuperAdmin]
 *     summary: Upload EduSync platform logo
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
 *     responses:
 *       200:
 *         description: Logo uploaded
 *   delete:
 *     tags: [SuperAdmin]
 *     summary: Remove EduSync platform logo
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logo removed
 */

export {};