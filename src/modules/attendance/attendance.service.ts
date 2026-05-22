import dayjs from 'dayjs';
import { AttendanceSession, IAttendanceEntry } from '../../shared/models/AttendanceSession';
import { User } from '../../shared/models/User';
import { Staff } from '../../shared/models/Staff';
import { Branch } from '../../shared/models/Branch';
import { Class } from '../../shared/models/Class';
import { ApiError } from '../../shared/utils/ApiError';
import { logAudit } from '../../shared/utils/auditLogger';
import { sendNotification } from '../notifications/notification.service';
import { parseQRCode } from '../../shared/utils/qrCodeGenerator';
import { attendanceAlertTemplate } from '../../shared/utils/emailTemplates';
import { getPagination, paginatedResponse } from '../../shared/utils/pagination';
import { env } from '../../config/env'; // Adjust the path to match where your env.ts is located
// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const updateSessionTotals = async (sessionId: string) => {
  const session = await AttendanceSession.findById(sessionId);
  if (!session) return;

  const counts = session.entries.reduce(
    (acc, e) => {
      if (e.status === 'present') acc.present++;
      else if (e.status === 'absent') acc.absent++;
      else if (e.status === 'late') acc.late++;
      else if (e.status === 'signed_out') acc.signedOut++;
      return acc;
    },
    { present: 0, absent: 0, late: 0, signedOut: 0 }
  );

  session.totalPresent = counts.present;
  session.totalAbsent = counts.absent;
  session.totalLate = counts.late;
  session.totalSignedOut = counts.signedOut;
  await session.save();
};
// ─────────────────────────────────────────────────────────────────────────────
// NOTIFY PARENTS — Called for ALL attendance statuses
// Email for all statuses. SMS only for absent.
// ─────────────────────────────────────────────────────────────────────────────
const notifyParents = async (
  schoolId: string,
  branchId: string,
  studentId: string,
  studentName: string,
  studentClass: string,
  status: string,
  date: string,
  signInTime: Date | undefined,
  branchName: string,
  branchLogoUrl?: string
) => {
  const parents = await User.find({
    linkedStudents: studentId,
    role: 'parent',
    isActive: true,
  }).select('_id firstName email phone notificationPrefs').lean();

  if (!parents.length) return;

  // ─── Build status-specific message ──────────────────────────────────────
  const statusMessages: Record<string, { title: string; body: string; emoji: string }> = {
    present: {
      emoji: '✅',
      title: `${studentName} arrived at school`,
      body: `Your ward ${studentName} has been marked PRESENT at ${branchName} on ${date}${signInTime ? ` at ${new Date(signInTime).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}` : ''}.`,
    },
    late: {
      emoji: '⚠️',
      title: `${studentName} arrived late to school`,
      body: `Your ward ${studentName} arrived LATE at ${branchName} on ${date}${signInTime ? ` at ${new Date(signInTime).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}` : ''}. Please ensure punctuality.`,
    },
    absent: {
      emoji: '❌',
      title: `${studentName} is absent from school today`,
      body: `Your ward ${studentName} has been marked ABSENT at ${branchName} on ${date}. If this is an error, please contact the school immediately.`,
    },
    signed_out: {
      emoji: '🚪',
      title: `${studentName} has left school`,
      body: `Your ward ${studentName} has signed out from ${branchName} on ${date}${signInTime ? ` at ${new Date(signInTime).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}` : ''}.`,
    },
  };

  const msg = statusMessages[status] || statusMessages.present;

  // ─── Build HTML email ────────────────────────────────────────────────────
  const statusColors: Record<string, string> = {
    present: '#16a34a',
    late: '#d97706',
    absent: '#dc2626',
    signed_out: '#6366f1',
  };

  const statusBg: Record<string, string> = {
    present: '#f0fdf4',
    late: '#fff7ed',
    absent: '#fff1f2',
    signed_out: '#eef2ff',
  };

  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Attendance Alert</title></head>
<body style="margin:0;padding:20px;background:#f8fafc;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1a56db 0%,#1e40af 100%);padding:24px 32px;text-align:center;">
      ${branchLogoUrl ? `<img src="${branchLogoUrl}" style="height:48px;border-radius:4px;margin-bottom:8px;display:block;margin:0 auto 8px;" alt="School Logo"/>` : ''}
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">${branchName}</h1>
      <p style="color:#bfdbfe;margin:4px 0 0;font-size:12px;">Attendance Notification</p>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <div style="background:${statusBg[status] || '#f0fdf4'};border-left:4px solid ${statusColors[status] || '#16a34a'};padding:20px;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <p style="font-size:28px;margin:0 0 8px;">${msg.emoji}</p>
        <h2 style="color:${statusColors[status] || '#16a34a'};margin:0 0 8px;font-size:16px;">${msg.title}</h2>
        <p style="color:#374151;margin:0;line-height:1.7;font-size:14px;">${msg.body}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:12px;width:40%;">Student</td>
          <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:12px;font-weight:600;">${studentName}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:12px;">Class</td>
          <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:12px;font-weight:600;">${studentClass || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:12px;">Status</td>
          <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
            <span style="background:${statusBg[status]};color:${statusColors[status]};padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;">${status.replace('_', ' ')}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#94a3b8;font-size:12px;">Date</td>
          <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#1e293b;font-size:12px;font-weight:600;">${date}</td>
        </tr>
        ${signInTime ? `
        <tr>
          <td style="padding:8px 0;color:#94a3b8;font-size:12px;">Time</td>
          <td style="padding:8px 0;color:#1e293b;font-size:12px;font-weight:600;">${new Date(signInTime).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}</td>
        </tr>` : ''}
      </table>

      ${status === 'absent' ? `
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin-top:24px;">
        <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
          ⚠️ <strong>Action Required:</strong> Your ward was marked absent today.
          If this was due to an illness or family emergency, please notify the school.
          Persistent absence may affect your child's academic progress.
        </p>
      </div>` : ''}
    </div>

    <!-- Footer -->
    <div style="background:#f1f5f9;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="color:#64748b;font-size:11px;margin:0;">
        This is an automated notification from EduSync · ${branchName}<br/>
        If you believe this is an error, please contact the school directly.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  for (const parent of parents) {
    // In-app notification — ALL statuses
    await sendNotification({
      schoolId,
      branchId,
      recipientId: (parent._id as any).toString(),
      type: 'attendance',
      title: `${msg.emoji} ${msg.title}`,
      body: msg.body,
      // Email — ALL statuses
      emailSubject: `${msg.emoji} Attendance Update — ${studentName} | ${branchName}`,
      emailHtml,
      metadata: { studentId, date, status, studentName },
    });

    // SMS — ONLY for absent (Termii)
    if (status === 'absent' && parent.notificationPrefs?.sms && parent.phone) {
      const smsBody = `${branchName}: ${studentName} is ABSENT on ${date}. Contact the school if this is an error.`;
      try {
        const axios = (await import('axios')).default;
        await axios.post('https://api.ng.termii.com/api/sms/send', {
          to: parent.phone,
          from: env.TERMII_SENDER_ID,
          sms: smsBody,
          type: 'plain',
          channel: 'generic',
          api_key: env.TERMII_API_KEY,
        });
      } catch {
        // Non-blocking
      }
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET OR CREATE SESSION
// ─────────────────────────────────────────────────────────────────────────────
const getOrCreateSession = async (
  schoolId: string,
  branchId: string,
  date: string,
  sessionType: string,
  actorId: string
) => {
  let session = await AttendanceSession.findOne({
    schoolId, branchId, date, sessionType,
  });

  if (!session) {
    session = await AttendanceSession.create({
      schoolId, branchId, date,
      sessionType: sessionType || 'morning',
      entries: [],
      createdBy: actorId,
      isLocked: false,
      totalPresent: 0, totalAbsent: 0, totalLate: 0, totalSignedOut: 0,
    });
  }

  if (session.isLocked) {
    throw ApiError.badRequest('This attendance session has been locked and cannot be modified.');
  }

  return session;
};

// ─────────────────────────────────────────────────────────────────────────────
// QR SCAN ATTENDANCE
// Handles sign-in and sign-out for students, teachers, staff and admins
// ─────────────────────────────────────────────────────────────────────────────
export const processQRScan = async (
  schoolId: string,
  branchId: string,
  actorId: string,
  qrData: string,
  sessionType = 'morning',
  isOffline = false
) => {
  const payload = parseQRCode(qrData);
  if (!payload) throw ApiError.badRequest('Invalid QR code. Please try again.');

  // Validate QR belongs to this school
  if (payload.schoolId !== schoolId) {
    throw ApiError.forbidden('This QR code does not belong to this school.');
  }

  const date = dayjs().format('YYYY-MM-DD');
  const now = new Date();
  const branch = await Branch.findById(branchId).select('name logoUrl').lean();

  const session = await getOrCreateSession(schoolId, branchId, date, sessionType, actorId);

  // Check if already has an entry for this attendee today
  const existingEntry = session.entries.find(
    (e) => e.attendeeId.toString() === payload.id
  );

  if (existingEntry) {
    // If already signed in, process sign-out
    if (existingEntry.status === 'present' || existingEntry.status === 'late') {
      existingEntry.status = 'signed_out';
      existingEntry.signOutTime = now;
      existingEntry.method = isOffline ? 'offline_qr' : 'qr';
      await session.save();
      await updateSessionTotals((session._id as any).toString());

      // Notify parents on sign-out for students
     // In the sign-out section of processQRScan
if (payload.type === 'student') {
  await notifyParents(
    schoolId, branchId, payload.id,
    existingEntry.attendeeName,
    existingEntry.className || '',
    'signed_out', date, now,
    branch?.name || '', branch?.logoUrl
  );
}

      return {
        action: 'sign_out',
        name: existingEntry.attendeeName,
        type: payload.type,
        signOutTime: now,
        message: `${existingEntry.attendeeName} signed out successfully`,
      };
    }

    return {
      action: 'already_recorded',
      name: existingEntry.attendeeName,
      status: existingEntry.status,
      message: `${existingEntry.attendeeName} attendance already recorded as ${existingEntry.status}`,
    };
  }

  // Determine late status based on time (after 8:00 AM is late for students)
  const hour = now.getHours();
  const isLate = payload.type === 'student' ? hour >= 8 : hour >= 9;
  const status = isLate ? 'late' : 'present';

  // Build entry
  let attendeeName = payload.name;
  let classId: string | undefined;
  let className: string | undefined;
  let admissionOrStaffId = payload.identifier;

  // Get fresh name from DB to ensure accuracy
  if (payload.type === 'student' || payload.type === 'teacher' || payload.type === 'admin') {
    const user = await User.findById(payload.id)
      .select('firstName lastName admissionNumber staffId classId')
      .lean();
    if (user) {
      attendeeName = `${user.firstName} ${user.lastName}`;
      admissionOrStaffId = user.admissionNumber || user.staffId || payload.identifier;

      if (user.classId) {
        const cls = await Class.findById(user.classId).select('name').lean();
        classId = (user.classId as any).toString();
        className = cls?.name;
      }
    }
  } else if (payload.type === 'staff') {
    const staff = await Staff.findById(payload.id).select('firstName lastName staffId').lean();
    if (staff) {
      attendeeName = `${staff.firstName} ${staff.lastName}`;
      admissionOrStaffId = staff.staffId;
    }
  }

  const entry: Partial<IAttendanceEntry> = {
    attendeeId: payload.id as any,
    attendeeType: payload.type,
    attendeeName,
    admissionOrStaffId,
    classId: classId as any,
    className,
    status,
    method: isOffline ? 'offline_qr' : 'qr',
    signInTime: now,
    markedBy: actorId as any,
    synced: !isOffline,
  };

  session.entries.push(entry as IAttendanceEntry);
  await session.save();
  await updateSessionTotals((session._id as any).toString());

  // Notify parents only for students
 await notifyParents(
  schoolId, branchId, payload.id,
  attendeeName, className || 'Unknown Class',
  status, date, entry?.signInTime,
  branch?.name || '', branch?.logoUrl
);

  return {
    action: 'sign_in',
    name: attendeeName,
    type: payload.type,
    status,
    signInTime: now,
    isLate,
    message: `${attendeeName} marked ${status} via QR scan`,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// MANUAL ATTENDANCE — Mark multiple people at once
// ─────────────────────────────────────────────────────────────────────────────
export const markManualAttendance = async (
  schoolId: string,
  branchId: string,
  actorId: string,
  data: {
    date: string;
    sessionType?: string;
    records: {
      attendeeId: string;
      attendeeType: 'student' | 'teacher' | 'staff' | 'admin';
      status: 'present' | 'absent' | 'late';
      note?: string;
    }[];
  }
) => {
  const branch = await Branch.findById(branchId).select('name logoUrl').lean();
  const session = await getOrCreateSession(
    schoolId, branchId, data.date,
    data.sessionType || 'morning', actorId
  );

  let marked = 0;
  let skipped = 0;
  const errors: { attendeeId: string; error: string }[] = [];

  for (const rec of data.records) {
    // Skip if already recorded
    const existing = session.entries.find(
      (e) => e.attendeeId.toString() === rec.attendeeId
    );
    if (existing) { skipped++; continue; }

    let attendeeName = 'Unknown';
    let admissionOrStaffId = rec.attendeeId;
    let classId: string | undefined;
    let className: string | undefined;

    try {
      if (rec.attendeeType === 'student' || rec.attendeeType === 'teacher' || rec.attendeeType === 'admin') {
        const user = await User.findById(rec.attendeeId)
          .select('firstName lastName admissionNumber staffId classId isActive')
          .lean();
        if (!user || !user.isActive) { skipped++; continue; }
        attendeeName = `${user.firstName} ${user.lastName}`;
        admissionOrStaffId = user.admissionNumber || user.staffId || rec.attendeeId;

        if (user.classId) {
          const cls = await Class.findById(user.classId).select('name').lean();
          classId = (user.classId as any).toString();
          className = cls?.name;
        }
      } else if (rec.attendeeType === 'staff') {
        const staff = await Staff.findById(rec.attendeeId)
          .select('firstName lastName staffId isActive')
          .lean();
        if (!staff || !staff.isActive) { skipped++; continue; }
        attendeeName = `${staff.firstName} ${staff.lastName}`;
        admissionOrStaffId = staff.staffId;
      }

      const entry: Partial<IAttendanceEntry> = {
        attendeeId: rec.attendeeId as any,
        attendeeType: rec.attendeeType,
        attendeeName,
        admissionOrStaffId,
        classId: classId as any,
        className,
        status: rec.status,
        method: 'manual',
        signInTime: rec.status !== 'absent' ? new Date() : undefined,
        note: rec.note,
        markedBy: actorId as any,
        synced: true,
      };

      session.entries.push(entry as IAttendanceEntry);
      marked++;

      // Notify parents for students for any status (present/absent/late)
    await notifyParents(
  schoolId, branchId, rec.attendeeId,
  attendeeName, className || '',
  rec.status, data.date, rec.status !== 'absent' ? new Date() : undefined,
  branch?.name || '', branch?.logoUrl
);
    } catch (err: any) {
      errors.push({ attendeeId: rec.attendeeId, error: err.message });
    }
  }

  await session.save();
  await updateSessionTotals((session._id as any).toString());

  await logAudit({
    schoolId, branchId, actorId,
    action: 'MANUAL_ATTENDANCE_MARKED', entity: 'AttendanceSession',
    entityId: (session._id as any).toString(),
    metadata: { date: data.date, marked, skipped, errors: errors.length },
  });

  return { marked, skipped, errors, sessionId: (session._id as any).toString() };
};

// ─────────────────────────────────────────────────────────────────────────────
// SIGN OUT MANUALLY
// ─────────────────────────────────────────────────────────────────────────────
export const manualSignOut = async (
  schoolId: string,
  branchId: string,
  actorId: string,
  attendeeId: string,
  date: string,
  sessionType = 'morning'
) => {
  const branch = await Branch.findById(branchId).select('name logoUrl').lean();
  const session = await AttendanceSession.findOne({
    schoolId, branchId, date, sessionType,
  });
  if (!session) throw ApiError.notFound('No attendance session found for this date.');

  const entry = session.entries.find(
    (e) => e.attendeeId.toString() === attendeeId
  );
  if (!entry) throw ApiError.notFound('Attendance record not found for this person today.');

  entry.status = 'signed_out';
  entry.signOutTime = new Date();
  await session.save();
  await updateSessionTotals((session._id as any).toString());

  // Notify parents when a student is signed out manually
  await notifyParents(
  schoolId, branchId, attendeeId,
  entry.attendeeName, 
  entry.className || '',
  'signed_out', 
  date, 
  entry.signOutTime, // Use the actual Date object created above
  branch?.name || '', 
  branch?.logoUrl
);

  return { signedOut: true, name: entry.attendeeName, time: entry.signOutTime };
};

// ─────────────────────────────────────────────────────────────────────────────
// SYNC OFFLINE ATTENDANCE
// ─────────────────────────────────────────────────────────────────────────────
export const syncOfflineAttendance = async (
  schoolId: string,
  branchId: string,
  actorId: string,
  records: {
    qrData?: string;
    attendeeId?: string;
    attendeeType?: string;
    status?: string;
    date: string;
    sessionType?: string;
    offlineId: string;
    method: 'offline_qr' | 'offline_manual';
    note?: string;
  }[]
) => {
  let synced = 0;
  let skipped = 0;
  const errors: { offlineId: string; error: string }[] = [];

  for (const rec of records) {
    try {
      // Check if already synced by offlineId
      const alreadySynced = await AttendanceSession.findOne({
        schoolId, branchId, date: rec.date,
        'entries.offlineId': rec.offlineId,
      });
      if (alreadySynced) { skipped++; continue; }

      if (rec.method === 'offline_qr' && rec.qrData) {
        await processQRScan(
          schoolId, branchId, actorId,
          rec.qrData, rec.sessionType || 'morning', true
        );
      } else if (rec.method === 'offline_manual' && rec.attendeeId) {
        await markManualAttendance(schoolId, branchId, actorId, {
          date: rec.date,
          sessionType: rec.sessionType,
          records: [{
            attendeeId: rec.attendeeId,
            attendeeType: rec.attendeeType as any || 'student',
            status: rec.status as any || 'present',
            note: rec.note,
          }],
        });
      }

      synced++;
    } catch (err: any) {
      errors.push({ offlineId: rec.offlineId, error: err.message });
    }
  }

  return { synced, skipped, errors };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET SESSION — Full session with all entries
// ─────────────────────────────────────────────────────────────────────────────
export const getSession = async (
  schoolId: string,
  branchId: string,
  date: string,
  sessionType = 'morning'
) => {
  const session = await AttendanceSession.findOne({
    schoolId, branchId, date, sessionType,
  }).lean();

  if (!session) {
    return {
      date,
      sessionType,
      entries: [],
      totalPresent: 0,
      totalAbsent: 0,
      totalLate: 0,
      totalSignedOut: 0,
      message: 'No attendance session found for this date',
    };
  }

  return session;
};

// ─────────────────────────────────────────────────────────────────────────────
// LOCK SESSION — Prevents further edits
// ─────────────────────────────────────────────────────────────────────────────
export const lockSession = async (
  schoolId: string,
  branchId: string,
  date: string,
  sessionType: string,
  actorId: string
) => {
  const session = await AttendanceSession.findOneAndUpdate(
    { schoolId, branchId, date, sessionType },
    { isLocked: true },
    { new: true }
  );
  if (!session) throw ApiError.notFound('Attendance session not found');

  await logAudit({
    schoolId, branchId, actorId,
    action: 'ATTENDANCE_SESSION_LOCKED', entity: 'AttendanceSession',
    entityId: (session._id as any).toString(),
    metadata: { date, sessionType },
  });

  return { locked: true, date, sessionType };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET SUMMARY — By date range for a branch
// ─────────────────────────────────────────────────────────────────────────────
export const getAttendanceSummary = async (
  schoolId: string,
  branchId: string,
  startDate: string,
  endDate: string,
  attendeeType?: string
) => {
  const query: Record<string, unknown> = {
    schoolId, branchId,
    date: { $gte: startDate, $lte: endDate },
  };

  const sessions = await AttendanceSession.find(query).lean();

  const summary: Record<string, {
    date: string;
    present: number;
    absent: number;
    late: number;
    signedOut: number;
    total: number;
  }> = {};

  for (const session of sessions) {
    const entries = attendeeType
      ? session.entries.filter((e) => e.attendeeType === attendeeType)
      : session.entries;

    const key = `${session.date}_${session.sessionType}`;
    summary[key] = {
      date: session.date,
      present: entries.filter((e) => e.status === 'present').length,
      absent: entries.filter((e) => e.status === 'absent').length,
      late: entries.filter((e) => e.status === 'late').length,
      signedOut: entries.filter((e) => e.status === 'signed_out').length,
      total: entries.length,
    };
  }

  return Object.values(summary);
};

// ─────────────────────────────────────────────────────────────────────────────
// GET INDIVIDUAL ATTENDANCE — History for one person
// ─────────────────────────────────────────────────────────────────────────────
export const getIndividualAttendance = async (
  schoolId: string,
  branchId: string,
  attendeeId: string,
  month?: string,
  page = 1,
  limit = 30
) => {
  const query: Record<string, unknown> = {
    schoolId, branchId,
    'entries.attendeeId': attendeeId as any,
  };
  if (month) query.date = { $regex: `^${month}` };

  const { skip } = getPagination(page, limit);

  const sessions = await AttendanceSession.find(query)
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const records = sessions.map((s) => {
    const entry = s.entries.find(
      (e) => e.attendeeId.toString() === attendeeId
    );
    return {
      date: s.date,
      sessionType: s.sessionType,
      status: entry?.status,
      signInTime: entry?.signInTime,
      signOutTime: entry?.signOutTime,
      method: entry?.method,
      note: entry?.note,
    };
  });

  const total = await AttendanceSession.countDocuments(query);
  const present = records.filter((r) => r.status === 'present').length;
  const absent = records.filter((r) => r.status === 'absent').length;
  const late = records.filter((r) => r.status === 'late').length;
  const percentage = records.length > 0
    ? Math.round(((present + late) / records.length) * 100)
    : 0;

  return {
    records,
    summary: { present, absent, late, total: records.length, percentage },
    pagination: paginatedResponse(records, total, page, limit).pagination,
  };
};