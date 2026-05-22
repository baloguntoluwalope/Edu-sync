import mammoth from 'mammoth';
const pdfParse = require('pdf-parse'); // This usually solves the "not callable" error
import { ApiError } from '../../shared/utils/ApiError';


export interface ParsedQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  marks: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPPORTED FORMATS
//
// Format 1 — Star marker on correct answer:
//   Q1. Which planet is closest to the sun?
//   A) Venus
//   B) Mercury*
//   C) Earth
//   D) Mars
//
// Format 2 — ANSWER line:
//   1. What is 5 × 5?
//   A) 20
//   B) 25
//   C) 30
//   D) 35
//   ANSWER: B
//
// Format 3 — Mixed:
//   (1) Who wrote Things Fall Apart?
//   (a) Wole Soyinka
//   (b) Chinua Achebe*
//   (c) Ngugi wa Thiong'o
//   (d) Ben Okri
// ─────────────────────────────────────────────────────────────────────────────

const QUESTION_RE =
  /^(?:Q(?:UESTION)?\s*\.?\s*\d+[\.\)\:]?\s*|\d+[\.\)\:]\s*|\(\d+\)\s*)/i;

const OPTION_RE =
  /^(?:[A-Da-d][\.\)]\s*|\([A-Da-d]\)\s*)/;

const ANSWER_RE = /^(?:ANS(?:WER)?|CORRECT(?:\s+ANSWER)?)[:\s]+([A-Da-d])/i;

const stripOptionPrefix = (line: string) =>
  line.replace(/^(?:[A-Da-d][\.\)]\s*|\([A-Da-d]\)\s*)/, '').trim();

const letterToIndex = (letter: string): number =>
  letter.toUpperCase().charCodeAt(0) - 65;

// ─────────────────────────────────────────────────────────────────────────────
// CORE PARSER
// ─────────────────────────────────────────────────────────────────────────────
export const parseQuestionsFromText = (rawText: string): ParsedQuestion[] => {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const questions: ParsedQuestion[] = [];

  let currentText = '';
  let currentOptions: string[] = [];
  let correctFromStar = -1;
  let correctFromAnswer: number | null = null;

  const flush = () => {
    if (!currentText || currentOptions.length < 2) {
      currentText = '';
      currentOptions = [];
      correctFromStar = -1;
      correctFromAnswer = null;
      return;
    }

    const correctIndex =
      correctFromAnswer !== null
        ? correctFromAnswer
        : correctFromStar >= 0
        ? correctFromStar
        : 0;

    questions.push({
      text: currentText.trim(),
      options: currentOptions,
      correctIndex,
      marks: 1,
    });

    currentText = '';
    currentOptions = [];
    correctFromStar = -1;
    correctFromAnswer = null;
  };

  for (const line of lines) {
    // ANSWER: B
    const answerMatch = line.match(ANSWER_RE);
    if (answerMatch) {
      correctFromAnswer = letterToIndex(answerMatch[1]);
      continue;
    }

    // Option line: A) ... or A. ... or (A) ...
    if (OPTION_RE.test(line)) {
      const hasStar = line.includes('*');
      const cleanLine = line.replace(/\*/g, '').trim();
      const text = stripOptionPrefix(cleanLine);
      if (hasStar) correctFromStar = currentOptions.length;
      currentOptions.push(text);
      continue;
    }

    // Question line
    if (QUESTION_RE.test(line)) {
      flush();
      currentText = line.replace(QUESTION_RE, '').replace(/\*/g, '').trim();
      continue;
    }

    // Continuation of current question text (before options appear)
    if (currentText && currentOptions.length === 0) {
      currentText += ' ' + line;
    }
  }

  flush();

  return questions;
};

// ─────────────────────────────────────────────────────────────────────────────
// PARSE DOCX
// ─────────────────────────────────────────────────────────────────────────────
export const parseDocxBuffer = async (
  buffer: Buffer
): Promise<ParsedQuestion[]> => {
  try {
    const result = await mammoth.extractRawText({ buffer });

    if (!result.value?.trim()) {
      throw ApiError.badRequest('The Word document appears to be empty.');
    }

    const questions = parseQuestionsFromText(result.value);

    if (!questions.length) {
      throw ApiError.badRequest(
        'No questions found in the Word document. ' +
        'Use format: Q1. Question? then A) Option B) Option C) Correct* D) Option'
      );
    }

    return questions;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw ApiError.badRequest(`Could not read Word document: ${err.message}`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PARSE PDF
// ─────────────────────────────────────────────────────────────────────────────
export const parsePDFBuffer = async (
  buffer: Buffer
): Promise<ParsedQuestion[]> => {
  try {
    const data = await pdfParse(buffer);

    if (!data.text?.trim()) {
      throw ApiError.badRequest(
        'The PDF appears to be empty or contains only images. ' +
        'Please use a PDF with selectable text.'
      );
    }

    const questions = parseQuestionsFromText(data.text);

    if (!questions.length) {
      throw ApiError.badRequest(
        'No questions found in the PDF. ' +
        'Use format: Q1. Question? then A) Option B) Option C) Correct* D) Option'
      );
    }

    return questions;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw ApiError.badRequest(`Could not read PDF: ${err.message}`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DISPATCH BY MIME TYPE
// ─────────────────────────────────────────────────────────────────────────────
export const parseQuestionFile = async (
  buffer: Buffer,
  mimetype: string
): Promise<ParsedQuestion[]> => {
  const mime = mimetype.toLowerCase().trim();

  if (mime === 'application/pdf') {
    return parsePDFBuffer(buffer);
  }

  if (
    mime ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/msword'
  ) {
    return parseDocxBuffer(buffer);
  }

  throw ApiError.badRequest(
    `Unsupported file type: ${mimetype}. Please upload a PDF (.pdf) or Word document (.docx).`
  );
};