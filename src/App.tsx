/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Plus,
  Star,
  Shield,
  ThumbsUp,
  AlertOctagon,
  BookOpen,
  Filter,
  Check,
  Lock,
  Unlock,
  Trash2,
  TrendingUp,
  X,
  Sparkles,
  Award,
  Users,
  MessageSquare,
  Sun,
  Moon
} from "lucide-react";
import { Teacher, Review } from "./types";
import TeacherCard from "./components/TeacherCard";
import CreateTeacherModal from "./components/CreateTeacherModal";
import EditTeacherModal from "./components/EditTeacherModal";
import AdminAnalytics from "./components/AdminAnalytics";

// Dynamic constant declaration required by the guidelines:
// "Add a simple setting in the code like: const STUDENT_EDITING_ENABLED = true;"
const STUDENT_EDITING_ENABLED = true;

const DEFAULT_DEPARTMENTS = [
  "Mathematics",
  "Science",
  "English",
  "Humanities & Social Sciences",
  "Languages",
  "Creative & Performing Arts",
  "Health & Physical Education",
  "Technology & Applied Studies"
];

const GRADES = ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Alumni", "Parent"];

export default function App() {
  // Global Theme State (Persisted in localStorage)
  const [theme, setTheme] = useState<"light" | "dark" | "">("");

  // Set the theme when the component mounts on the client
  useEffect(() => {
    const saved = localStorage.getItem("rate-teachers-theme");
    const initialTheme = saved === "dark" || (saved !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
    setTheme(initialTheme);
  }, []);

  // Sync state changes with document element class
  useEffect(() => {
    if (!theme) return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("rate-teachers-theme", theme);
  }, [theme]);

  // State for raw list and configuration
  const [departments, setDepartments] = useState<string[]>(DEFAULT_DEPARTMENTS);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedTeacherReviews, setSelectedTeacherReviews] = useState<Review[]>([]);
  
  // Real-time student editing status (loaded and toggled dynamically from backend / system config)
  const [studentEditingState, setStudentEditingState] = useState(STUDENT_EDITING_ENABLED);
  
  // Search and browse state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All Departments");
  const [reviewsSortBy, setReviewsSortBy] = useState<"newest" | "highest">("newest");
  
  // UI Panels / Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isWriteReviewOpen, setIsWriteReviewOpen] = useState(false);

  // Review Input Form State
  const [reviewAuthor, setReviewAuthor] = useState("");
  const [reviewGrade, setReviewGrade] = useState("Year 11");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewIsAnonymous, setReviewIsAnonymous] = useState(false);
  const [ratingClarity, setRatingClarity] = useState(5);
  const [ratingHelpfulness, setRatingHelpfulness] = useState(5);
  const [ratingSupport, setRatingSupport] = useState(5);
  
  // Admin System Moderation State
  const [adminTab, setAdminTab] = useState<"moderation" | "analytics">("moderation");
  const [newDepartmentInput, setNewDepartmentInput] = useState("");
  const [allSystemReviews, setAllSystemReviews] = useState<Review[]>([]);
  const [adminReportReason, setAdminReportReason] = useState<Record<string, string>>({});
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleVerifyAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput })
      });
      if (res.ok) {
        setAdminPassword(passwordInput);
        setIsAdminAuthenticated(true);
        setPasswordError("");
        showToast("Admin credentials validated. Welcome back!", "success");
      } else {
        const data = await res.json();
        setPasswordError(data.error || "Secret credentials verification failed.");
      }
    } catch (err) {
      setPasswordError("Could not reach validation nodes. Check server status.");
    }
  };

  // Client notifications/errors
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [formFeedback, setFormFeedback] = useState<string | null>(null);

  // Load teachers list
  const loadTeachers = async () => {
    try {
      const res = await fetch("/api/teachers");
      if (res.ok) {
        const data = await res.json();
        setTeachers(data);
        // Automatically select the first teacher on load if none selected
        if (data.length > 0 && !selectedTeacher) {
          fetchTeacherDetails(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch teachers", err);
    }
  };

  // Load configuration system status
  const loadConfig = async () => {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        setStudentEditingState(data.studentEditingEnabled);
      }
    } catch (err) {
      console.error("Failed to load config", err);
    }
  };

  // Get deep details (including reviews list) for a selected teacher
  const fetchTeacherDetails = async (teacherId: string) => {
    try {
      const res = await fetch(`/api/teachers/${teacherId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTeacher(data.teacher);
        setSelectedTeacherReviews(data.reviews);
      }
    } catch (err) {
      console.error("Failed to load teacher reviews", err);
    }
  };

  // Fetch all reviews for admin panel management
  const fetchAdminReviews = async () => {
    try {
      const res = await fetch("/api/admin/reviews", {
        headers: {
          "x-admin-password": adminPassword
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAllSystemReviews(data.reviews);
      } else if (res.status === 401) {
        setIsAdminAuthenticated(false);
        showToast("Session expired or invalid admin password.", "error");
      }
    } catch (err) {
      console.error("Failed to load admin logs", err);
    }
  };

  // Load departments from server
  const loadDepartments = async () => {
    try {
      const res = await fetch("/api/departments");
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
      }
    } catch (err) {
      console.error("Failed to load departments", err);
    }
  };

  const handleAddDepartment = async (deptName: string) => {
    try {
      const res = await fetch("/api/admin/departments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword
        },
        body: JSON.stringify({ department: deptName })
      });
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments);
        showToast(`Department "${deptName}" added successfully.`, "success");
        return true;
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to add department.", "error");
        return false;
      }
    } catch (err) {
      showToast("Error reaching server to add department.", "error");
      return false;
    }
  };

  const handleDeleteDepartment = async (deptName: string) => {
    try {
      const res = await fetch("/api/admin/departments/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword
        },
        body: JSON.stringify({ department: deptName })
      });
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments);
        showToast(`Department "${deptName}" deleted successfully.`, "success");
        if (selectedDepartment === deptName) {
          setSelectedDepartment("All Departments");
        }
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to delete department.", "error");
      }
    } catch (err) {
      showToast("Error reaching server to delete department.", "error");
    }
  };

  // Initialize
  useEffect(() => {
    loadTeachers();
    loadConfig();
    loadDepartments();
  }, []);

  // Update lists inside admin logs if open and authorized
  useEffect(() => {
    if (isAdminPanelOpen && isAdminAuthenticated) {
      fetchAdminReviews();
    }
  }, [isAdminPanelOpen, isAdminAuthenticated]);

  // Handle Toast Feedback timing
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setFeedbackMsg({ text, type });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4500);
  };

  // Switch permissions in real-time for mock demo
  const toggleStudentEditing = async () => {
    if (!isAdminAuthenticated) {
      setIsAdminPanelOpen(true);
      showToast("Access Restricted. Please authenticate in the Administration console first.", "error");
      return;
    }
    try {
      const res = await fetch("/api/config/toggle", {
        method: "POST",
        headers: {
          "x-admin-password": adminPassword
        }
      });
      if (res.ok) {
        const data = await res.json();
        setStudentEditingState(data.studentEditingEnabled);
        showToast(
          `System state changed to: ${
            data.studentEditingEnabled ? "STUDENT EDITING ENABLED" : "VIEW ONLY MODE"
          }`,
          "success"
        );
      } else {
        const errData = await res.json();
        showToast(errData.error || "Failed to switch permissions", "error");
      }
    } catch (err) {
      showToast("Failed to switch permissions", "error");
    }
  };

  // Delete a teacher completely (Admin choice)
  const handleDeleteTeacher = async (teacherId: string) => {
    if (!window.confirm("Are you sure you want to delete this teacher profile and all their associated reviews? This cannot be undone.")) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/teachers/${teacherId}/delete`, {
        method: "POST",
        headers: {
          "x-admin-password": adminPassword
        }
      });
      if (res.ok) {
        showToast("Teacher profile and all reviews successfully purged.", "success");
        setTeachers(prev => prev.filter(t => t.id !== teacherId));
        if (selectedTeacher?.id === teacherId) {
          setSelectedTeacher(null);
          setSelectedTeacherReviews([]);
        }
      } else {
        const errData = await res.json();
        showToast(errData.error || "Failed to delete teacher", "error");
      }
    } catch (err) {
      showToast("Failed to delete teacher", "error");
    }
  };

  // Report review for admin review
  const handleReportReview = async (reviewId: string) => {
    const reason = window.prompt("Please list the reason for reporting this comment (e.g. offensive, spam, incorrect identity):");
    if (reason === null) return; // cancelled
    if (reason.trim() === "") {
      showToast("You must provide a reporting reason.", "error");
      return;
    }

    try {
      const res = await fetch(`/api/reviews/${reviewId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        showToast("Review has been reported to administrators for moderation.", "success");
        // reload details for selected teacher
        if (selectedTeacher) {
          fetchTeacherDetails(selectedTeacher.id);
        }
      } else {
        const errorData = await res.json();
        showToast(errorData.error || "Failed to submit report", "error");
      }
    } catch (err) {
      showToast("Error reporting review", "error");
    }
  };

  // Upvote/like a review
  const handleLikeReview = async (reviewId: string) => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        // Update local items instantly
        setSelectedTeacherReviews(prev =>
          prev.map(r => (r.id === reviewId ? { ...r, likes: data.likes } : r))
        );
      }
    } catch (err) {
      console.error("Failed to upvote", err);
    }
  };

  // Admin approves/keeps reported review
  const handleKeepReviewAdmin = async (reviewId: string) => {
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}/keep`, {
        method: "POST",
        headers: {
          "x-admin-password": adminPassword
        }
      });
      if (res.ok) {
        showToast("Review cleared of all standard report flags.", "success");
        fetchAdminReviews();
        if (selectedTeacher) {
          fetchTeacherDetails(selectedTeacher.id);
        }
      } else {
        const errData = await res.json();
        showToast(errData.error || "Error approving review", "error");
      }
    } catch (err) {
      showToast("Error approving review", "error");
    }
  };

  // Admin purges reported review
  const handleDeleteReviewAdmin = async (reviewId: string) => {
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}/delete`, {
        method: "POST",
        headers: {
          "x-admin-password": adminPassword
        }
      });
      if (res.ok) {
        showToast("Review deleted successfully.", "success");
        fetchAdminReviews();
        if (selectedTeacher) {
          fetchTeacherDetails(selectedTeacher.id);
        }
      } else {
        const errData = await res.json();
        showToast(errData.error || "Error deleting review", "error");
      }
    } catch (err) {
      showToast("Error deleting review", "error");
    }
  };

  // Post a new review
  const handlePostReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) return;

    if (!studentEditingState) {
      setFormFeedback("Review creation is currently locked. The system is in View-Only mode.");
      return;
    }

    if (!reviewComment.trim() || reviewComment.trim().length < 5) {
      setFormFeedback("Review comment must represent a constructive, clear sentence (minimum 5 characters).");
      return;
    }

    setFormFeedback(null);

    const payload = {
      ratingClarity,
      ratingHelpfulness,
      ratingSupport,
      comment: reviewComment,
      author: reviewIsAnonymous ? "Anonymous Student" : (reviewAuthor.trim() || "Anonymous Student"),
      grade: reviewGrade,
      isAnonymous: reviewIsAnonymous
    };

    try {
      const res = await fetch(`/api/teachers/${selectedTeacher.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit review.");
      }

      showToast("Thank you! Review published successfully.", "success");
      // Reset review inputs
      setReviewComment("");
      setReviewAuthor("");
      setIsWriteReviewOpen(false);
      
      // Reload current teacher statistics
      fetchTeacherDetails(selectedTeacher.id);
      loadTeachers(); // Reload teachers list to update card averages instantly
    } catch (err: any) {
      setFormFeedback(err.message || "Something went wrong.");
    }
  };

  // Filter teachers by name or subject & department
  const filteredTeachers = teachers.filter((t) => {
    const matchesQuery =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept =
      selectedDepartment === "All Departments" || t.department === selectedDepartment;
    return matchesQuery && matchesDept;
  });

  // Sort current view reviews
  const sortedReviews = [...selectedTeacherReviews].sort((a, b) => {
    if (reviewsSortBy === "highest") {
      return b.rating - a.rating;
    } else {
      // Newest first by timestamp
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
  });

  // Quick stat sums
  const globalTotalReviews = teachers.reduce((acc, t) => acc + t.totalReviews, 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100 selection:bg-yellow-200">
      
      {/* Toast popup */}
      {feedbackMsg && (
        <div id="global-toast-feedback" className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3.5 shadow-2xl dark:shadow-none animate-fade-in">
          <div className={`p-1 rounded-full ${feedbackMsg.type === "success" ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" : "bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"}`}>
            <Check className="h-4 w-4 stroke-[3]" />
          </div>
          <span className="text-sm font-bold text-gray-800 dark:text-slate-200">{feedbackMsg.text}</span>
        </div>
      )}

      {/* Modern High-Aesthetic Header (Adaptive Theme Gradient) */}
      <header className="bg-gradient-to-r from-indigo-600 to-indigo-800 dark:from-slate-900 dark:to-slate-950 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg dark:shadow-none dark:border-b dark:border-slate-800 z-10">
        
        {/* Brand Logo with rotating Yellow Badge */}
        <div className="flex items-center gap-3">
          <div className="bg-yellow-400 p-2.5 rounded-2xl rotate-3 shadow-md border-2 border-white dark:border-slate-800 transition transform hover:rotate-6 flex items-center justify-center">
            <Award className="w-5 h-5 text-indigo-950 font-black" />
          </div>
          <div>
            <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-200 dark:text-slate-400">COMPASS INTEGRATION</span>
            <h1 className="text-2xl font-black text-white tracking-tight leading-none">RATE MY TEACHERS</h1>
          </div>
        </div>

        {/* Dynamic Header Search */}
        <div className="flex-1 max-w-lg mx-0 md:mx-6 w-full">
          <div className="relative">
            <input
              id="global-search-query-field"
              type="text"
              placeholder="Search teachers by name, curriculum or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-indigo-700/50 border border-indigo-500/50 rounded-2xl py-2.5 pl-11 pr-5 text-sm text-white placeholder-indigo-200 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition"
            />
            <div className="absolute left-4 top-3 text-indigo-200">
              <Search className="w-4.5 h-4.5" />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-2 text-indigo-200 hover:text-white text-xs font-bold"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Live Config Indicator, Theme Toggle & Admin Deck Button */}
        <div className="flex items-center gap-3.5 flex-wrap">
          <button
            id="student-editing-indicator-badge"
            onClick={toggleStudentEditing}
            title="Click as Administrator to toggle lock"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider transition ${
              studentEditingState
                ? "bg-indigo-700/80 border-indigo-400/40 text-white hover:bg-indigo-700"
                : "bg-rose-950/20 border-rose-500/50 text-rose-300 hover:bg-rose-900/40"
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${studentEditingState ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`}></span>
            <span>{studentEditingState ? "Student Editing: Enabled" : "View-only / Signed"}</span>
          </button>

          {/* Global Accessible Theme Toggle */}
          <button
            id="global-theme-toggle-btn"
            onClick={() => setTheme((prev) => (prev === "dark" || !prev ? "light" : "dark"))}
            title={theme === "dark" ? "Activate Light Theme" : "Activate Dark Theme"}
            className="p-2.5 rounded-2xl bg-indigo-700/50 dark:bg-slate-800 hover:bg-yellow-400 dark:hover:bg-yellow-400 hover:text-indigo-950 dark:hover:text-indigo-950 text-indigo-100 dark:text-slate-200 transition border border-indigo-500/30 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-yellow-400 flex items-center justify-center cursor-pointer"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-yellow-350 stroke-[2.5]" />
            ) : (
              <Moon className="h-4 w-4 stroke-[2.5]" />
            )}
          </button>

          <button
            id="admin-panel-trigger-btn"
            onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
            className={`px-4.5 py-2 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition ${
              isAdminPanelOpen
                ? "bg-yellow-400 text-indigo-950 shadow-md"
                : "bg-white dark:bg-slate-800 text-indigo-700 dark:text-slate-200 hover:bg-yellow-500 hover:text-indigo-950 dark:hover:bg-yellow-400 dark:hover:text-indigo-950"
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            {isAdminPanelOpen ? "Close Admin Panel" : "Admin Deck"}
          </button>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Admin Portal Dashboard (Drop-down deck when active) */}
        {isAdminPanelOpen && (
          <div id="admin-panel-deck" className="lg:col-span-12 bg-indigo-950 text-indigo-100 rounded-3xl p-6 shadow-xl border border-indigo-800 animate-slide-in">
            {!isAdminAuthenticated ? (
              <div className="max-w-md mx-auto py-8 px-4 text-center">
                <div className="inline-flex items-center justify-center p-4 bg-yellow-400/10 rounded-full text-yellow-400 mb-4 ring-8 ring-yellow-400/5">
                  <Lock className="w-8 h-8 stroke-[2.5]" />
                </div>
                <h2 className="text-xl font-black text-white tracking-tight">ADMIN ACCESS RESTRICTED</h2>

                
                <form onSubmit={handleVerifyAdminPassword} className="mt-6 flex flex-col gap-3">
                  <div className="relative">
                    <input
                      id="admin-password-input-field"
                      type="password"
                      placeholder="Enter Admin Password..."
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        setPasswordError("");
                      }}
                      className="w-full bg-indigo-900/60 border-2 border-indigo-800/85 rounded-2xl py-3 px-5 text-sm text-center text-white placeholder-indigo-400 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition"
                      autoFocus
                    />
                  </div>
                  
                  {passwordError && (
                    <p className="text-xs font-bold text-rose-400 bg-rose-950/40 py-1.5 px-3 rounded-lg border border-rose-900/40 animate-pulse">
                      {passwordError}
                    </p>
                  )}
                  
                  <button
                    id="admin-password-submit-btn"
                    type="submit"
                    className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-indigo-950 font-extrabold text-sm rounded-2xl transition shadow-lg shadow-yellow-400/10"
                  >
                    Authenticate Console
                  </button>
                </form>
                <p className="mt-4.5 text-[11px] text-indigo-300 font-semibold">
                  Hint: Use default password <code className="bg-indigo-900 border border-indigo-800 text-yellow-300 px-1.5 py-0.5 rounded font-mono font-extrabold">admin123</code> to authenticate
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-indigo-800 pb-4 mb-5 gap-3">
                  <div>
                    <h2 className="text-lg font-black text-white flex items-center gap-2">
                      <Shield className="h-5 w-5 text-yellow-400" />
                      Rate My Teachers Admin & Moderation Console
                    </h2>
                    <p className="text-xs text-indigo-300 mt-0.5">Maintain curriculum transparency, moderate flag reports, and manage database nodes</p>
                  </div>

                  {/* Quick toggle lock */}
                  <button
                    id="admin-system-toggle-lock-btn"
                    onClick={toggleStudentEditing}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                      studentEditingState
                        ? "bg-rose-600 hover:bg-rose-700 text-white"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                  >
                    {studentEditingState ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                    {studentEditingState ? "Switch to View-Only Mode" : "Turn On Student Editing"}
                  </button>
                </div>

                {/* Sub-panel Toggles / Tabs */}
                <div className="flex border-b border-indigo-900 mb-6 gap-6">
                  <button
                    id="admin-tab-moderation-btn"
                    type="button"
                    onClick={() => setAdminTab("moderation")}
                    className={`pb-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer ${
                      adminTab === "moderation"
                        ? "border-yellow-400 text-white"
                        : "border-transparent text-indigo-400 hover:text-indigo-200"
                    }`}
                  >
                    Moderation & Directory
                  </button>
                  <button
                    id="admin-tab-analytics-btn"
                    type="button"
                    onClick={() => setAdminTab("analytics")}
                    className={`pb-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer ${
                      adminTab === "analytics"
                        ? "border-yellow-400 text-white"
                        : "border-transparent text-indigo-400 hover:text-indigo-200"
                    }`}
                  >
                    Performance Analytics
                  </button>
                </div>

                {adminTab === "moderation" ? (
                  /* Reported & All Reviews Analytics Table */
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-8 space-y-3">
                    <h3 className="text-xs uppercase font-extrabold tracking-widest text-indigo-300">
                      Total Reviews on Moderation Queue
                    </h3>
                    
                    <div className="max-h-72 overflow-y-auto rounded-xl border border-indigo-800 bg-indigo-900/40 p-1 divide-y divide-indigo-800/60">
                      {allSystemReviews.length === 0 ? (
                        <div className="p-8 text-center text-xs text-indigo-400">
                          No reviews found in DB log nodes. Live stream is waiting.
                        </div>
                      ) : (
                        allSystemReviews.map((rev) => {
                          const teacher = teachers.find(t => t.id === rev.teacherId);
                          return (
                            <div key={rev.id} className={`p-3 text-xs transition ${rev.isReported ? "bg-rose-950/30" : ""}`}>
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <div>
                                  <span className="font-bold text-white text-sm">{rev.author}</span>
                                  <span className="text-indigo-400 ml-1">concerning</span>
                                  <span className="font-bold text-yellow-400 ml-1">{teacher ? teacher.name : "Unknown"}</span>
                                  <span className="text-indigo-400 ml-2">({rev.grade})</span>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1">
                                  {rev.isReported && (
                                    <button
                                      id={`admin-keep-review-${rev.id}`}
                                      onClick={() => handleKeepReviewAdmin(rev.id)}
                                      className="px-2 py-0.5 rounded-md bg-emerald-600 text-[10px] font-bold text-white hover:bg-emerald-700 uppercase"
                                    >
                                      Clear Flags
                                    </button>
                                  )}
                                  <button
                                    id={`admin-delete-review-${rev.id}`}
                                    onClick={() => handleDeleteReviewAdmin(rev.id)}
                                    className="p-1 rounded bg-rose-600 hover:bg-rose-700 text-white"
                                    title="Delete review instantly"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              <p className="text-indigo-200 leading-relaxed font-medium bg-black/10 p-2 rounded">{rev.comment}</p>
                              
                              {rev.isReported && (
                                <div className="mt-2 text-[10px] text-rose-300 font-bold flex items-center gap-1">
                                  <AlertOctagon className="h-3 w-3 shrink-0 text-rose-400" />
                                  <span>Report Reason ({rev.reportCount} flags): {rev.reportReason || "Not specified."}</span>
                                </div>
                              )}
                              <div className="mt-1 text-[10px] text-indigo-400 font-mono text-right">
                                Node ID: {rev.id} | Date: {new Date(rev.date).toLocaleDateString()}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Faculty Directory Management Block */}
                  <div className="md:col-span-4 space-y-4">
                    <div className="bg-indigo-900/80 p-4 rounded-xl border border-indigo-800">
                      <h4 className="text-xs uppercase font-extrabold tracking-widest text-indigo-300 mb-2">Faculty & Spanning Stats</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-indigo-300">Registered Teachers:</span>
                          <span className="font-bold text-white">{teachers.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-indigo-300">Total Review Votes:</span>
                          <span className="font-bold text-white">{globalTotalReviews}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-indigo-300">Reported Content:</span>
                          <span className="font-bold text-rose-300">
                            {allSystemReviews.filter(r => r.isReported).length} reviews
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-indigo-900/70 p-4 rounded-xl border border-indigo-800 space-y-3">
                      <h4 className="text-xs uppercase font-extrabold tracking-widest text-indigo-300">
                        Manage Subject Departments
                      </h4>
                      
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!newDepartmentInput.trim()) return;
                          const success = await handleAddDepartment(newDepartmentInput);
                          if (success) {
                            setNewDepartmentInput("");
                          }
                        }}
                        className="flex gap-1.5"
                      >
                        <input
                          id="admin-add-department-input"
                          type="text"
                          placeholder="New department..."
                          value={newDepartmentInput}
                          onChange={(e) => setNewDepartmentInput(e.target.value)}
                          className="flex-1 bg-indigo-950/80 border border-indigo-800 rounded-lg px-2 p-1.5 text-xs text-white placeholder-indigo-400 focus:outline-none focus:border-yellow-400"
                        />
                        <button
                          id="admin-add-department-btn"
                          type="submit"
                          className="px-3 bg-yellow-400 hover:bg-yellow-500 text-indigo-950 rounded-lg text-xs font-extrabold transition shrink-0 cursor-pointer"
                        >
                          Add
                        </button>
                      </form>

                      <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                        {departments.map((dept) => (
                          <div
                            key={dept}
                            className="flex items-center justify-between text-xs bg-indigo-950/40 border border-indigo-850/60 p-1.5 px-2 rounded-lg"
                          >
                            <span className="truncate font-semibold text-indigo-100">{dept}</span>
                            <button
                              id={`admin-delete-dept-${dept.replace(/\s+/g, '-').toLowerCase()}`}
                              type="button"
                              onClick={() => handleDeleteDepartment(dept)}
                              className="p-0.5 rounded text-indigo-400 hover:text-rose-400 hover:bg-indigo-900/30 transition cursor-pointer"
                              title="Delete department"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-indigo-900/60 p-4 rounded-xl border border-indigo-800">
                      <h4 className="text-xs uppercase font-extrabold tracking-widest text-indigo-300 mb-3 block">Danger Area: Destructive list</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {teachers.map((t) => (
                          <div key={t.id} className="flex items-center justify-between gap-1 text-xs border-b border-indigo-800/40 pb-1.5 last:border-none">
                            <span className="truncate text-white font-medium">{t.name}</span>
                            <div className="flex gap-1.5 shrink-0">
                              <button
                                onClick={() => {
                                  setSelectedTeacher(t);
                                  setIsEditModalOpen(true);
                                }}
                                className="p-1 rounded bg-amber-950 text-amber-450 hover:bg-amber-900 transition cursor-pointer"
                                title="Edit profile"
                              >
                                <Sparkles className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteTeacher(t.id)}
                                className="p-1 rounded bg-rose-950 text-rose-400 hover:bg-rose-900 transition"
                                title="Purge completely"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                ) : (
                  <AdminAnalytics teachers={teachers} allReviews={allSystemReviews} />
                )}
              </>
            )}
          </div>
        )}

        {/* Column 1: Directory Selection & Department Faculty Filters (Bento Grid) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Curriculum Faculty Directory
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Select any teacher profile to read reviews and submit ratings</p>
            </div>

            {/* Department Faculty Filter */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase shrink-0">Faculty:</span>
              <select
                id="faculty-department-dropdown"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 w-full md:w-auto shadow-xs"
              >
                {["All Departments", ...departments].map((dept) => (
                  <option key={dept} value={dept} className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Teacher Bento Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <AnimatePresence mode="popLayout">
              {filteredTeachers.length === 0 ? (
                <motion.div
                  key="empty-teachers-directory"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="col-span-full bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border-2 border-dashed border-gray-200 dark:border-slate-800"
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 dark:bg-slate-800 text-amber-500 mb-3">
                    <Search className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-gray-800 dark:text-white">No teachers found</h3>
                  <p className="text-xs text-gray-400 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                    Try refining your search keyword or selecting a different Faculty department from the filter dropdown above.
                  </p>
                </motion.div>
              ) : (
                filteredTeachers.map((t) => (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                  >
                    <TeacherCard
                      teacher={t}
                      onSelect={(sel) => fetchTeacherDetails(sel.id)}
                    />
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Upload New Profile Action Card (Compass Photo & honorific prefix) */}
          <div className="bg-[#f0f4ff] dark:bg-indigo-900/10 rounded-3xl p-6 border-2 border-indigo-100/80 dark:border-indigo-900/40 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-black text-slate-800 dark:text-white">Missing a teacher profile on this list?</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Authorized administrators can quickly establish profile pages using the official dashboard tools!
                </p>
              </div>
            </div>

            <button
              id="upload-new-teacher-trigger-btn"
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-indigo-600 text-white font-bold px-5 py-3 rounded-2xl hover:bg-indigo-700 transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10 shrink-0 text-sm"
            >
              <Plus className="h-4 w-4" /> Create Profile
            </button>
          </div>
        </div>

        {/* Column 2: Selected Teacher Insight Card & Reviews Stack */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {selectedTeacher ? (
            <div className="flex flex-col gap-6">
              
              {/* Profile Card Summary */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-md border-2 border-slate-100 dark:border-slate-800 flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 dark:text-slate-500">ID: {selectedTeacher.id}</span>
                </div>

                <div className="relative mb-4 mt-1">
                  <div className="w-28 h-28 rounded-3xl bg-indigo-50 dark:bg-slate-950 overflow-hidden border-4 border-white dark:border-slate-900 shadow-lg relative flex items-center justify-center animate-pulse">
                    {selectedTeacher.avatar ? (
                      <img
                        src={selectedTeacher.avatar}
                        alt={selectedTeacher.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-black text-indigo-500 dark:text-indigo-400">
                        {selectedTeacher.name.split(" ").map(n => n[0]).join("")}
                      </span>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-indigo-950 font-black px-2.5 py-1 rounded-xl text-xs border-2 border-white dark:border-slate-900 shadow-md">
                    {selectedTeacher.totalReviews > 0 ? selectedTeacher.averageRating.toFixed(1) : "—"}
                  </div>
                </div>

                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{selectedTeacher.name}</h2>
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{selectedTeacher.department} Department</span>
                <p className="text-indigo-600 dark:text-indigo-400 font-extrabold text-sm mt-1">{selectedTeacher.subject}</p>
                
                {selectedTeacher.bio && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 border-t border-slate-100 dark:border-slate-800 pt-3 italic">
                    &ldquo;{selectedTeacher.bio}&rdquo;
                  </p>
                )}

                {/* Subcategory Ratings Progression Bars */}
                {selectedTeacher.totalReviews > 0 ? (
                  <div className="w-full space-y-3 mt-5 text-left border-t border-slate-100 dark:border-slate-800 pt-5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Classroom Sub-ratings</span>
                    
                    {/* Clarity Progress Indicator */}
                    <div>
                      <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-350">
                        <span>Teacher Clarity</span>
                        <span className="text-indigo-600 dark:text-indigo-400">{(selectedTeacher.ratingClarity * 20).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-850 h-1.5 rounded-full mt-1.5">
                        <div
                          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500 shadow-xs"
                          style={{ width: `${selectedTeacher.ratingClarity * 20}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Helpfulness Progress Indicator */}
                    <div>
                      <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-350">
                        <span>Classroom Helpfulness</span>
                        <span className="text-amber-500">{(selectedTeacher.ratingHelpfulness * 20).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-850 h-1.5 rounded-full mt-1.5">
                        <div
                          className="bg-amber-400 h-1.5 rounded-full transition-all duration-500 shadow-xs"
                          style={{ width: `${selectedTeacher.ratingHelpfulness * 20}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Student Support Progress Indicator */}
                    <div>
                      <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-350">
                        <span>Extra Student Support</span>
                        <span className="text-emerald-500">{(selectedTeacher.ratingSupport * 20).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-850 h-1.5 rounded-full mt-1.5">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500 shadow-xs"
                          style={{ width: `${selectedTeacher.ratingSupport * 20}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 text-xs text-center border border-slate-100 dark:border-slate-850">
                    No classroom insights have been reported yet. Start the record by leaving the first score card!
                  </div>
                )}

                {/* Direct Write Review Button & Admin Edit Profile Button */}
                <div className="w-full flex gap-3 mt-5">
                  <button
                    id="write-review-on-profile-card-btn"
                    onClick={() => setIsWriteReviewOpen(true)}
                    className="flex-grow bg-indigo-600 text-white font-bold py-3.5 rounded-2xl shadow-lg dark:shadow-none shadow-indigo-200/50 hover:scale-[1.01] active:scale-[0.99] transition flex items-center justify-center gap-2 text-sm cursor-pointer"
                  >
                    <Plus className="h-4.5 w-4.5" />
                    Leave rating & Review
                  </button>
                  <button
                    id="edit-teacher-profile-btn"
                    onClick={() => setIsEditModalOpen(true)}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 px-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 hover:scale-[1.01] active:scale-[0.99] transition text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Edit Teacher Profile"
                  >
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Edit Profile
                  </button>
                </div>
              </div>              {/* Collapsible Write Review Form Segment */}
              {isWriteReviewOpen && (
                <div id="write-review-form-segment" className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-lg dark:shadow-none border border-indigo-100 dark:border-slate-800 animate-slide-in">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2 mb-4">
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-1.5">
                      <Plus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      Publish Rating Card
                    </h3>
                    <button onClick={() => setIsWriteReviewOpen(false)} className="text-gray-400 dark:text-slate-500 hover:text-gray-650 hover:text-gray-600 dark:hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {formFeedback && (
                    <div className="mb-4 rounded-xl bg-orange-50 dark:bg-orange-950/20 p-3 text-xs font-semibold text-orange-700 dark:text-orange-300 border border-orange-100 dark:border-orange-900/40 leading-relaxed">
                      {formFeedback}
                    </div>
                  )}

                  {!studentEditingState && (
                    <div className="rounded-xl bg-rose-50 dark:bg-rose-950/20 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900/40 mb-4 flex items-start gap-2">
                      <Lock className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">System Lock: View Only</p>
                        <p className="font-normal text-rose-600 dark:text-rose-450 mt-0.5">Students are currently restricted from publishing ratings. Turn edit permission on within the Admin Deck.</p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handlePostReview} className="space-y-4">
                    
                    {/* Visual Stars for Clarity */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Explanation Clarity Rating
                      </label>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setRatingClarity(s)}
                            disabled={!studentEditingState}
                            className="p-1 group shrink-0"
                          >
                            <Star className={`h-6 w-6 transition ${s <= ratingClarity ? "fill-amber-400 stroke-amber-400 hover:scale-110" : "text-gray-200 dark:text-slate-700"}`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Visual Stars for Helpfulness */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Classroom Helpfulness Rating
                      </label>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setRatingHelpfulness(s)}
                            disabled={!studentEditingState}
                            className="p-1 group shrink-0"
                          >
                            <Star className={`h-6 w-6 transition ${s <= ratingHelpfulness ? "fill-amber-400 stroke-amber-400 hover:scale-110" : "text-gray-200 dark:text-slate-700"}`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Visual Stars for Extra Support */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Out of Hours Support Rating
                      </label>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setRatingSupport(s)}
                            disabled={!studentEditingState}
                            className="p-1 group shrink-0"
                          >
                            <Star className={`h-6 w-6 transition ${s <= ratingSupport ? "fill-amber-400 stroke-amber-400 hover:scale-110" : "text-gray-200 dark:text-slate-700"}`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Comment Area */}
                    <div>
                      <label htmlFor="review-comment-textarea" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                        Review Commentary <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        id="review-comment-textarea"
                        placeholder="Write constructive details (e.g. He helps with practice exams, but speaks fairly quickly through chapters)."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        required
                        disabled={!studentEditingState}
                        rows={3.5}
                        maxLength={400}
                        className="w-full rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2 text-xs placeholder-gray-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                      />
                      <div className="flex justify-between items-center text-[10px] text-gray-400 dark:text-slate-500 mt-1">
                        <span className="font-semibold text-rose-500">Spam Checker active</span>
                        <span>{reviewComment.length}/400 characters</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      {/* Author */}
                      <div>
                        <label htmlFor="review-author-input" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                          Your Identifier
                        </label>
                        <input
                          id="review-author-input"
                          type="text"
                          placeholder="e.g. Marcus A."
                          value={reviewAuthor}
                          onChange={(e) => setReviewAuthor(e.target.value)}
                          disabled={reviewIsAnonymous || !studentEditingState}
                          className="w-full rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2 text-xs placeholder-gray-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                        />
                      </div>

                      {/* Grade */}
                      <div>
                        <label htmlFor="review-grade-select" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                          Grade Context
                        </label>
                        <select
                          id="review-grade-select"
                          value={reviewGrade}
                          onChange={(e) => setReviewGrade(e.target.value)}
                          disabled={!studentEditingState}
                          className="w-full rounded-xl border border-gray-205 border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          {GRADES.map((g) => (
                            <option key={g} value={g} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                              {g}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Anonymous toggle */}
                    <div className="flex items-center gap-2">
                      <input
                        id="anonymous-checkbox"
                        type="checkbox"
                        checked={reviewIsAnonymous}
                        onChange={(e) => {
                          setReviewIsAnonymous(e.target.checked);
                          if (e.target.checked) setReviewAuthor("");
                        }}
                        disabled={!studentEditingState}
                        className="rounded border-gray-300 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="anonymous-checkbox" className="text-xs font-bold text-slate-650 dark:text-slate-350 select-none cursor-pointer">
                        Post Anonymously
                      </label>
                    </div>

                    {/* Form submissions */}
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsWriteReviewOpen(false)}
                        className="flex-1 rounded-xl border border-gray-200 dark:border-slate-800 py-2 text-xs font-semibold text-gray-700 dark:text-slate-350 hover:bg-gray-50 dark:hover:bg-slate-805 hover:text-gray-900 dark:hover:text-white uppercase"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!studentEditingState}
                        className="flex-grow rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-2.5 text-xs font-extrabold text-white uppercase shadow-md hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99] transition duration-150"
                      >
                        Publish Card
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Reviews Feed Stack */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2.5">
                  <h3 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                    {selectedTeacherReviews.length} Student Reviews
                  </h3>

                  {/* Ordering Criteria */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Sort:</span>
                    <select
                      id="reviews-sorting-dropdown"
                      value={reviewsSortBy}
                      onChange={(e) => setReviewsSortBy(e.target.value as any)}
                      className="bg-transparent dark:bg-slate-900 text-[11px] font-bold text-slate-600 dark:text-slate-350 outline-none cursor-pointer"
                    >
                      <option value="newest" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Newest First</option>
                      <option value="highest" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Highest Rated</option>
                    </select>
                  </div>
                </div>

                {/* List items */}
                <div className="space-y-4 max-h-[32rem] overflow-y-auto pr-1">
                  <AnimatePresence mode="popLayout">
                    {sortedReviews.length === 0 ? (
                      <motion.div
                        key="empty-reviews-state"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-100 dark:border-slate-800 text-slate-450 dark:text-slate-400 text-xs"
                      >
                        No ratings yet. Click leave rating above to capture the first school review!
                      </motion.div>
                    ) : (
                      sortedReviews.map((rev) => (
                        <motion.div
                          key={rev.id}
                          layout
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          id={`review-item-${rev.id}`}
                          className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-xs border border-slate-100 dark:border-slate-800 transition hover:border-slate-200 dark:hover:border-slate-705"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <div className="flex text-amber-400">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3.5 w-3.5 ${
                                      i < Math.round(rev.rating) ? "fill-amber-400 stroke-amber-400" : "text-gray-200 dark:text-slate-755"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">
                                {rev.grade}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                              {new Date(rev.date).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric"
                              })}
                            </span>
                          </div>

                          <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed mb-4 whitespace-pre-wrap">
                            {rev.comment}
                          </p>

                          <div className="flex items-center justify-between border-t border-gray-50 dark:border-slate-805 pt-3 dark:border-slate-805 border-slate-100">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleLikeReview(rev.id)}
                                className="text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 dark:hover:text-amber-400 flex items-center gap-1 select-none cursor-pointer"
                                title="Upvote review"
                              >
                                <ThumbsUp className="h-3 w-3" /> Helpful ({rev.likes})
                              </button>
                              <button
                                onClick={() => handleReportReview(rev.id)}
                                className="text-[10px] font-black uppercase text-slate-400 hover:text-red-500 cursor-pointer"
                              >
                                Report Spam
                              </button>
                            </div>
                            <div className="text-[10px] italic text-slate-400 dark:text-slate-500 font-bold">
                              — {rev.isAnonymous ? "Anonymous" : rev.author}
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border-2 border-gray-100 dark:border-slate-800 flex flex-col items-center justify-center min-h-[25rem]">
              <div className="h-16 w-16 bg-indigo-50 dark:bg-slate-800 text-indigo-500 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-4 animate-bounce">
                <Users className="h-8 w-8" />
              </div>
              <p className="text-gray-800 dark:text-white font-extrabold text-sm">No teacher profile selected</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-2 max-w-xs leading-relaxed">
                Click index directory items or visual cards to view student reviews, average statistics, and sub-clarity ratings!
              </p>
            </div>
          )}
        </div>

      </main>

      {/* Modern Static Humanized Footer requested by design */}
      <footer className="mt-auto bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-850 px-6 py-4 flex flex-col md:flex-row items-center justify-between text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest gap-2">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-1">
          <span className="flex items-center gap-1">
            <Check className="h-3 w-3 text-emerald-500 stroke-[3]" /> Spam Filter: Dynamic
          </span>
          <span className="flex items-center gap-1">
            <Check className="h-3 w-3 text-emerald-500 stroke-[3]" /> Content Verification active
          </span>
          <span className="flex items-center gap-1">
            <Check className="h-3 w-3 text-emerald-500 stroke-[3]" /> Compass profiles synced
          </span>
        </div>
        <div className="text-indigo-600 dark:text-indigo-400 text-center md:text-right font-black flex items-center justify-center md:justify-end gap-2.5">
          <span>Rate My Teachers • Built for high fidelity transparency • 2026</span>
          <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/40 uppercase tracking-normal">v1.2.2</span>
        </div>
      </footer>

      {/* Create Teacher Modal integration */}
      {isUploadModalOpen && (
        <CreateTeacherModal
          studentEditingEnabled={studentEditingState}
          adminPassword={adminPassword}
          isAdminAuthenticated={isAdminAuthenticated}
          departments={departments}
          onAdminLoginSuccess={(password) => {
            setAdminPassword(password);
            setIsAdminAuthenticated(true);
            showToast("Admin access authenticated successfully!", "success");
          }}
          onClose={() => setIsUploadModalOpen(false)}
          onCreated={(newTeacher) => {
            setIsUploadModalOpen(false);
            showToast(`Profile for ${newTeacher.name} successfully established!`, "success");
            loadTeachers();
            fetchTeacherDetails(newTeacher.id);
          }}
        />
      )}

      {/* Edit Teacher Modal integration */}
      {isEditModalOpen && selectedTeacher && (
        <EditTeacherModal
          teacher={selectedTeacher}
          studentEditingEnabled={studentEditingState}
          adminPassword={adminPassword}
          isAdminAuthenticated={isAdminAuthenticated}
          departments={departments}
          onAdminLoginSuccess={(password) => {
            setAdminPassword(password);
            setIsAdminAuthenticated(true);
            showToast("Admin access authenticated successfully!", "success");
          }}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={(updatedTeacher) => {
            setIsEditModalOpen(false);
            showToast(`Profile for ${updatedTeacher.name} successfully updated!`, "success");
            loadTeachers();
            fetchTeacherDetails(updatedTeacher.id);
          }}
        />
      )}

    </div>
  );
}
