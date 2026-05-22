import { CommunityPost } from '../../shared/models/CommunityPost';
import { User } from '../../shared/models/User';
import { Branch } from '../../shared/models/Branch';
import { ApiError } from '../../shared/utils/ApiError';
import { getPagination, paginatedResponse } from '../../shared/utils/pagination';
import { logAudit } from '../../shared/utils/auditLogger';
import { sendNotification } from '../notifications/notification.service';
import { env } from '../../config/env';

const communityPostEmailHtml = (data: {
  recipientName: string;
  postTitle: string;
  postBody: string;
  postType: string;
  authorName: string;
  schoolName: string;
  branchName: string;
  whatsappLink?: string;
  logoUrl?: string;
  viewUrl: string;
}) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Community Post</title></head>
<body style="margin:0;padding:20px;background:#f8fafc;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
    <div style="background:#1a56db;padding:24px 32px;">
      ${data.logoUrl ? `<img src="${data.logoUrl}" alt="Logo" style="height:50px;margin-bottom:8px;border-radius:4px;"/>` : ''}
      <h1 style="color:#fff;margin:0;font-size:20px;">${data.schoolName} · ${data.branchName}</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#64748b;font-size:13px;text-transform:uppercase;font-weight:600;margin:0 0 8px;">
        ${data.postType === 'event' ? '📅 Upcoming Event' : data.postType === 'discussion' ? '💬 Discussion' : '📢 School News'}
      </p>
      <h2 style="color:#1e293b;margin:0 0 16px;">${data.postTitle}</h2>
      <p style="color:#475569;line-height:1.7;margin:0 0 24px;">${data.postBody.slice(0, 300)}${data.postBody.length > 300 ? '...' : ''}</p>
      <p style="color:#94a3b8;font-size:13px;">Posted by: <strong>${data.authorName}</strong></p>

      ${data.whatsappLink ? `
      <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:16px 20px;border-radius:4px;margin:24px 0;">
        <p style="margin:0;color:#15803d;font-weight:600;">💬 Continue the discussion on WhatsApp</p>
        <a href="${data.whatsappLink}" style="color:#15803d;word-break:break-all;">${data.whatsappLink}</a>
      </div>` : ''}

      <div style="text-align:center;margin:32px 0;">
        <a href="${data.viewUrl}" style="background:#1a56db;color:#fff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:600;display:inline-block;">
          View Full Post →
        </a>
      </div>
    </div>
    <div style="background:#f1f5f9;padding:16px 32px;text-align:center;">
      <p style="color:#64748b;font-size:12px;margin:0;">© ${new Date().getFullYear()} EduSync · You received this because you are a member of ${data.schoolName}</p>
    </div>
  </div>
