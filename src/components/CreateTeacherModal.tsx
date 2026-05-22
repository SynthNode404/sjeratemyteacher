/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { X, Upload, Check, AlertTriangle, Image as ImageIcon, Lock } from "lucide-react";
import { Teacher } from "../types";

interface CreateTeacherModalProps {
  onClose: () => void;
  onCreated: (newTeacher: Teacher) => void;
  studentEditingEnabled: boolean;
  adminPassword?: string;
  isAdminAuthenticated?: boolean;
  onAdminLoginSuccess?: (password: string) => void;
  departments?: string[];
}

const DEPARTMENTS = [
  "Mathematics",
  "Science",
  "English",
  "Humanities & Social Sciences",
  "Languages",
  "Creative & Performing Arts",
  "Health & Physical Education",
  "Technology & Applied Studies"
];

const ACCENTS = ["emerald", "blue", "violet", "amber", "rose", "cyan"];

export default function CreateTeacherModal({
  onClose,
  onCreated,
  studentEditingEnabled,
  adminPassword = "",
  isAdminAuthenticated = false,
  onAdminLoginSuccess,
  departments = []
}: CreateTeacherModalProps) {
  const activeDepartments = departments.length > 0 ? departments : DEPARTMENTS;

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [department, setDepartment] = useState(activeDepartments[0]);
  const [bio, setBio] = useState("");
  const [accentColor, setAccentColor] = useState("emerald");
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalAdminPasswordInput, setModalAdminPasswordInput] = useState("");
  const [modalAdminPasswordError, setModalAdminPasswordError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert uploaded image to Base64
  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select an image file (PNG, JPG, JPEG).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) { // 8MB limit
      setErrorMessage("The image file is too large. Real-time DB limits files to 8MB.");
      return;
    }

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setUploadingImage(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminAuthenticated) {
      setErrorMessage("Only school administrators are authorized to establish new teacher profiles.");
      return;
    }

    if (!name.trim() || !subject.trim()) {
      setErrorMessage("Please fill in the teacher's name and subject.");
      return;
    }

    // High fidelity validation: require prefix or full format to keep quality high!
    const cleanName = name.trim();
    if (!/^(mr|ms|mrs|dr|prof|mx)\.?\s/i.test(cleanName)) {
      setErrorMessage("Please include an honorific prefix (e.g. Mr. Smith, Ms. Carter, Dr. Rogers).");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/teachers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword
        },
        body: JSON.stringify({
          name: cleanName,
          subject: subject.trim(),
          department,
          bio: bio.trim(),
          avatar: uploadingImage || "", // Base64 string or empty
          accentColor
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create teacher profile.");
      }

      onCreated(result);
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      id="create-teacher-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="create-teacher-modal-main"
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-transparent dark:border-slate-850 shadow-2xl"
      >
        {/* Decorative Indicator Bar */}
        <div className={`h-2.5 w-full bg-gradient-to-r from-teal-500 to-indigo-600`} />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-805 p-6 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Add Teacher Profile</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Let review-sharing help your peers succeed</p>
          </div>
          <button
            id="close-create-teacher-modal"
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error States or Warning States */}
        {!studentEditingEnabled && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border-y border-amber-200/60 dark:border-amber-900/40 p-4 flex gap-3 text-amber-800 dark:text-amber-300 text-xs font-semibold select-none leading-relaxed">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">View-Only Mode is ACTIVE</p>
              <p className="font-normal text-amber-700 dark:text-amber-400 mt-0.5">
                Students/citizens are temporarily restricted from modifying content. You can enable editing at any time from the toggle tool in the Admin Menu above.
              </p>
            </div>
          </div>
        )}

        {!isAdminAuthenticated ? (
          <div className="p-8 text-center max-w-sm mx-auto">
            <div className="inline-flex items-center justify-center p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-full text-indigo-600 dark:text-indigo-400 mb-4 animate-bounce">
              <Lock className="w-8 h-8 stroke-[2.5]" />
            </div>
            <h3 className="text-base font-black text-gray-950 dark:text-white tracking-tight uppercase">Admin Verification Required</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
              Adding new teacher profiles is restricted to authorized school administrators. Verify using the administration password.
            </p>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              setModalAdminPasswordError("");
              try {
                const res = await fetch("/api/admin/verify", {
                   method: "POST",
                   headers: { "Content-Type": "application/json" },
                   body: JSON.stringify({ password: modalAdminPasswordInput })
                });
                if (res.ok) {
                  if (onAdminLoginSuccess) {
                    onAdminLoginSuccess(modalAdminPasswordInput);
                  }
                } else {
                  const data = await res.json();
                  setModalAdminPasswordError(data.error || "Verification failed");
                }
              } catch (err) {
                setModalAdminPasswordError("Could not connect to server database.");
              }
            }} className="mt-5 space-y-3">
              <input
                id="modal-admin-password-input-field"
                type="password"
                placeholder="Enter Admin Password..."
                value={modalAdminPasswordInput}
                onChange={(e) => {
                  setModalAdminPasswordInput(e.target.value);
                  setModalAdminPasswordError("");
                }}
                className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-4 text-xs text-center font-bold text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                autoFocus
              />
              {modalAdminPasswordError && (
                <p className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/35 py-1 px-3 rounded-lg border border-rose-100 dark:border-rose-900/40 animate-pulse">
                  {modalAdminPasswordError}
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  id="modal-cancel-auth-btn"
                  type="button"
                  onClick={onClose}
                  className="flex-grow py-2.5 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition uppercase"
                >
                  Cancel
                </button>
                <button
                  id="modal-submit-auth-btn"
                  type="submit"
                  className="flex-grow py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] rounded-xl transition shadow-md shadow-indigo-600/10 uppercase"
                >
                  Verify
                </button>
              </div>
            </form>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white dark:bg-slate-900">
            {errorMessage && (
            <div className="rounded-lg bg-rose-50 dark:bg-rose-950/20 p-3.5 text-xs font-semibold text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900/40 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Teacher Image Upload Zone */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-slate-400 mb-2">
              Teacher Image / Compass Screenshot
            </label>
            <div
              id="image-dropzone"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center transition cursor-pointer ${
                isDragOver ? "border-amber-500 bg-amber-50/20" : "border-gray-200 dark:border-slate-800 hover:bg-gray-50/80 dark:hover:bg-slate-850/30"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
                disabled={submitting}
              />

              {uploadingImage ? (
                <div className="relative flex flex-col items-center justify-center">
                  <img
                    id="uploaded-preview-img"
                    src={uploadingImage}
                    alt="Preview avatar"
                    className="h-20 w-20 rounded-xl object-cover border-2 border-gray-100 dark:border-slate-800 shadow-sm mb-2"
                  />
                  <span className="text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> Compass image attached!
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadingImage(null);
                    }}
                    className="mt-2 text-[10px] text-rose-600 dark:text-rose-400 font-bold hover:underline"
                  >
                    Remove and start again
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 dark:bg-slate-800 text-amber-500 mb-3">
                    <Upload className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-gray-700 dark:text-slate-300">
                    Drag and drop file here, or <span className="text-amber-600 dark:text-amber-400 hover:underline">browse</span>
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 font-medium">
                    Upload screens from Compass profile or photo (PNG, JPG size &lt; 8MB)
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Teacher Name */}
            <div>
              <label htmlFor="teacher-name-input" className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-slate-400 mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="teacher-name-input"
                type="text"
                placeholder="e.g. Mr. Alistair Ross"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={submitting}
                className="w-full rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-850 dark:text-white px-3 py-2 text-sm placeholder-gray-400 dark:placeholder-slate-500 shadow-xs focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
              />
            </div>

            {/* Subject Taught */}
            <div>
              <label htmlFor="teacher-subject-input" className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-slate-400 mb-1.5">
                Subject Taught <span className="text-rose-500">*</span>
              </label>
              <input
                id="teacher-subject-input"
                type="text"
                placeholder="e.g. Specialists Maths"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                disabled={submitting}
                className="w-full rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-850 dark:text-white px-3 py-2 text-sm placeholder-gray-400 dark:placeholder-slate-500 shadow-xs focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Department Selector */}
          <div>
            <label htmlFor="teacher-dept-select" className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-slate-400 mb-1.5">
              Subject Faculty Department <span className="text-rose-500">*</span>
            </label>
            <select
              id="teacher-dept-select"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              disabled={submitting}
              className="w-full rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-850 dark:text-white px-3 py-2 text-sm shadow-xs focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
            >
              {activeDepartments.map((dept) => (
                <option key={dept} value={dept} className="bg-white dark:bg-slate-900 text-slate-850 dark:text-white">
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Short Bio */}
          <div>
            <label htmlFor="teacher-bio-textarea" className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-slate-400 mb-1.5">
              Profile Summary / Bio <span className="text-gray-400 dark:text-slate-500">(Optional)</span>
            </label>
            <textarea
              id="teacher-bio-textarea"
              placeholder="e.g. He is the head coordinator. Renowned for giving exceptionally useful formulas and interactive lab setups."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={submitting}
              rows={3}
              maxLength={250}
              className="w-full rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-850 dark:text-white px-3 py-2 text-sm placeholder-gray-400 dark:placeholder-slate-500 shadow-xs focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
            />
            <p className="text-right text-[10px] text-gray-400 dark:text-slate-500 mt-1 font-semibold">
              {bio.length}/250 characters
            </p>
          </div>

          {/* Profile Theme Accent Colors */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-slate-400 mb-2">
              Select Profile Theme color
            </label>
            <div className="flex gap-3">
              {ACCENTS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAccentColor(color)}
                  disabled={submitting}
                  className={`relative h-8 w-8 rounded-full border-2 transition ${
                    accentColor === color ? "border-amber-600 dark:border-amber-450 scale-110 shadow-sm" : "border-transparent"
                  }`}
                  style={{
                    backgroundColor:
                      color === "emerald"
                        ? "#10b981"
                        : color === "blue"
                        ? "#3b82f6"
                        : color === "violet"
                        ? "#8b5cf6"
                        : color === "amber"
                        ? "#f59e0b"
                        : color === "rose"
                        ? "#f43f5e"
                        : "#06b6d4"
                  }}
                >
                  {accentColor === color && (
                    <span className="absolute inset-x-0 inset-y-0 flex items-center justify-center text-white">
                      <Check className="h-4 w-4 stroke-[3]" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 border-t border-gray-100 dark:border-slate-805 pt-5 dark:border-slate-805 border-slate-100">
            <button
              id="cancel-create-teacher-btn"
              type="button"
              onClick={onClose}
              className="flex-grow rounded-xl border border-gray-250 py-2.5 text-sm font-semibold text-gray-750 dark:text-slate-350 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-150 border-gray-200 dark:border-slate-800 dark:hover:bg-slate-800 dark:hover:text-white dark:active:bg-slate-850"
            >
              Cancel
            </button>
            <button
              id="confirm-create-teacher-btn"
              type="submit"
              disabled={submitting}
              className="flex-grow rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-2.5 text-sm font-bold text-white shadow-md shadow-amber-500/10 transition hover:from-amber-600 hover:to-amber-700 active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? "Building Profile..." : "Create Profile"}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
