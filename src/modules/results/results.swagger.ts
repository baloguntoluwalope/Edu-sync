/**
 * @swagger
 * /results:
 *   post:
 *     tags: [Results]
 *     summary: Enter single subject score for one student
 *     description: Nigerian standard — CA1(20) + CA2(20) + Exam(60) = 100. Cumulative auto-calculated.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpsertResultInput'
 *     responses:
 *       200:
 *         description: Score saved
 *
 * /results/bulk-student:
 *   post:
 *     tags: [Results]
 *     summary: Enter ALL subjects for ONE student at once
 *     description: Most efficient for entering one student's complete term results
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkStudentResultInput'
 *     responses:
 *       200:
 *         description: All subjects saved for this student
 *
 * /results/bulk-class:
 *   post:
 *     tags: [Results]
 *     summary: Enter ONE subject scores for ALL students in a class
 *     description: Most efficient for subject teachers entering scores for their whole class
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkClassResultInput'
 *     responses:
 *       200:
 *         description: Scores saved for class
 *
 * /results/compute-positions:
 *   post:
 *     tags: [Results]
 *     summary: Compute class positions and subject rankings
 *     description: |
 *       Run AFTER all scores for a class/term/session are entered.
 *       Computes overall position, subject positions, class averages,
 *       highest/lowest in class for every student.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [classId, term, session]
 *             properties:
 *               classId: { type: string }
 *               term: { type: string, enum: [first, second, third] }
 *               session: { type: string, example: '2024/2025' }
 *     responses:
 *       200:
 *         description: Positions computed
 *
 * /results/publish/class:
 *   post:
 *     tags: [Results]
 *     summary: Publish results for one class
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [classId, term, session]
 *             properties:
 *               classId: { type: string }
 *               term: { type: string, enum: [first, second, third] }
 *               session: { type: string }
 *     responses:
 *       200:
 *         description: Results published for class
 *
 * /results/publish/school:
 *   post:
 *     tags: [Results]
 *     summary: Publish results for all classes in school
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [term, session]
 *             properties:
 *               term: { type: string, enum: [first, second, third] }
 *               session: { type: string }
 *     responses:
 *       200:
 *         description: All results published
 *
 * /results/mark-paid:
 *   patch:
 *     tags: [Results]
 *     summary: Mark one student result as paid
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, term, session]
 *             properties:
 *               studentId: { type: string }
 *               term: { type: string }
 *               session: { type: string }
 *     responses:
 *       200:
 *         description: Marked as paid
 *
 * /results/mark-paid/bulk:
 *   patch:
 *     tags: [Results]
 *     summary: Bulk mark results as paid (class or whole school)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [term, session]
 *             properties:
 *               term: { type: string }
 *               session: { type: string }
 *               classId: { type: string, description: 'Omit to mark all classes' }
 *     responses:
 *       200:
 *         description: Results marked as paid
 *
 * /results/token:
 *   post:
 *     tags: [Results]
 *     summary: Generate token for one student (admin)
 *     description: Result must be published and paid. Emails token to linked parents.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, term, session]
 *             properties:
 *               studentId: { type: string }
 *               term: { type: string }
 *               session: { type: string }
 *     responses:
 *       200:
 *         description: Token generated
 *       402:
 *         description: Result not paid
 *
 * /results/tokens/bulk:
 *   post:
 *     tags: [Results]
 *     summary: Bulk generate tokens for all paid+published results
 *     description: Emails each parent their token automatically
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [term, session]
 *             properties:
 *               term: { type: string }
 *               session: { type: string }
 *               classId: { type: string, description: 'Omit to generate for all classes' }
 *     responses:
 *       200:
 *         description: Tokens generated and emailed
 *
 * /results/tokens:
 *   get:
 *     tags: [Results]
 *     summary: List all generated tokens (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: term
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: session
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: classId
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Token list
 *
 * /results/parent/token:
 *   post:
 *     tags: [Results]
 *     summary: Parent generates token using child's admission number
 *     description: |
 *       Parent must be logged in. Validates:
 *       - Parent is linked to the student
 *       - Result is published
 *       - Result is paid
 *       Returns existing token if already generated.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [admissionNumber, studentLastName, term, session]
 *             properties:
 *               admissionNumber:
 *                 type: string
 *                 example: STU-24-ABC12
 *               studentLastName:
 *                 type: string
 *                 example: Balogun
 *               term:
 *                 type: string
 *                 enum: [first, second, third]
 *               session:
 *                 type: string
 *                 example: '2024/2025'
 *     responses:
 *       200:
 *         description: Token generated or retrieved
 *       402:
 *         description: Result not paid
 *       403:
 *         description: Not linked to this student
 *       404:
 *         description: Student or result not found
 *
 * /results/parent/view:
 *   get:
 *     tags: [Results]
 *     summary: Parent views result using token (validates ownership)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Full result data + subject names
 *       403:
 *         description: Token does not belong to your child
 *
 * /results/parent/download:
 *   get:
 *     tags: [Results]
 *     summary: Parent downloads result PDF using token
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *
 * /results/view:
 *   get:
 *     tags: [Results]
 *     summary: Public view result by token (outsiders/shared links)
 *     security: []
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Full result
 *       404:
 *         description: Invalid token
 *
 * /results/check:
 *   get:
 *     tags: [Results]
 *     summary: Check result payment status by admission number (no login needed)
 *     security: []
 *     parameters:
 *       - in: query
 *         name: schoolId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: branchId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: admissionNumber
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: term
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: session
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Returns isPaid status. If paid, returns full result + token.
 *
 * /results/download:
 *   get:
 *     tags: [Results]
 *     summary: Public download result PDF by token
 *     security: []
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: PDF download
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       402:
 *         description: Result not paid
 *
 * /results/admin/view:
 *   get:
 *     tags: [Results]
 *     summary: Admin views result without token
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: studentId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: term
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: session
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Full result data
 *
 * /results/admin/class:
 *   get:
 *     tags: [Results]
 *     summary: Admin lists all results for a class
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: classId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: term
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: session
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Class result summary list
 *
 * /results/admin/download:
 *   get:
 *     tags: [Results]
 *     summary: Admin downloads any student result PDF (no token needed)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: studentId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: term
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: session
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *
 * /results/extras:
 *   patch:
 *     tags: [Results]
 *     summary: Update result extras
 *     description: Comments, affective domain, psychomotor skills, attendance record, promotion status
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, term, session]
 *             properties:
 *               studentId: { type: string }
 *               term: { type: string }
 *               session: { type: string }
 *               academicAdviserComment: { type: string }
 *               formMasterComment: { type: string }
 *               principalComment: { type: string }
 *               classTeacherName: { type: string }
 *               promotionStatus:
 *                 type: string
 *                 enum: [promoted, repeated, pending]
 *               nextTermBegins: { type: string, example: '05-Jan-2026' }
 *               termEndDate: { type: string, example: '12-Dec-2025' }
 *               daysSchoolOpened: { type: integer }
 *               daysPresent: { type: integer }
 *               daysAbsent: { type: integer }
 *               affectiveDomain:
 *                 type: object
 *                 description: All fields rated 1-5
 *                 properties:
 *                   punctuality: { type: integer, minimum: 1, maximum: 5 }
 *                   mentalAlertness: { type: integer, minimum: 1, maximum: 5 }
 *                   behavior: { type: integer, minimum: 1, maximum: 5 }
 *                   reliability: { type: integer, minimum: 1, maximum: 5 }
 *                   attentiveness: { type: integer, minimum: 1, maximum: 5 }
 *                   respect: { type: integer, minimum: 1, maximum: 5 }
 *                   neatness: { type: integer, minimum: 1, maximum: 5 }
 *                   politeness: { type: integer, minimum: 1, maximum: 5 }
 *                   honesty: { type: integer, minimum: 1, maximum: 5 }
 *                   relationshipWithStaff: { type: integer, minimum: 1, maximum: 5 }
 *                   relationshipWithStudents: { type: integer, minimum: 1, maximum: 5 }
 *                   attitudeToSchool: { type: integer, minimum: 1, maximum: 5 }
 *                   selfControl: { type: integer, minimum: 1, maximum: 5 }
 *                   spiritOfTeamwork: { type: integer, minimum: 1, maximum: 5 }
 *                   initiatives: { type: integer, minimum: 1, maximum: 5 }
 *                   organizationalAbility: { type: integer, minimum: 1, maximum: 5 }
 *               psychomotor:
 *                 type: object
 *                 description: All fields rated 1-5
 *                 properties:
 *                   handwriting: { type: integer, minimum: 1, maximum: 5 }
 *                   reading: { type: integer, minimum: 1, maximum: 5 }
 *                   verbalFluencyDiction: { type: integer, minimum: 1, maximum: 5 }
 *                   musicalSkills: { type: integer, minimum: 1, maximum: 5 }
 *                   creativeArts: { type: integer, minimum: 1, maximum: 5 }
 *                   physicalEducation: { type: integer, minimum: 1, maximum: 5 }
 *                   generalReasoning: { type: integer, minimum: 1, maximum: 5 }
 *     responses:
 *       200:
 *         description: Extras updated
 */

export {};