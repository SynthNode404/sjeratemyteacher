/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Star, MessageSquare, BookOpen, Sparkles } from "lucide-react";
import { Teacher } from "../types";

interface TeacherCardProps {
  key?: string;
  teacher: Teacher;
  onSelect: (teacher: Teacher) => void | Promise<void>;
}

export const colorMap: Record<
  string,
  {
    from: string;
    to: string;
    bg: string;
    text: string;
    border: string;
    ring: string;
  }
> = {
  emerald: {
    from: "from-emerald-500",
    to: "to-teal-600",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    ring: "focus:ring-emerald-500",
  },
  blue: {
    from: "from-blue-500",
    to: "to-indigo-600",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    ring: "focus:ring-blue-500",
  },
  violet: {
    from: "from-violet-500",
    to: "to-purple-600",
    bg: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
    ring: "focus:ring-violet-500",
  },
  amber: {
    from: "from-amber-400",
    to: "to-orange-500",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    ring: "focus:ring-amber-500",
  },
  rose: {
    from: "from-rose-500",
    to: "to-pink-600",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    ring: "focus:ring-rose-500",
  },
  cyan: {
    from: "from-cyan-500",
    to: "to-blue-600",
    bg: "bg-cyan-50",
    text: "text-cyan-700",
    border: "border-cyan-200",
    ring: "focus:ring-cyan-500",
  },
};

export default function TeacherCard({ teacher, onSelect }: TeacherCardProps) {
  const colors = colorMap[teacher.accentColor] || colorMap.blue;

  return (
    <div
      id={`teacher-card-${teacher.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-gray-300 hover:shadow-xl"
    >
      {/* Visual Header Accent Badge */}
      <div className={`h-2.5 w-full bg-gradient-to-r ${colors.from} ${colors.to}`} />

      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-4">
          {/* Avatar Area */}
          <div className="relative">
            {teacher.avatar ? (
              <img
                id={`teacher-avatar-img-${teacher.id}`}
                src={teacher.avatar}
                alt={teacher.name}
                referrerPolicy="no-referrer"
                className="h-16 w-16 rounded-xl object-cover border-2 border-gray-100 shadow-sm"
              />
            ) : (
              <div
                id={`teacher-avatar-placeholder-${teacher.id}`}
                className={`flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br ${colors.from} ${colors.to} text-2xl font-bold text-white shadow-sm ring-4 ring-white`}
              >
                {teacher.name
                  .split(" ")
                  .filter((_, i, a) => i === 0 || i === a.length - 1)
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </div>
            )}
            <div className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-white text-xs text-gray-500 shadow-sm`}>
              <Sparkles className={`h-3 w-3 ${colors.text}`} />
            </div>
          </div>

          {/* Rating Circle */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1">
              <span className="text-2xl font-extrabold tracking-tight text-gray-900">
                {teacher.totalReviews > 0 ? teacher.averageRating.toFixed(1) : "—"}
              </span>
              {teacher.totalReviews > 0 && <Star className="h-5 w-5 fill-amber-400 stroke-amber-400" />}
            </div>
            <span className="text-xs font-medium text-gray-500">
              {teacher.totalReviews} {teacher.totalReviews === 1 ? "review" : "reviews"}
            </span>
          </div>
        </div>

        {/* Content Details */}
        <div className="mt-5 flex-1">
          <h3 className="text-lg font-bold tracking-tight text-gray-900 group-hover:text-amber-600 transition-colors duration-200">
            {teacher.name}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-sm font-medium text-gray-600">
            <BookOpen className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            {teacher.subject}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${colors.bg} ${colors.text}`}>
              {teacher.department}
            </span>
          </div>

          {teacher.bio && (
            <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-gray-500">
              {teacher.bio}
            </p>
          )}

          {/* Core subcategories checklist if reviews exist */}
          {teacher.totalReviews > 0 && (
            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-gray-100 pt-4 text-center">
              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold text-gray-800">{teacher.ratingClarity.toFixed(1)}</span>
                <span className="text-[10px] text-gray-400 font-medium">Clarity</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold text-gray-800">{teacher.ratingHelpfulness.toFixed(1)}</span>
                <span className="text-[10px] text-gray-400 font-medium">Helpful</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold text-gray-800">{teacher.ratingSupport.toFixed(1)}</span>
                <span className="text-[10px] text-gray-400 font-medium">Support</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          id={`view-reviews-btn-${teacher.id}`}
          onClick={() => onSelect(teacher)}
          className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100`}
        >
          <MessageSquare className="h-4 w-4 text-gray-400" />
          View & Rate
        </button>
      </div>
    </div>
  );
}
