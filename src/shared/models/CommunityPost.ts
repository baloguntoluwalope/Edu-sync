import mongoose, { Schema, Document } from 'mongoose';

export interface ICommunityPost extends Document {
  schoolId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  type: 'news' | 'event' | 'discussion';
  title: string;
  body: string;
  imageUrl?: string;
  whatsappLink?: string;
  isModerated: boolean;
  isPinned: boolean;
  eventDate?: Date;
  likes: number;
}

const CommunityPostSchema = new Schema<ICommunityPost>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['news', 'event', 'discussion'], default: 'news' },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    imageUrl: String,
    whatsappLink: String,
    isModerated: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },
    eventDate: Date,
    likes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const CommunityPost = mongoose.model<ICommunityPost>('CommunityPost', CommunityPostSchema);