import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess } from '../../shared/utils/ApiResponse';
import * as svc from './community.service';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const post = await svc.createPost(req.schoolId!, req.branchId!, req.user!.userId, req.body);
  sendSuccess(res, post, 'Post created', 201);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { type, page, limit } = req.query as Record<string, string>;
  const result = await svc.listPosts(req.schoolId!, req.branchId!, type, +page || 1, +limit || 20);
  sendSuccess(res, result);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const post = await svc.getPost(req.schoolId!, req.branchId!, id!);
  sendSuccess(res, post);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const post = await svc.updatePost(
    req.schoolId!, req.branchId!, id!, req.user!.userId, req.user!.role, req.body
  );
  sendSuccess(res, post);
});

export const moderate = asyncHandler(async (req: Request, res: Response) => {
  const { hide } = req.body;
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const post = await svc.moderatePost(
    req.schoolId!, req.branchId!, id!, req.user!.userId, hide
  );
  sendSuccess(res, post, hide ? 'Post hidden' : 'Post visible again');
});

export const likePost = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await svc.likePost(req.schoolId!, req.branchId!, id!);
  sendSuccess(res, result);
});

export const deletePost = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await svc.deletePost(
    req.schoolId!, req.branchId!, id!, req.user!.userId, req.user!.role
  );
  sendSuccess(res, result, 'Post deleted');
});