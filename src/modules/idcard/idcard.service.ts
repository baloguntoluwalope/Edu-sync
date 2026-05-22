import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { IDCardOrder } from '../../shared/models/IDCardOrder';
import { User } from '../../shared/models/User';
import { Staff } from '../../shared/models/Staff';
import { School } from '../../shared/models/School';
import { Branch } from '../../shared/models/Branch';
import { Class } from '../../shared/models/Class';
import { ApiError } from '../../shared/utils/ApiError';
import { generatePDF } from '../results/pdf.service';
import { buildIDCardPageHTML } from './idcard.template';
import { logAudit } from '../../shared/utils/auditLogger';
import { getPagination, paginatedResponse } from '../../shared/utils/pagination';
import { generateQRCode } from '../../shared/utils/qrCodeGenerator';

// ─────────────────────────────────────────────────────────────────────────────
// GET BRANDING
// ─────────────────────────────────────────────────────────────────────────────
const getBranding = async (schoolId: string, branchId: string) => {
  const [school, branch] = await Promise.all([
    School.findById(schoolId).select('name logoUrl').lean(),
    Branch.findById(branchId)
      .select(
        'name address phone email principalName principalSignatureUrl logoUrl'
      )
      .lean(),
  ]);

  const yr = parseInt(dayjs().format('YYYY'));

  return {
    schoolName: school?.name || 'School Name',
    branchName: branch?.name || 'Main Branch',
    address: branch?.address || '',
    phone: branch?.phone || '',
    email: branch?.email || '',
    logoUrl: branch?.logoUrl || (school as any)?.logoUrl || '',
    principalName: branch?.principalName || '',
    principalSignatureUrl: branch?.principalSignatureUrl || '',
    session: `${yr}/${yr + 1}`,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// RESOLVE CARD ITEMS
// ─────────────────────────────────────────────────────────────────────────────
const resolveCardItems = async (
  schoolId: string,
  branchId: string,
  attendees: { id: string; type: 'student' | 'teacher' | 'staff' | 'admin' }[]
) => {
  const items = [];

  for (const att of attendees) {
    try {
      if (['student', 'teacher', 'admin'].includes(att.type)) {
        const user = await User.findOne({ _id: att.id, schoolId })
          .select(
            'firstName lastName admissionNumber staffId role classId passportUrl qrCodeUrl qrCodeData'
          )
          .lean();

        if (!user) continue;

        let className: string | undefined;
        if (user.classId) {
          const cls = await Class.findById(user.classId)
            .select('name')
            .lean();
          className = cls?.name;
        }

        // Generate QR if missing
        let qrCodeUrl = user.qrCodeUrl;
        if (!qrCodeUrl) {
          const identifier =
            user.admissionNumber || user.staffId || att.id;
          const qr = await generateQRCode({
            type: att.type,
            id: att.id,
            schoolId,
            branchId,
            identifier,
            name: `${user.firstName} ${user.lastName}`,
          });
          qrCodeUrl = qr.qrCodeUrl;
          await User.findByIdAndUpdate(att.id, {
            qrCodeData: qr.qrCodeData,
            qrCodeUrl: qr.qrCodeUrl,
          });
        }

        items.push({
          attendeeId: att.id,
          attendeeType: att.type,
          name: `${user.firstName} ${user.lastName}`,
          identifier:
            user.admissionNumber || user.staffId || att.id,
          qrCodeUrl: qrCodeUrl!,
          passportUrl: user.passportUrl,
          className,
          role: user.role,
        });
      } else if (att.type === 'staff') {
        const staff = await Staff.findOne({ _id: att.id, schoolId })
          .select(
            'firstName lastName staffId staffRole customRole passportUrl qrCodeUrl qrCodeData'
          )
          .lean();

        if (!staff) continue;

        let qrCodeUrl = staff.qrCodeUrl;
        if (!qrCodeUrl) {
          const qr = await generateQRCode({
            type: 'staff',
            id: att.id,
            schoolId,
            branchId,
            identifier: staff.staffId,
            name: `${staff.firstName} ${staff.lastName}`,
          });
          qrCodeUrl = qr.qrCodeUrl;
          await Staff.findByIdAndUpdate(att.id, {
            qrCodeData: qr.qrCodeData,
            qrCodeUrl: qr.qrCodeUrl,
          });
        }

        items.push({
          attendeeId: att.id,
          attendeeType: 'staff' as const,
          name: `${staff.firstName} ${staff.lastName}`,
          identifier: staff.staffId,
          qrCodeUrl: qrCodeUrl!,
          passportUrl: staff.passportUrl,
          role: staff.customRole || staff.staffRole,
        });
      }
    } catch {
      continue;
    }
  }

  return items;
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE ORDER — Always free, instant download
// ─────────────────────────────────────────────────────────────────────────────
export const createIDCardOrder = async (
  schoolId: string,
  branchId: string,
  actorId: string,
  attendees: {
    id: string;
    type: 'student' | 'teacher' | 'staff' | 'admin';
  }[]
) => {
  if (!attendees.length) {
    throw ApiError.badRequest('At least one attendee is required');
  }
  if (attendees.length > 200) {
    throw ApiError.badRequest('Maximum 200 cards per order');
  }

  const items = await resolveCardItems(schoolId, branchId, attendees);
  if (!items.length) {
    throw ApiError.badRequest('No valid attendees found for the provided IDs');
  }

  const order = await IDCardOrder.create({
    schoolId,
    branchId,
    orderedBy: actorId,
    items,
    totalCards: items.length,
    downloadCount: 0,
  });

  await logAudit({
    schoolId,
    branchId,
    actorId,
    action: 'ID_CARD_ORDER_CREATED',
    entity: 'IDCardOrder',
    entityId: (order._id as any).toString(),
    metadata: { totalCards: items.length },
  });

  return {
    orderId: order._id,
    totalCards: items.length,
    message: `${items.length} ID card(s) ready. Download now — completely free.`,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// CLASS ORDER — All students in a class
// ─────────────────────────────────────────────────────────────────────────────
export const createClassIDCardOrder = async (
  schoolId: string,
  branchId: string,
  actorId: string,
  classId: string
) => {
  const cls = await Class.findOne({ _id: classId, schoolId, branchId })
    .select('name studentIds')
    .lean();
  if (!cls) throw ApiError.notFound('Class not found');

  if (!cls.studentIds?.length) {
    throw ApiError.badRequest(`No students found in ${cls.name}`);
  }

  const attendees = cls.studentIds.map((id: any) => ({
    id: id.toString(),
    type: 'student' as const,
  }));

  return createIDCardOrder(schoolId, branchId, actorId, attendees);
};

// ─────────────────────────────────────────────────────────────────────────────
// BRANCH STAFF ORDER — All teachers + staff + admins in a branch
// ─────────────────────────────────────────────────────────────────────────────
export const createBranchStaffOrder = async (
  schoolId: string,
  branchId: string,
  actorId: string
) => {
  const [teachers, admins, nonTeachingStaff] = await Promise.all([
    User.find({ schoolId, branchId, role: 'teacher', isActive: true })
      .select('_id')
      .lean(),
    User.find({ schoolId, branchId, role: 'schooladmin', isActive: true })
      .select('_id')
      .lean(),
    Staff.find({ schoolId, branchId, isActive: true }).select('_id').lean(),
  ]);

  const attendees = [
    ...teachers.map((u) => ({
      id: (u._id as any).toString(),
      type: 'teacher' as const,
    })),
    ...admins.map((u) => ({
      id: (u._id as any).toString(),
      type: 'admin' as const,
    })),
    ...nonTeachingStaff.map((s) => ({
      id: (s._id as any).toString(),
      type: 'staff' as const,
    })),
  ];

  if (!attendees.length) {
    throw ApiError.badRequest('No active staff found in this branch');
  }

  return createIDCardOrder(schoolId, branchId, actorId, attendees);
};

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE PDF — Always allowed, no payment check
// ─────────────────────────────────────────────────────────────────────────────
export const generateIDCardPDF = async (
  orderId: string,
  schoolId: string,
  branchId: string,
  actorId: string
): Promise<Buffer> => {
  const order = await IDCardOrder.findOne({
    _id: orderId,
    schoolId,
    branchId,
  });

  if (!order) throw ApiError.notFound('Order not found');

  const branding = await getBranding(schoolId, branchId);
  const html = buildIDCardPageHTML(order.items, branding);
  const pdf = await generatePDF(html);

  await IDCardOrder.findByIdAndUpdate(orderId, {
    $inc: { downloadCount: 1 },
  });

  await logAudit({
    schoolId,
    branchId,
    actorId,
    action: 'ID_CARDS_DOWNLOADED',
    entity: 'IDCardOrder',
    entityId: orderId,
    metadata: {
      totalCards: order.totalCards,
      downloadCount: order.downloadCount + 1,
    },
  });

  return pdf;
};

// ─────────────────────────────────────────────────────────────────────────────
// PREVIEW — Single card, always free
// ─────────────────────────────────────────────────────────────────────────────
export const previewSingleCard = async (
  schoolId: string,
  branchId: string,
  attendeeId: string,
  attendeeType: 'student' | 'teacher' | 'staff' | 'admin'
): Promise<Buffer> => {
  const items = await resolveCardItems(schoolId, branchId, [
    { id: attendeeId, type: attendeeType },
  ]);

  if (!items.length) {
    throw ApiError.notFound(
      'Attendee not found. Check the ID and type are correct.'
    );
  }

  const branding = await getBranding(schoolId, branchId);
  const html = buildIDCardPageHTML(items, branding);
  return generatePDF(html);
};

// ─────────────────────────────────────────────────────────────────────────────
// LIST ORDERS
// ─────────────────────────────────────────────────────────────────────────────
export const listOrders = async (
  schoolId: string,
  branchId: string,
  page = 1,
  limit = 20
) => {
  const { skip } = getPagination(page, limit);

  const [data, total] = await Promise.all([
    IDCardOrder.find({ schoolId, branchId })
      .populate('orderedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-items.qrCodeUrl')
      .lean(),
    IDCardOrder.countDocuments({ schoolId, branchId }),
  ]);

  return paginatedResponse(data, total, page, limit);
};

// ─────────────────────────────────────────────────────────────────────────────
// GET SINGLE ORDER
// ─────────────────────────────────────────────────────────────────────────────
export const getOrder = async (
  schoolId: string,
  branchId: string,
  orderId: string
) => {
  const order = await IDCardOrder.findOne({
    _id: orderId,
    schoolId,
    branchId,
  })
    .populate('orderedBy', 'firstName lastName email')
    .lean();

  if (!order) throw ApiError.notFound('Order not found');
  return order;
};