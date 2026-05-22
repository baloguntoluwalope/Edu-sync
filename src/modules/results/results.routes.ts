import { Router } from 'express';
import * as ctrl from './results.controller';
import { authenticate } from '../../shared/middlewares/authenticate';
import { authorize } from '../../shared/middlewares/authorize';
import { tenantGuard } from '../../shared/middlewares/tenantGuard';
import { resultTokenLimiter, generalLimiter } from '../../shared/middlewares/rateLimiter';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES — No auth needed
// Anyone with a valid token can view or download
// ─────────────────────────────────────────────────────────────────────────────

// View result via token (outsiders, shared links)
router.get('/view', generalLimiter, ctrl.viewByToken);

// Parent checks result status using admission number (no login)
router.get('/check', generalLimiter, ctrl.viewByAdmission);

// Download PDF by token (must be paid)
router.get('/download', resultTokenLimiter, ctrl.downloadPDFByToken);

// ─────────────────────────────────────────────────────────────────────────────
// PROTECTED ROUTES — All require auth
// ─────────────────────────────────────────────────────────────────────────────
router.use(authenticate, tenantGuard);

// ─────────────────────────────────────────────────────────────────────────────
// PARENT ROUTES
// Parents must be logged in to generate tokens and view their child's result
// ─────────────────────────────────────────────────────────────────────────────

// Parent generates token using child admission number + last name
router.post(
  '/parent/token',
  authorize('parent'),
  resultTokenLimiter,
  ctrl.parentGenerateToken
);

// Parent views result with their token (validates parent is linked to student)
router.get(
  '/parent/view',
  authorize('parent'),
  ctrl.parentViewByToken
);

// Parent downloads PDF (validates parent is linked to student)
router.get(
  '/parent/download',
  authorize('parent'),
  resultTokenLimiter,
  ctrl.parentDownloadPDF
);

// ─────────────────────────────────────────────────────────────────────────────
// SCORE ENTRY — Teachers and admins
// ─────────────────────────────────────────────────────────────────────────────

// Single subject for one student
router.post(
  '/',
  authorize('teacher', 'schooladmin'),
  ctrl.upsert
);

// All subjects for one student at once
// body: { studentId, classId, term, session,
//         subjects: [{ subjectId, ca1, ca2, exam }] }
router.post(
  '/bulk-student',
  authorize('teacher', 'schooladmin'),
  ctrl.bulkSubjectsForStudent
);

// All students in a class for one subject at once
// body: { classId, subjectId, term, session,
//         entries: [{ studentId, ca1, ca2, exam }] }
router.post(
  '/bulk-class',
  authorize('teacher', 'schooladmin'),
  ctrl.bulkInputForClass
);

// ─── Extras (comments, traits, attendance) ────────────────────────────────────
router.patch(
  '/extras',
  authorize('teacher', 'schooladmin'),
  ctrl.updateExtras
);

// ─────────────────────────────────────────────────────────────────────────────
// COMPUTE & PUBLISH — Admin only
// ─────────────────────────────────────────────────────────────────────────────

// Compute class positions + subject positions after all scores are entered
router.post(
  '/compute-positions',
  authorize('schooladmin', 'teacher'),
  ctrl.computePositions
);

// Publish results for one class
router.post(
  '/publish/class',
  authorize('schooladmin'),
  ctrl.publishForClass
);

// Publish results for entire school (all classes)
router.post(
  '/publish/school',
  authorize('schooladmin'),
  ctrl.publishForSchool
);

// ─────────────────────────────────────────────────────────────────────────────
// TOKENS — Admin only
// ─────────────────────────────────────────────────────────────────────────────

// Generate token for one student
router.post(
  '/token',
  authorize('schooladmin'),
  resultTokenLimiter,
  ctrl.generateSingleToken
);

// Bulk generate tokens for all paid+published results in a class or school
router.post(
  '/tokens/bulk',
  authorize('schooladmin'),
  ctrl.bulkGenerateTokens
);

// List all tokens for a term/session
router.get(
  '/tokens',
  authorize('schooladmin'),
  ctrl.getAllTokens
);

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT — Admin only
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/mark-paid', authorize('schooladmin'), ctrl.markPaid);
router.patch('/mark-paid/bulk', authorize('schooladmin'), ctrl.bulkMarkPaid);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN VIEWS — No token required
// ─────────────────────────────────────────────────────────────────────────────

// Admin views single result
router.get(
  '/admin/view',
  authorize('schooladmin', 'teacher'),
  ctrl.adminView
);

// Admin lists all results for a class
router.get(
  '/admin/class',
  authorize('schooladmin', 'teacher'),
  ctrl.listForClass
);

// Admin downloads PDF for any student
router.get(
  '/admin/download',
  authorize('schooladmin'),
  ctrl.downloadPDFAdmin
);

// All 3 terms for one student
router.get(
  '/student/:studentId/full',
  authorize('schooladmin', 'teacher'),
  ctrl.studentFullResult
);

export default router;

// import { Router } from 'express';
// import * as ctrl from './results.controller';
// import { authenticate } from '../../shared/middlewares/authenticate';
// import { authorize } from '../../shared/middlewares/authorize';
// import { tenantGuard } from '../../shared/middlewares/tenantGuard';
// import { resultTokenLimiter } from '../../shared/middlewares/rateLimiter';

// const router = Router();
// router.use(authenticate, tenantGuard);

// // ─── Enter scores ─────────────────────────────────────────────────────────────
// router.post('/', authorize('teacher', 'schooladmin'), ctrl.upsert);
// router.post('/bulk', authorize('teacher', 'schooladmin'), ctrl.bulkUpsert);

// // ─── Update comments, affective, psychomotor, attendance ──────────────────────
// router.patch('/extras', authorize('teacher', 'schooladmin'), ctrl.updateExtras);

// // ─── Admin actions ────────────────────────────────────────────────────────────
// router.post('/compute-positions', authorize('schooladmin'), ctrl.computePositions);
// router.patch('/mark-paid', authorize('schooladmin'), ctrl.markPaid);
// router.post('/publish', authorize('schooladmin'), ctrl.publishResults);

// // ─── Token & view ─────────────────────────────────────────────────────────────
// router.post('/token', resultTokenLimiter, ctrl.generateToken);
// router.get('/view', ctrl.viewResult);
// router.get('/download', ctrl.downloadResult);

// // ─── Student full 3-term result ───────────────────────────────────────────────
// router.get('/student/:studentId/full', authorize('schooladmin', 'teacher'), ctrl.studentFullResult);

// export default router;