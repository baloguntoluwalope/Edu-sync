import dayjs from 'dayjs';
import { User } from '../../shared/models/User';
import { Attendance } from '../../shared/models/Attendance';
import { CBTSubmission } from '../../shared/models/CBTSubmission';
import { Submission } from '../../shared/models/Submission';
import { Notification } from '../../shared/models/Notification';
import { AuditLog } from '../../shared/models/AuditLog';
import { Subscription } from '../../shared/models/Subscription';
import { Branch } from '../../shared/models/Branch';
import { redisCacheOrFetch } from '../../config/redis';

export const getAdminDashboard = async (schoolId: string, branchId: string) => {
  const today = dayjs().format('YYYY-MM-DD');
  const cacheKey = `dashboard:admin:${branchId}:${today}`;

  return redisCacheOrFetch(cacheKey, 300, async () => {
    const [
      totalStudents, totalTeachers, totalParents,
      todayPresent, todayAbsent, todayLate,
      recentNotifications, recentAuditLogs,
      activeSubscription,
    ] = await Promise.all([
      User.countDocuments({ schoolId, branchId, role: 'student', isActive: true }),
      User.countDocuments({ schoolId, branchId, role: 'teacher', isActive: true }),
      User.countDocuments({ schoolId, branchId, role: 'parent', isActive: true }),
      Attendance.countDocuments({ schoolId, branchId, date: today, status: 'present' }),
      Attendance.countDocuments({ schoolId, branchId, date: today, status: 'absent' }),
      Attendance.countDocuments({ schoolId, branchId, date: today, status: 'late' }),
      Notification.find({ schoolId }).sort({ createdAt: -1 }).limit(10).lean(),
      AuditLog.find({ schoolId, branchId }).sort({ createdAt: -1 }).limit(20).lean(),
      Subscription.findOne({ schoolId, status: 'paid' }).sort({ expiresAt: -1 }).lean(),
    ]);

    return {
      stats: {
        totalStudents, totalTeachers, totalParents,
        todayAttendance: { present: todayPresent, absent: todayAbsent, late: todayLate },
      },
      subscription: activeSubscription,
      recentNotifications,
      recentAuditLogs,
    };
  });
};

export const getTeacherDashboard = async (schoolId: string, branchId: string, teacherId: string) => {
  const today = dayjs().format('YYYY-MM-DD');
  const [todayAttendance, pendingGrading, unreadNotifications] = await Promise.all([
    Attendance.countDocuments({ schoolId, branchId, teacherId, date: today }),
    Submission.countDocuments({ schoolId, branchId, status: 'submitted' }),
    Notification.countDocuments({ schoolId, recipientId: teacherId, isRead: false }),
  ]);
  const recentNotifications = await Notification.find({ schoolId, recipientId: teacherId })
    .sort({ createdAt: -1 }).limit(10).lean();

  return { todayAttendance, pendingGrading, unreadNotifications, recentNotifications };
};

export const getStudentPortal = async (schoolId: string, branchId: string, studentId: string) => {
  const [recentAttendance, pendingAssignments, notifications, summary] = await Promise.all([
    Attendance.find({ schoolId, branchId, studentId })
      .sort({ date: -1 }).limit(10).lean(),
    Submission.find({ schoolId, branchId, studentId, status: { $in: ['pending', 'submitted'] } })
      .populate('resourceId', 'title deadline isAssignment').lean(),
    Notification.find({ schoolId, recipientId: studentId, isRead: false })
      .sort({ createdAt: -1 }).limit(10).lean(),
    Attendance.aggregate([
      { $match: { schoolId, studentId, synced: true } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  return { recentAttendance, pendingAssignments, notifications, attendanceSummary: summary };
};

export const getParentPortal = async (schoolId: string, branchId: string, parentId: string) => {
  const parent = await User.findById(parentId).select('linkedStudents firstName');
  const studentIds = parent?.linkedStudents || [];

  const [attendanceRecords, notifications] = await Promise.all([
    Attendance.find({ schoolId, branchId, studentId: { $in: studentIds } })
      .populate('studentId', 'firstName lastName admissionNumber')
      .sort({ date: -1 }).limit(20).lean(),
    Notification.find({ schoolId, recipientId: parentId, isRead: false })
      .sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  return { attendanceRecords, notifications, linkedStudentCount: studentIds.length };
};