/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Star, MessageSquare, BookOpen, Sparkles, BarChart2 } from "lucide-react";
import { Teacher } from "../types";

interface TeacherCardProps {
  key?: string;
  teacher: Teacher;
  onSelect: (teacher: Teacher) => void | Promise<void>;
}

// Establishes a highly realistic distribution based on score if legacy data is processed
function getOrGenerateDistribution(score: number, totalReviews: number): Record<number, number> {
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (totalReviews <= 0) return dist;

  const rounded = Math.round(score);
  if (rounded === 5) {
    dist[5] = Math.ceil(totalReviews * 0.85);
    dist[4] = totalReviews - dist[5];
  } else if (rounded === 4) {
    dist[5] = Math.floor(totalReviews * 0.3);
    dist[4] = Math.ceil(totalReviews * 0.55);
    dist[3] = totalReviews - dist[5] - dist[4];
  } else if (rounded === 3) {
    dist[4] = Math.floor(totalReviews * 0.25);
    dist[3] = Math.ceil(totalReviews * 0.5);
    dist[2] = totalReviews - dist[4] - dist[3];
  } else if (rounded === 2) {
    dist[3] = Math.floor(totalReviews * 0.2);
    dist[2] = Math.ceil(totalReviews * 0.6);
    dist[1] = totalReviews - dist[3] - dist[2];
  } else {
    dist[1] = Math.ceil(totalReviews * 0.85);
    dist[2] = totalReviews - dist[1];
  }

  for (let i = 1; i <= 5; i++) {
    dist[i] = Math.max(0, dist[i]);
  }
  return dist;
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
    darkBg?: string;
    darkText?: string;
    darkBorder?: string;
  }
> = {
  emerald: {
    from: "from-emerald-500",
    to: "to-teal-600",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    ring: "focus:ring-emerald-500",
    darkBg: "dark:bg-emerald-950/20",
    darkText: "dark:text-emerald-300",
    darkBorder: "dark:border-emerald-900/40",
  },
  blue: {
    from: "from-blue-500",
    to: "to-indigo-600",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    ring: "focus:ring-blue-500",
    darkBg: "dark:bg-blue-950/20",
    darkText: "dark:text-blue-300",
    darkBorder: "dark:border-blue-900/40",
  },
  violet: {
    from: "from-violet-500",
    to: "to-purple-600",
    bg: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
    ring: "focus:ring-violet-500",
    darkBg: "dark:bg-violet-950/20",
    darkText: "dark:text-violet-300",
    darkBorder: "dark:border-violet-900/40",
  },
  amber: {
    from: "from-amber-400",
    to: "to-orange-500",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    ring: "focus:ring-amber-500",
    darkBg: "dark:bg-amber-950/20",
    darkText: "dark:text-amber-300",
    darkBorder: "dark:border-amber-900/40",
  },
  rose: {
    from: "from-rose-500",
    to: "to-pink-600",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    ring: "focus:ring-rose-500",
    darkBg: "dark:bg-rose-950/20",
    darkText: "dark:text-rose-300",
    darkBorder: "dark:border-rose-900/40",
  },
  cyan: {
    from: "from-cyan-500",
    to: "to-blue-600",
    bg: "bg-cyan-50",
    text: "text-cyan-700",
    border: "border-cyan-200",
    ring: "focus:ring-cyan-500",
    darkBg: "dark:bg-cyan-950/20",
    darkText: "dark:text-cyan-300",
    darkBorder: "dark:border-cyan-900/40",
  },
};

