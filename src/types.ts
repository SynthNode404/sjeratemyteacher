/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Teacher {
  id: string;
  name: string;
  subject: string;
  department: string;
  avatar: string; // Base64 data URI or remote asset URL
  bio?: string;
  averageRating: number;
  ratingClarity: number;      // 1-5 sub-rating
  ratingHelpfulness: number;  // 1-5 sub-rating
  ratingSupport: number;      // 1-5 sub-rating
  totalReviews: number;
  accentColor: string;        // e.g. "emerald", "blue", "violet", "amber"
  ratingDistributionClarity?: Record<number, number>;
  ratingDistributionHelpfulness?: Record<number, number>;
  ratingDistributionSupport?: Record<number, number>;
}

export interface Review {
  id: string;
  teacherId: string;
  rating: number;             // Overall average of sub-ratings or principal rating
  ratingClarity: number;      // 1-5 rating
  ratingHelpfulness: number;  // 1-5 rating
  ratingSupport: number;      // 1-5 rating
  comment: string;
  author: string;
  grade: string;              // e.g. "Year 9", "Year 10", "Year 11", "Year 12", "Alumni", "Parent"
  isAnonymous: boolean;
  date: string;               // ISO Timestamp
  isReported: boolean;
  reportCount: number;
  reportReason?: string;
  likes: number;              // Helpful votes/likes
  likedBy?: string[];         // IP array or user fingerprint for local accounts
}

export interface SystemConfig {
  studentEditingEnabled: boolean;
}
