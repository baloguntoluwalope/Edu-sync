/**
 * @swagger
 * /cbt/active:
 *   get:
 *     tags: [CBT]
 *     summary: Get all currently active exams for a class
 *     description: |
 *       Returns all published exams that are currently within their time window.
 *       Multiple exams can be active simultaneously for the same class.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: classId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of active exams
 *
 * /cbt:
 *   post:
 *     tags: [CBT]
 *     summary: Create a CBT exam
 *     description: |
 *       Multiple exams can be created and run simultaneously.
 *       Set startsAt and endsAt to control the exam window.
 *       If no window is set, the exam is available any time after publishing.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCBTExamInput'
 *     responses:
 *       201:
 *         description: Exam created
 *
 * /cbt/{id}/publish:
 *   patch:
 *     tags: [CBT]
 *     summary: Publish exam
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Exam published
 *
 * /cbt/{id}/take:
 *   get:
 *     tags: [CBT]
 *     summary: Student takes exam
 *     description: |
 *       Validates exam window (startsAt/endsAt). Returns shuffled questions without correct answers.
 *       Works online and offline — download questions for offline use.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Exam questions (answers hidden)
 *       400:
 *         description: Exam not started yet or already ended
 *
 * /cbt/{id}/results:
 *   get:
 *     tags: [CBT]
 *     summary: Get all submissions for an exam
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Submissions list
 *
 * /cbt/submit:
 *   post:
 *     tags: [CBT]
 *     summary: Submit exam answers
 *     description: Auto-marks, calculates score, notifies teachers and admin.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [examId, answers]
 *             properties:
 *               examId: { type: string }
 *               answers:
 *                 type: object
 *                 additionalProperties: { type: integer }
 *               timeTakenSeconds: { type: integer }
 *               offlineId: { type: string }
 *     responses:
 *       200:
 *         description: Score returned
 *       409:
 *         description: Already submitted
 *
 * /cbt/sync:
 *   post:
 *     tags: [CBT]
 *     summary: Sync offline CBT submissions
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               submissions:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Submissions synced
 */

/**
 * @swagger
 * /cbt/{id}/upload-questions:
 *   post:
 *     tags: [CBT]
 *     summary: Upload questions from PDF or DOCX file
 *     description: |
 *       Parses a PDF or Word document and extracts questions automatically.
 *
 *       **Required document format:**
 *       ```
 *       Q1. What is 2 + 2?
 *       A) 2
 *       B) 3
 *       C) 4*
 *       D) 5
 *
 *       Q2. What is the capital of Nigeria?
 *       A) Kano
 *       B) Abuja*
 *       C) Lagos
 *       D) Ibadan
 *       ```
 *       - Mark correct answer with * e.g. `C) 4*`
 *       - Or add `ANSWER: C` on its own line after the options
 *       - Options can use A) A. (A) a) formats
 *       - Cannot upload to a published exam
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Exam ID
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [questions]
 *             properties:
 *               questions:
 *                 type: string
 *                 format: binary
 *                 description: PDF or DOCX file containing questions
 *               marksPerQuestion:
 *                 type: integer
 *                 default: 1
 *                 description: Marks to assign to each question
 *               appendToExisting:
 *                 type: boolean
 *                 default: false
 *                 description: If true, adds to existing questions. If false, replaces all questions.
 *     responses:
 *       200:
 *         description: Questions parsed and added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 questionsAdded: { type: integer }
 *                 totalQuestions: { type: integer }
 *                 questions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       index: { type: integer }
 *                       text: { type: string }
 *                       optionCount: { type: integer }
 *                       correctIndex: { type: integer }
 *                       marks: { type: integer }
 *                 message: { type: string }
 *       400:
 *         description: No questions found or invalid format
 *       403:
 *         description: Exam is already published
 */



export {};