export default function TeacherCard({ teacher, onSelect }: TeacherCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const colors = colorMap[teacher.accentColor] || colorMap.blue;

  const clarityDist = teacher.ratingDistributionClarity || getOrGenerateDistribution(teacher.ratingClarity, teacher.totalReviews);
  const helpfulnessDist = teacher.ratingDistributionHelpfulness || getOrGenerateDistribution(teacher.ratingHelpfulness, teacher.totalReviews);
  const supportDist = teacher.ratingDistributionSupport || getOrGenerateDistribution(teacher.ratingSupport, teacher.totalReviews);

  const renderHistogram = (title: string, distribution: Record<number, number>) => {
    return (
      <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100 dark:bg-slate-950 dark:border-slate-800/85">
        <div className="flex justify-between items-center px-0.5">
          <span className="text-[9px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400">{title}</span>
        </div>
        <div className="space-y-1 pt-1">
          {[5, 4, 3, 2, 1].map((stars) => {
            const val = distribution[stars] || 0;
            const percentage = teacher.totalReviews > 0 ? (val / teacher.totalReviews) * 100 : 0;
            return (
              <div key={stars} className="flex items-center gap-1.5 text-[10px] font-bold">
                <span className="w-4 text-slate-400 dark:text-slate-500 text-right text-[9px]">{stars}★</span>
                <div className="flex-1 h-1.5 bg-slate-200/60 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-3 text-slate-500 dark:text-slate-400 text-left text-[8px] font-mono">{val}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      id={`teacher-card-${teacher.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 hover:-translate-y-1 hover:border-gray-300 dark:hover:border-slate-700 hover:shadow-xl dark:hover:shadow-2xl"
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
                className="h-16 w-16 rounded-xl object-cover border-2 border-gray-100 dark:border-slate-800 shadow-sm"
              />
            ) : (
              <div
                id={`teacher-avatar-placeholder-${teacher.id}`}
                className={`flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br ${colors.from} ${colors.to} text-2xl font-bold text-white shadow-sm ring-4 ring-white dark:ring-slate-900`}
              >
                {teacher.name
                  .split(" ")
                  .filter((_, i, a) => i === 0 || i === a.length - 1)
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </div>
            )}
            <div className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white dark:border-slate-900 bg-white dark:bg-slate-900 text-xs text-gray-500 dark:text-slate-400 shadow-sm`}>
              <Sparkles className={`h-3 w-3 ${colors.text}`} />
            </div>
          </div>

          {/* Rating Circle */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1">
              <span className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                {teacher.totalReviews > 0 ? teacher.averageRating.toFixed(1) : "—"}
              </span>
              {teacher.totalReviews > 0 && <Star className="h-5 w-5 fill-amber-400 stroke-amber-400" />}
            </div>
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
              {teacher.totalReviews} {teacher.totalReviews === 1 ? "review" : "reviews"}
            </span>
          </div>
        </div>

        {/* Content Details */}
        <div className="mt-5 flex-1">
          <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors duration-200">
            {teacher.name}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-sm font-medium text-gray-600 dark:text-slate-300">
            <BookOpen className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-slate-500" />
            {teacher.subject}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${colors.bg} ${colors.text} ${colors.darkBg || ""} ${colors.darkText || ""} dark:border dark:border-solid ${colors.darkBorder || "dark:border-transparent"}`}>
              {teacher.department}
            </span>
          </div>

          {teacher.bio && (
            <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-slate-400">
              {teacher.bio}
            </p>
          )}

          {/* Core subcategories checklist if reviews exist */}
          {teacher.totalReviews > 0 && (
            <div className="mt-5 border-t border-gray-100 dark:border-slate-800 pt-4">
              <div className="grid grid-cols-3 gap-2 text-center pb-3">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-semibold text-gray-800 dark:text-slate-200">{teacher.ratingClarity.toFixed(1)}</span>
                  <span className="text-[10px] text-gray-400 dark:text-slate-400 font-medium">Clarity</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xs font-semibold text-gray-800 dark:text-slate-200">{teacher.ratingHelpfulness.toFixed(1)}</span>
                  <span className="text-[10px] text-gray-400 dark:text-slate-400 font-medium">Helpful</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xs font-semibold text-gray-800 dark:text-slate-200">{teacher.ratingSupport.toFixed(1)}</span>
                  <span className="text-[10px] text-gray-400 dark:text-slate-400 font-medium">Support</span>
                </div>
              </div>

              {/* Collapsible star rating breakdown histogram */}
              <div className="mt-2 flex justify-center">
                <button
                  id={`toggle-breakdown-${teacher.id}`}
                  onClick={() => setShowBreakdown(!showBreakdown)}
                  className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-100 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100/80 dark:hover:bg-indigo-950/70 px-3 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-900/60 transition cursor-pointer"
                >
                  <BarChart2 className="w-3 h-3" />
                  {showBreakdown ? "Hide Breakdown" : "Rating Distribution"}
                </button>
              </div>

              {showBreakdown && (
                <div className="mt-4 space-y-2.5 pt-3 border-t border-dashed border-slate-100 dark:border-slate-800/60 animate-fade-in">
                  {renderHistogram("Clarity 1-5★ Distribution", clarityDist)}
                  {renderHistogram("Helpfulness 1-5★ Distribution", helpfulnessDist)}
                  {renderHistogram("Support 1-5★ Distribution", supportDist)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          id={`view-reviews-btn-${teacher.id}`}
          onClick={() => onSelect(teacher)}
          className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-slate-800 py-2 text-sm font-semibold text-gray-700 dark:text-slate-300 transition hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white active:bg-gray-100 dark:active:bg-slate-850`}
        >
          <MessageSquare className="h-4 w-4 text-gray-400 dark:text-slate-500" />
          View & Rate
        </button>
      </div>
    </div>
  );
}
