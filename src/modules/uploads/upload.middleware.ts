import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { cloudinary } from '../../config/cloudinary';
import { ApiError } from '../../shared/utils/ApiError';
import { Request } from 'express';
import { UploadApiResponse } from 'cloudinary';

const createStorage = (folder: string, allowedFormats: string[]) =>
  new CloudinaryStorage({
    cloudinary,
    params: async (_req: Request, file: Express.Multer.File) => ({
      folder: `edusync/${folder}`,
      allowed_formats: allowedFormats,
      transformation: folder === 'logos' ? [{ width: 400, crop: 'scale' }] : undefined,
    }),
  });

const fileFilter =
  (allowed: string[]) =>
  (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = file.mimetype.split('/')[1];
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new ApiError(400, `Invalid file type. Allowed: ${allowed.join(', ')}`));
    }
  };

export const imageUpload = multer({
  storage: createStorage('logos', ['jpg', 'jpeg', 'png', 'webp']),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: fileFilter(['jpeg', 'jpg', 'png', 'webp']),
});

export const documentUpload = multer({
  storage: createStorage('documents', ['pdf', 'doc', 'docx']),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter(['pdf', 'msword', 'vnd.openxmlformats-officedocument.wordprocessingml.document']),
});

export const anyUpload = multer({
  storage: createStorage('resources', ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'mp4']),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

export const uploadToCloudinary = async (
  fileBuffer: Buffer,
  folder: string,
  transformation?: Record<string, unknown>,
  mimetype = 'image/jpeg'
): Promise<{ url: string; publicId: string }> => {
  const dataUri = `data:${mimetype};base64,${fileBuffer.toString('base64')}`;
  const res = (await cloudinary.uploader.upload(dataUri, {
    folder: `edusync/${folder}`,
    transformation,
  })) as UploadApiResponse;
  if (!res || !res.secure_url || !res.public_id) throw new ApiError(500, 'Cloudinary upload failed');
  return { url: res.secure_url, publicId: res.public_id };
};