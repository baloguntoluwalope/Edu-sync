import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess } from '../../shared/utils/ApiResponse';
import * as svc from './superAdmin.service';

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────
export const platformOverview = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await svc.getPlatformOverview();
    sendSuccess(res, result, 'Platform overview');
  }
);

export const activityFeed = asyncHandler(
  async (req: Request, res: Response) => {
    const { limit } = req.query as Record<string, string>;
    const result = await svc.getActivityFeed(+limit || 30);
    sendSuccess(res, result);
  }
);

export const systemHealth = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await svc.getSystemHealth();
    sendSuccess(res, result);
  }
);

export const expiringSchools = asyncHandler(
  async (req: Request, res: Response) => {
    const { days } = req.query as Record<string, string>;
    const result = await svc.getExpiringSchools(+days || 7);
    sendSuccess(res, result);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// SCHOOLS
// ─────────────────────────────────────────────────────────────────────────────
export const allSchools = asyncHandler(
  async (req: Request, res: Response) => {
    const { page, limit, status, search } = req.query as Record<string, string>;
    const result = await svc.getAllSchools(
      +page || 1,
      +limit || 20,
      status,
      search
    );
    sendSuccess(res, result);
  }
);

export const schoolDetail = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await svc.getSchoolDetail(String(req.params.schoolId));
    sendSuccess(res, result);
  }
);

export const suspendSchool = asyncHandler(
  async (req: Request, res: Response) => {
    const { reason } = req.body;
    const result = await svc.suspendSchool(
      String(req.params.schoolId),
      req.user!.userId,
      String(reason || 'No reason provided')
    );
    sendSuccess(res, result, 'School suspended');
  }
);

export const activateSchool = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await svc.activateSchool(
      String(req.params.schoolId),
      req.user!.userId
    );
    sendSuccess(res, result, 'School activated');
  }
);

export const extendTrial = asyncHandler(
  async (req: Request, res: Response) => {
    const { days } = req.body;
    const result = await svc.extendTrial(
      String(req.params.schoolId),
      req.user!.userId,
      +days
    );
    sendSuccess(res, result, `Trial extended by ${days} days`);
  }
);

export const manualPay = asyncHandler(async (req: Request, res: Response) => {
  const { plan, reference } = req.body;
  const result = await svc.manuallyMarkPaid(
    String(req.params.schoolId),
    req.user!.userId,
    plan,
    reference
  );
  sendSuccess(res, result, 'Subscription manually activated');
});

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTIONS & REVENUE
// ─────────────────────────────────────────────────────────────────────────────
export const allSubscriptions = asyncHandler(
  async (req: Request, res: Response) => {
    const { page, limit, status, plan } = req.query as Record<string, string>;
    const result = await svc.getAllSubscriptions(
      +page || 1,
      +limit || 20,
      status,
      plan
    );
    sendSuccess(res, result);
  }
);

export const revenueAnalytics = asyncHandler(
  async (req: Request, res: Response) => {
    const { months } = req.query as Record<string, string>;
    const result = await svc.getRevenueAnalytics(+months || 6);
    sendSuccess(res, result);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────
export const allUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, role, schoolId, search } = req.query as Record<string, string>;
  const result = await svc.getAllUsers(
    +page || 1,
    +limit || 20,
    role,
    schoolId,
    search
  );
  sendSuccess(res, result);
});

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOGS
// ─────────────────────────────────────────────────────────────────────────────
export const auditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, schoolId, action } = req.query as Record<string, string>;
  const result = await svc.getPlatformAuditLogs(
    +page || 1,
    +limit || 50,
    schoolId,
    action
  );
  sendSuccess(res, result);
});

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────
export const createEmailTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await svc.createEmailTemplate(req.user!.userId, req.body);
    sendSuccess(res, result, 'Email template created', 201);
  }
);

export const listEmailTemplates = asyncHandler(
  async (req: Request, res: Response) => {
    const { page, limit } = req.query as Record<string, string>;
    const result = await svc.listEmailTemplates(+page || 1, +limit || 20);
    sendSuccess(res, result);
  }
);

export const getEmailTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await svc.getEmailTemplate(String(req.params.id));
    sendSuccess(res, result);
  }
);

export const updateEmailTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await svc.updateEmailTemplate(
      String(req.params.id),
      req.body
    );
    sendSuccess(res, result, 'Template updated');
  }
);

export const deleteEmailTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await svc.deleteEmailTemplate(String(req.params.id));
    sendSuccess(res, result, 'Template deactivated');
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL BROADCAST
// ─────────────────────────────────────────────────────────────────────────────
export const sendBroadcast = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await svc.sendEmailBroadcast(req.user!.userId, req.body);
    sendSuccess(
      res,
      result,
      `Broadcast sent to ${result.successCount} recipients`
    );
  }
);

export const sendBroadcastFromTemplate = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await svc.sendBroadcastFromTemplate(
      req.user!.userId,
      req.body
    );
    sendSuccess(
      res,
      result,
      `Broadcast sent to ${result.successCount} recipients`
    );
  }
);

export const broadcastHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const { page, limit } = req.query as Record<string, string>;
    const result = await svc.getBroadcastHistory(+page || 1, +limit || 20);
    sendSuccess(res, result);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
export const getPlatformSettings = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await svc.getPlatformSettings();
    sendSuccess(res, result);
  }
);

export const updatePlatformSettings = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await svc.updatePlatformSettings(req.user!.userId, req.body);
    sendSuccess(res, result, 'Platform settings updated');
  }
);

export const uploadPlatformLogo = asyncHandler(
  async (req: Request, res: Response) => {
    const file = req.file as any;
    if (!file)
      throw new Error('No file uploaded. Please attach a logo image.');
    const result = await svc.uploadPlatformLogo(
      req.user!.userId,
      file.path,
      file.filename
    );
    sendSuccess(res, result, 'EduSync platform logo uploaded successfully');
  }
);

export const removePlatformLogo = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await svc.removePlatformLogo(req.user!.userId);
    sendSuccess(res, result, 'Platform logo removed');
  }
);

export const uploadPlatformFavicon = asyncHandler(
  async (req: Request, res: Response) => {
    const file = req.file as any;
    if (!file) throw new Error('No file uploaded');
    const result = await svc.uploadPlatformFavicon(
      req.user!.userId,
      file.path,
      file.filename
    );
    sendSuccess(res, result, 'Platform favicon uploaded');
  }
);

export const removePlatformFavicon = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await svc.removePlatformFavicon(req.user!.userId);
    sendSuccess(res, result, 'Platform favicon removed');
  }
);