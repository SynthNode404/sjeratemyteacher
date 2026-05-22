/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell
} from "recharts";
import { Teacher, Review } from "../types";
import { Award, Users, Star, MessageSquare, TrendingUp, BookOpen } from "lucide-react";

interface AdminAnalyticsProps {
  teachers: Teacher[];
  allReviews: Review[];
}

export default function AdminAnalytics({ teachers, allReviews }: AdminAnalyticsProps) {
  const [popularMetric, setPopularMetric] = useState<"reviews" | "rating">("reviews");

  // 1. Calculate General school-wide KPI stats
  const stats = useMemo(() => {
    const ratedTeachers = teachers.filter((t) => t.totalReviews > 0);
    const avgRatingSum = ratedTeachers.reduce((acc, t) => acc + t.averageRating, 0);
    const schoolAverage = ratedTeachers.length > 0 ? (avgRatingSum / ratedTeachers.length).toFixed(2) : "0.00";

    // Most active subject has most reviews
    const subjectReviewCounts: Record<string, number> = {};
    teachers.forEach((t) => {
      subjectReviewCounts[t.subject] = (subjectReviewCounts[t.subject] || 0) + t.totalReviews;
    });
    let topSubject = "N/A";
    let maxSubjReviews = 0;
    Object.entries(subjectReviewCounts).forEach(([subj, count]) => {
      if (count > maxSubjReviews) {
        maxSubjReviews = count;
        topSubject = subj;
      }
    });

    return {
      totalTeachers: teachers.length,
      totalReviews: allReviews.length,
      schoolAverage,
      topSubject
    };
  }, [teachers, allReviews]);

  // 2. Data Preparation for Most Popular Teachers (Top 8)
  const popularTeachersData = useMemo(() => {
    const sorted = [...teachers];
    if (popularMetric === "reviews") {
      // Sort by review count descending
      sorted.sort((a, b) => b.totalReviews - a.totalReviews);
    } else {
      // Sort by average rating descending
      sorted.sort((a, b) => b.averageRating - a.averageRating);
    }
    return sorted.slice(0, 8).map((t) => ({
      name: t.name.replace(/^(Mr|Ms|Mrs|Dr|Prof|Mx)\.?\s+/i, ""), // short clean name for charts
      fullName: t.name,
      reviews: t.totalReviews,
      rating: parseFloat(t.averageRating.toFixed(2)),
      department: t.department,
      accentColor: t.accentColor
    }));
  }, [teachers, popularMetric]);

  // 3. Data Preparation for Highest-Rated Subjects (grouped, min 1 rating, sorted descending)
  const subjectRatingsData = useMemo(() => {
    const groups: Record<string, { totalRating: number; count: number; reviews: number }> = {};
    
    teachers.forEach((t) => {
      if (t.totalReviews > 0) {
        const key = t.subject.trim();
        if (!groups[key]) {
          groups[key] = { totalRating: 0, count: 0, reviews: 0 };
        }
        groups[key].totalRating += t.averageRating;
        groups[key].count += 1;
        groups[key].reviews += t.totalReviews;
      }
    });

    return Object.entries(groups)
      .map(([subject, info]) => ({
        subject,
        rating: parseFloat((info.totalRating / info.count).toFixed(2)),
        reviews: info.reviews
      }))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10); // Show top 10 subjects
  }, [teachers]);

  // 4. Data Preparation for Departments Analysis
  const departmentRatingsData = useMemo(() => {
    const groups: Record<string, { totalRating: number; count: number; reviews: number }> = {};
    teachers.forEach((t) => {
      if (t.totalReviews > 0) {
        const key = t.department.trim();
        if (!groups[key]) {
          groups[key] = { totalRating: 0, count: 0, reviews: 0 };
        }
        groups[key].totalRating += t.averageRating;
        groups[key].count += 1;
        groups[key].reviews += t.totalReviews;
      }
    });

    return Object.entries(groups)
      .map(([department, info]) => ({
        department,
        rating: parseFloat((info.totalRating / info.count).toFixed(2)),
        reviews: info.reviews,
        teachers: info.count
      }))
      .sort((a, b) => b.rating - a.rating);
  }, [teachers]);

  // Theme support
  const colors = {
    amber: "#f59e0b",
    indigo: "#6366f1",
    blue: "#3b82f6",
    emerald: "#10b981",
    rose: "#f43f5e",
    cyan: "#06b6d4"
  };

  return (
    <div id="admin-analytics-dashboard" className="space-y-6 animate-fade-in text-indigo-100">
      {/* Visual Analytics KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-900/60 to-indigo-950 p-4 rounded-2xl border border-indigo-850/70 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-indigo-300 uppercase font-black tracking-wider">Faculty Headcount</p>
            <p className="text-xl font-black text-white">{stats.totalTeachers}</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-900/60 to-indigo-950 p-4 rounded-2xl border border-indigo-850/70 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-xl text-amber-400">
            <Star className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-indigo-300 uppercase font-black tracking-wider">School Average</p>
            <p className="text-xl font-black text-white flex items-center gap-1">
              {stats.schoolAverage} <span className="text-xs text-indigo-400 font-medium">/ 5.0</span>
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-900/60 to-indigo-950 p-4 rounded-2xl border border-indigo-850/70 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-xl text-emerald-400">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-indigo-300 uppercase font-black tracking-wider">Historical Logs</p>
            <p className="text-xl font-black text-white">{stats.totalReviews} reviews</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-900/60 to-indigo-950 p-4 rounded-2xl border border-indigo-850/70 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-xl text-cyan-400">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-indigo-300 uppercase font-black tracking-wider">Most Active Subject</p>
            <p className="text-sm font-bold text-white truncate max-w-[150px]" title={stats.topSubject}>
              {stats.topSubject}
            </p>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Most Popular Teachers Chart (Bar Chart) */}
        <div className="lg:col-span-12 xl:col-span-7 bg-indigo-900/30 p-5 rounded-2xl border border-indigo-800/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Award className="h-4 w-4 text-yellow-400" />
                Most Popular & Highly Ranked Teachers
              </h3>
              <p className="text-[11px] text-indigo-300">Analysis of the top 8 educators based on review density and average score</p>
            </div>
            
            {/* Metric Sorter */}
            <div className="flex bg-indigo-950 p-0.5 rounded-lg border border-indigo-800 self-start">
              <button
                id="popular-metric-reviews-tab"
                type="button"
                onClick={() => setPopularMetric("reviews")}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition cursor-pointer ${
                  popularMetric === "reviews"
                    ? "bg-amber-500 text-indigo-950 shadow-md"
                    : "text-indigo-300 hover:text-white"
                }`}
              >
                Review Count
              </button>
              <button
                id="popular-metric-rating-tab"
                type="button"
                onClick={() => setPopularMetric("rating")}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition cursor-pointer ${
                  popularMetric === "rating"
                    ? "bg-amber-500 text-indigo-950 shadow-md"
                    : "text-indigo-300 hover:text-white"
                }`}
              >
                Average Rating
              </button>
            </div>
          </div>

          <div className="h-72 w-full text-xs">
            {popularTeachersData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-indigo-400">
                No active records to compile charts. Enter reviews first.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={popularTeachersData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a1f55" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#a5b4fc"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                  />
                  <YAxis
                    stroke="#a5b4fc"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={5}
                    domain={popularMetric === "reviews" ? [0, "auto"] : [0, 5]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e1b4b",
                      border: "1px solid #4338ca",
                      borderRadius: "0.75rem",
                      color: "#fff"
                    }}
                    labelStyle={{ fontWeight: "bold", color: "#fbbf24" }}
                  />
                  <Legend />
                  <Bar
                    dataKey={popularMetric === "reviews" ? "reviews" : "rating"}
                    name={popularMetric === "reviews" ? "Review Submissions" : "Avg Rating (1-5)"}
                    radius={[6, 6, 0, 0]}
                  >
                    {popularTeachersData.map((entry, idx) => {
                      const colHex = colors[entry.accentColor as keyof typeof colors] || colors.amber;
                      return <Cell key={`cell-${idx}`} fill={colHex} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Highest-Rated Subjects Line Graph */}
        <div className="lg:col-span-12 xl:col-span-5 bg-indigo-900/30 p-5 rounded-2xl border border-indigo-800/80 space-y-4">
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              Highest-Rated Academic Subjects
            </h3>
            <p className="text-[11px] text-indigo-300">Line graph visualization mapping average scores across courses</p>
          </div>

          <div className="h-72 w-full text-xs">
            {subjectRatingsData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-indigo-400">
                No active classes/subjects scored.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={subjectRatingsData} margin={{ top: 10, right: 15, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a1f55" vertical={false} />
                  <XAxis
                    dataKey="subject"
                    stroke="#a5b4fc"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    tickFormatter={(val) => (val.length > 10 ? val.substring(0, 9) + ".." : val)}
                  />
                  <YAxis
                    stroke="#a5b4fc"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={5}
                    domain={[1, 5]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e1b4b",
                      border: "1px solid #4338ca",
                      borderRadius: "0.75rem",
                      color: "#fff"
                    }}
                    labelStyle={{ fontWeight: "bold", color: "#22d3ee" }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="rating"
                    name="Average Rating"
                    stroke="#22d3ee"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#0891b2", strokeWidth: 1 }}
                    activeDot={{ r: 8, fill: "#22d3ee" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Analytics: Faculty Department Rating Stack */}
      <div className="bg-indigo-900/20 p-5 rounded-2xl border border-indigo-800/60">
        <h4 className="text-xs uppercase font-extrabold tracking-widest text-indigo-300 mb-4">
          Faculty Department Head-to-Head Comparison
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {departmentRatingsData.length === 0 ? (
            <div className="col-span-full py-4 text-center text-xs text-indigo-400">
              No department data aggregated yet.
            </div>
          ) : (
            departmentRatingsData.map((d) => (
              <div
                key={d.department}
                className="bg-indigo-950/60 p-4 rounded-xl border border-indigo-900 flex flex-col justify-between space-y-3"
              >
                <div>
                  <h5 className="font-bold text-xs text-white truncate" title={d.department}>
                    {d.department}
                  </h5>
                  <p className="text-[10px] text-indigo-450 mt-0.5">
                    {d.teachers} teachers • {d.reviews} ratings
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-indigo-300">Score Rating</span>
                    <span className="font-extrabold text-yellow-400">{d.rating.toFixed(2)} / 5</span>
                  </div>
                  {/* Rating Meter Bar */}
                  <div className="h-1.5 w-full bg-indigo-900/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                      style={{ width: `${(d.rating / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
