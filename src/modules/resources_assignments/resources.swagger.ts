/**
 * @swagger
 * /resources:
 *   post:
 *     tags: [Resources & Assignments]
 *     summary: Upload a resource or assignment
 *     description: Notifies all students in the class
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, classId]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               classId: { type: string }
 *               subjectId: { type: string }
 *               fileUrl: { type: string }
 *               fileType:
 *                 type: string
 *                 enum: [pdf, doc, video, link, image, other]
 *               externalLink: { type: string }
 *               isAssignment: { type: boolean, default: false }
 *               deadline: { type: string, format: date-time }
 *     responses:
 *       201:
 *         description: Resource uploaded
 *   get:
 *     tags: [Resources & Assignments]
 *     summary: List resources
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: classId
 *         schema: { type: string }
 *       - in: query
 *         name: isAssignment
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Resource list
 *
 * /resources/submit:
 *   post:
 *     tags: [Resources & Assignments]
 *     summary: Student submits assignment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resourceId]
 *             properties:
 *               resourceId: { type: string }
 *               fileUrl: { type: string }
 *               note: { type: string }
 *     responses:
 *       200:
 *         description: Assignment submitted
 *
 * /resources/grade:
 *   patch:
 *     tags: [Resources & Assignments]
 *     summary: Teacher grades a submission
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [submissionId, grade]
 *             properties:
 *               submissionId: { type: string }
 *               grade: { type: number }
 *               feedback: { type: string }
 *     responses:
 *       200:
 *         description: Submission graded
 */
export {};