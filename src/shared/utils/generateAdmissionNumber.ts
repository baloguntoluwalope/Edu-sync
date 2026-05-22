import dayjs from 'dayjs';
import { Counter } from '../models/Counter';

export const generateAdmissionNumber = async (
  schoolId?: string,
  schoolCode = 'STU',
  digits = 3
): Promise<string> => {
  const year = dayjs().format('YY');

  // If no schoolId provided, fall back to the old random format
  if (!schoolId) {
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `${schoolCode}-${year}-${rand}`;
  }

  const counterId = `admission:${schoolId}:${year}`;
  const doc = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  ).lean();

  const seq = (doc && (doc as any).seq) || 1;
  const padded = String(seq).padStart(digits, '0');
  return `${schoolCode}-${year}-${padded}`;
};