/**
 * @swagger
 * /attendance/qr-scan:
 *   post:
 *     tags: [Attendance]
 *     summary: Process a QR code scan
 *     description: |
 *       Works for ALL attendee types — students, teachers, non-teaching staff, and admins.
 *       First scan = sign in. Second scan = sign out.
 *       Students automatically get a late status if scanned after 8:00 AM.
 *       Staff/teachers get late status if scanned after 9:00 AM.
 *       Parents are notified automatically when a student is absent or late.
 *       Supports both online and offline modes.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [qrData]
 *             properties:
 *               qrData:
 *                 type: string
 *                 description: Raw JSON string from QR code scan
 *               sessionType:
 *                 type: string
 *                 enum: [morning, afternoon, general]
 *                 default: morning
 *     responses:
 *       200:
 *         description: Attendance recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 action:
 *                   type: string
 *                   enum: [sign_in, sign_out, already_recorded]
 *                 name: { type: string }
 *                 type: { type: string }
 *                 status: { type: string }
 *                 isLate: { type: boolean }
 *                 message: { type: string }
 *
 * /attendance/manual:
 *   post:
 *     tags: [Attendance]
 *     summary: Mark attendance manually for multiple people
 *     description: |
 *       Mark attendance without QR code. Works for students, teachers, staff and admins.
 *       Parents are notified for absent/late students.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, records]
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 example: '2025-01-15'
 *               sessionType:
 *                 type: string
 *                 enum: [morning, afternoon, general]
 *                 default: morning
 *               records:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [attendeeId, attendeeType, status]
 *                   properties:
 *                     attendeeId: { type: string, description: User._id or Staff._id }
 *                     attendeeType:
 *                       type: string
 *                       enum: [student, teacher, staff, admin]
 *                     status:
 *                       type: string
 *                       enum: [present, absent, late]
 *                     note: { type: string }
 *     responses:
 *       200:
 *         description: Attendance marked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 marked: { type: integer }
 *                 skipped: { type: integer }
 *                 errors: { type: array }
 *
 * /attendance/sign-out:
 *   post:
 *     tags: [Attendance]
 *     summary: Manually sign out one person
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [attendeeId, date]
 *             properties:
 *               attendeeId: { type: string }
 *               date: { type: string, format: date }
 *               sessionType:
 *                 type: string
 *                 enum: [morning, afternoon, general]
 *     responses:
 *       200:
 *         description: Signed out
 *
 * /attendance/sync:
 *   post:
 *     tags: [Attendance]
 *     summary: Sync offline attendance records (QR and manual)
 *     description: |
 *       Deduplicates using offlineId. Supports both offline QR scans and offline manual records.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               records:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [offlineId, date, method]
 *                   properties:
 *                     offlineId: { type: string, description: Unique offline identifier }
 *                     date: { type: string, format: date }
 *                     sessionType: { type: string }
 *                     method:
 *                       type: string
 *                       enum: [offline_qr, offline_manual]
 *                     qrData: { type: string, description: For offline_qr }
 *                     attendeeId: { type: string, description: For offline_manual }
 *                     attendeeType: { type: string }
 *                     status: { type: string }
 *                     note: { type: string }
 *     responses:
 *       200:
 *         description: Records synced
 *
 * /attendance/session:
 *   get:
 *     tags: [Attendance]
 *     summary: Get full attendance session for a date
 *     description: Returns all entries with sign-in/sign-out times for every attendee type
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: sessionType
 *         schema: { type: string, enum: [morning, afternoon, general] }
 *     responses:
 *       200:
 *         description: Session with all entries and totals
 *
 * /attendance/session/lock:
 *   post:
 *     tags: [Attendance]
 *     summary: Lock attendance session (prevents further edits)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, sessionType]
 *             properties:
 *               date: { type: string, format: date }
 *               sessionType: { type: string }
 *     responses:
 *       200:
 *         description: Session locked
 *
 * /attendance/summary:
 *   get:
 *     tags: [Attendance]
 *     summary: Attendance summary for a date range
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: attendeeType
 *         schema: { type: string, enum: [student, teacher, staff, admin] }
 *         description: Filter by type. Omit for all.
 *     responses:
 *       200:
 *         description: Daily breakdown of present/absent/late/signedOut
 *
 * /attendance/{attendeeId}/history:
 *   get:
 *     tags: [Attendance]
 *     summary: Get attendance history for one person
 *     description: Works for any attendee type — student, teacher, staff or admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attendeeId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: month
 *         schema: { type: string, example: '2025-01' }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Records with present/absent/late summary and percentage
 */

export {};