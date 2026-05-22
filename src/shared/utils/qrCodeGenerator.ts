import QRCode from 'qrcode';
import { logger } from '../../config/logger';

export interface QRPayload {
  type: 'student' | 'teacher' | 'staff' | 'admin';
  id: string;
  schoolId: string;
  branchId: string;
  identifier: string; // admissionNumber or staffId
  name: string;
}

export const generateQRCode = async (
  payload: QRPayload
): Promise<{ qrCodeData: string; qrCodeUrl: string }> => {
  const qrCodeData = JSON.stringify(payload);
  const qrCodeUrl = await QRCode.toDataURL(qrCodeData, {
    width: 300,
    margin: 2,
    color: {
      dark: '#1a1a1a',
      light: '#ffffff',
    },
  });

  return { qrCodeData, qrCodeUrl };
};

export const generateQRCodeBuffer = async (
  payload: QRPayload
): Promise<Buffer> => {
  const qrCodeData = JSON.stringify(payload);
  return QRCode.toBuffer(qrCodeData, {
    width: 300,
    margin: 2,
  });
};

export const parseQRCode = (qrData: string): QRPayload | null => {
  try {
    return JSON.parse(qrData) as QRPayload;
  } catch {
    logger.warn('Invalid QR code data:', qrData);
    return null;
  }
};