</body>
</html>
`;

export const createPost = async (
  schoolId: string,
  branchId: string,
  authorId: string,
  data: {
    title: string;
    body: string;
    type: 'news' | 'event' | 'discussion';
    whatsappLink?: string;
    eventDate?: string;
  }
) => {
  const post = await CommunityPost.create({
    schoolId, branchId, authorId, ...data,
    isModerated: false, isPinned: false, likes: 0,
  });

  // Fetch author and branch info for notifications
  const [author, branch] = await Promise.all([
    User.findById(authorId).select('firstName lastName').lean(),
    Branch.findById(branchId).select('name logoUrl').lean(),
  ]);

  const authorName = `${author?.firstName} ${author?.lastName}`;
  const branchName = branch?.name || '';

  // Notify all active users in this branch
  const recipients = await User.find({
    schoolId, branchId, isActive: true,
    _id: { $ne: authorId },
  }).select('_id').lean();

  // Fetch school name (from first admin)
  const schoolAdmin = await User.findOne({ schoolId, role: 'schooladmin' }).select('firstName').lean();

  for (const user of recipients) {
    const html = communityPostEmailHtml({
      recipientName: '',
      postTitle: data.title,
      postBody: data.body,
      postType: data.type,
      authorName,
      schoolName: branchName,
      branchName,
      whatsappLink: data.whatsappLink,
      logoUrl: (branch as any)?.logoUrl,
      viewUrl: `${env.FRONTEND_URL}/community/${(post._id as any).toString()}`,
    });

    await sendNotification({
      schoolId,
      branchId,
      recipientId: (user._id as any).toString(),
      type: 'community',
      title: `${data.type === 'event' ? '📅' : data.type === 'discussion' ? '💬' : '📢'} ${data.title}`,
      body: data.body.slice(0, 100) + (data.body.length > 100 ? '...' : ''),
      emailSubject: `New ${data.type} post: ${data.title}`,
      emailHtml: html,
      metadata: { postId: (post._id as any).toString(), type: data.type },
    });
  }

  await logAudit({
    schoolId, branchId, actorId: authorId,
    action: 'COMMUNITY_POST_CREATED', entity: 'CommunityPost',
    entityId: (post._id as any).toString(),
    metadata: { type: data.type, title: data.title },
  });

  return post;
};

export const listPosts = async (
  schoolId: string,
  branchId: string,
  type?: string,
  page = 1,
  limit = 20
) => {
  const { skip } = getPagination(page, limit);
  const query: Record<string, unknown> = { schoolId, branchId, isModerated: false };
  if (type) query.type = type;

  const [data, total] = await Promise.all([
    CommunityPost.find(query)
      .populate('authorId', 'firstName lastName role profileImageUrl')
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CommunityPost.countDocuments(query),
  ]);

  return paginatedResponse(data, total, page, limit);
};

export const getPost = async (schoolId: string, branchId: string, postId: string) => {
  const post = await CommunityPost.findOne({ _id: postId, schoolId, branchId })
    .populate('authorId', 'firstName lastName role profileImageUrl')
    .lean();
  if (!post) throw ApiError.notFound('Post not found');
  return post;
};

export const updatePost = async (
  schoolId: string,
  branchId: string,
  postId: string,
  actorId: string,
  role: string,
  data: Partial<{
    title: string;
    body: string;
    whatsappLink: string;
    eventDate: string;
    isPinned: boolean;
  }>
) => {
  const post = await CommunityPost.findOne({ _id: postId, schoolId, branchId });
  if (!post) throw ApiError.notFound('Post not found');

  // Only author or admin can update
  if (
    (post.authorId as any).toString() !== actorId &&
    !['schooladmin', 'teacher'].includes(role)
  ) {
    throw ApiError.forbidden('You can only edit your own posts');
  }

  // Only admins can pin posts
  if (data.isPinned !== undefined && !['schooladmin'].includes(role)) {
    throw ApiError.forbidden('Only admins can pin posts');
  }

  Object.assign(post, data);
  await post.save();

  return post;
};

export const moderatePost = async (
  schoolId: string,
  branchId: string,
  postId: string,
  actorId: string,
  hide: boolean
) => {
  const post = await CommunityPost.findOneAndUpdate(
    { _id: postId, schoolId, branchId },
    { isModerated: hide },
    { new: true }
  );
  if (!post) throw ApiError.notFound('Post not found');

  await logAudit({
    schoolId, branchId, actorId,
    action: hide ? 'POST_HIDDEN' : 'POST_UNHIDDEN',
    entity: 'CommunityPost', entityId: postId,
  });

  return post;
};

export const likePost = async (
  schoolId: string,
  branchId: string,
  postId: string
) => {
  const post = await CommunityPost.findOneAndUpdate(
    { _id: postId, schoolId, branchId, isModerated: false },
    { $inc: { likes: 1 } },
    { new: true }
  );
  if (!post) throw ApiError.notFound('Post not found');
  return { likes: post.likes };
};

export const deletePost = async (
  schoolId: string,
  branchId: string,
  postId: string,
  actorId: string,
  role: string
) => {
  const post = await CommunityPost.findOne({ _id: postId, schoolId, branchId });
  if (!post) throw ApiError.notFound('Post not found');

  if (
    (post.authorId as any).toString() !== actorId &&
    !['schooladmin'].includes(role)
  ) {
    throw ApiError.forbidden('You can only delete your own posts');
  }

  await CommunityPost.findByIdAndDelete(postId);

  await logAudit({
    schoolId, branchId, actorId,
    action: 'COMMUNITY_POST_DELETED', entity: 'CommunityPost', entityId: postId,
  });

  return { deleted: true };
};