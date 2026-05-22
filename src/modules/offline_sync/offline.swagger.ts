/**
 * @swagger
 * /offline/attendance:
 *   post:
 *     tags: [Offline Sync]
 *     summary: Sync offline attendance records
 *     description: Deduplicates by offlineId and studentId+date
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
 *     responses:
 *       200:
 *         description: Records synced
 *
 * /offline/cbt:
 *   post:
 *     tags: [Offline Sync]
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
export {};