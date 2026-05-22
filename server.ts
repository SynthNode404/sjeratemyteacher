/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Teacher, Review } from "./src/types";

const app = express();
const PORT = 3000;
const DB_FILE = process.env.DATABASE_PATH || path.join(process.cwd(), "db.json");

// Ensure parent directories exist for the database file (especially useful for custom Render persistent disk mounts)
try {
  const dbDir = path.dirname(DB_FILE);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
} catch (dirErr) {
  console.warn("Could not verify or create database directory:", dirErr);
}

// Define the global config requested by the user
// "Add a simple setting in the code like: const STUDENT_EDITING_ENABLED = true;"
const STUDENT_EDITING_ENABLED = true;

// Dynamic state in running memory which is initialized from the file
let runtimeStudentEditingEnabled = STUDENT_EDITING_ENABLED;

// Let's configure Express to handle large Base64 payloads (e.g. for Compass teacher photo uploads)
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// --- SEED / DATABASE SETUP ---
// We will generate stable, high-fidelity default values so the site loads beautifully on its first launch.
const DEFAULT_TEACHERS: Teacher[] = [];

const DEFAULT_REVIEWS: Review[] = [];

interface DatabaseSchema {
  teachers: Teacher[];
  reviews: Review[];
  studentEditingEnabled?: boolean;
}

let memoryDB: DatabaseSchema | null = null;

// Read database from file or write defaults
function readDB(): DatabaseSchema {
  if (memoryDB) {
    return memoryDB;
  }
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      memoryDB = JSON.parse(data);
      if (memoryDB && typeof memoryDB.studentEditingEnabled === "boolean") {
        runtimeStudentEditingEnabled = memoryDB.studentEditingEnabled;
      }
      return memoryDB!;
    }
  } catch (error) {
    console.error("Error reading database file, resetting to defaults:", error);
  }
  // Store default database if empty/errored
  const initialData: DatabaseSchema = {
    teachers: DEFAULT_TEACHERS,
    reviews: DEFAULT_REVIEWS,
    studentEditingEnabled: runtimeStudentEditingEnabled
  };
  memoryDB = initialData;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf-8");
  } catch (writeErr) {
    console.warn("Storage warning: falling back to high-performance in-memory state engine.");
  }
  return initialData;
}

function writeDB(data: DatabaseSchema) {
  memoryDB = {
    ...data,
    studentEditingEnabled: runtimeStudentEditingEnabled
  };
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(memoryDB, null, 2), "utf-8");
  } catch (error) {
    console.warn("Could not save to disk, state updated hot in RAM cache:", error);
  }
}

// Recalculates a teacher's cumulative stats whenever reviews are modified.
function recalculateTeacherRatings(teacherId: string, reviews: Review[], teachers: Teacher[]): Teacher[] {
  const teacherReviews = reviews.filter(r => r.teacherId === teacherId);
  const count = teacherReviews.length;

  return teachers.map(t => {
    if (t.id === teacherId) {
      if (count === 0) {
        return {
          ...t,
          averageRating: 0,
          ratingClarity: 0,
          ratingHelpfulness: 0,
          ratingSupport: 0,
          totalReviews: 0,
          ratingDistributionClarity: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
          ratingDistributionHelpfulness: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
          ratingDistributionSupport: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        };
      }

      const sumRating = teacherReviews.reduce((sum, r) => sum + r.rating, 0);
      const sumClarity = teacherReviews.reduce((sum, r) => sum + r.ratingClarity, 0);
      const sumHelpful = teacherReviews.reduce((sum, r) => sum + r.ratingHelpfulness, 0);
      const sumSupport = teacherReviews.reduce((sum, r) => sum + r.ratingSupport, 0);

      const ratingDistributionClarity: Record<number, number> = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
      const ratingDistributionHelpfulness: Record<number, number> = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
      const ratingDistributionSupport: Record<number, number> = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};

      teacherReviews.forEach(r => {
        const cVal = Math.min(5, Math.max(1, Math.round(r.ratingClarity)));
        const hVal = Math.min(5, Math.max(1, Math.round(r.ratingHelpfulness)));
        const sVal = Math.min(5, Math.max(1, Math.round(r.ratingSupport)));

        ratingDistributionClarity[cVal] = (ratingDistributionClarity[cVal] || 0) + 1;
        ratingDistributionHelpfulness[hVal] = (ratingDistributionHelpfulness[hVal] || 0) + 1;
        ratingDistributionSupport[sVal] = (ratingDistributionSupport[sVal] || 0) + 1;
      });

      return {
        ...t,
        averageRating: Math.round((sumRating / count) * 10) / 10,
        ratingClarity: Math.round((sumClarity / count) * 10) / 10,
        ratingHelpfulness: Math.round((sumHelpful / count) * 10) / 10,
        ratingSupport: Math.round((sumSupport / count) * 10) / 10,
        totalReviews: count,
        ratingDistributionClarity,
        ratingDistributionHelpfulness,
        ratingDistributionSupport
      };
    }
    return t;
  });
}

const SECRET_FOLDER = path.join(process.cwd(), ".admin_secret");
const SECRET_FILE = path.join(SECRET_FOLDER, "password.txt");

function getAdminPassword(): string {
  if (process.env.ADMIN_PASSWORD) {
    return process.env.ADMIN_PASSWORD.trim();
  }
  try {
    if (fs.existsSync(SECRET_FILE)) {
      return fs.readFileSync(SECRET_FILE, "utf-8").trim();
    }
  } catch (error) {
    console.error("Error reading admin secret file:", error);
  }
  return "admin123"; // fallback in case of write failures
}

const checkAdminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const entered = req.headers["x-admin-password"];
  const correct = getAdminPassword();
  if (!entered || entered !== correct) {
    return res.status(401).json({ error: "Unauthorized: Invalid Admin Password" });
  }
  next();
};

// --- API ENDPOINTS ---

// Admin verify endpoint
app.post("/api/admin/verify", (req, res) => {
  const { password } = req.body;
  const correct = getAdminPassword();
  if (password === correct) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Invalid Admin Password" });
  }
});

// Get current permissions config
app.get("/api/config", (req, res) => {
  res.json({
    studentEditingEnabled: runtimeStudentEditingEnabled,
    staticDefault: STUDENT_EDITING_ENABLED
  });
});

// Admin toggle endpoint to dynamically switch view-only state for showcase
app.post("/api/config/toggle", checkAdminAuth, (req, res) => {
  runtimeStudentEditingEnabled = !runtimeStudentEditingEnabled;
  const db = readDB();
  writeDB(db);
  res.json({ success: true, studentEditingEnabled: runtimeStudentEditingEnabled });
});

// Get all teachers
app.get("/api/teachers", (req, res) => {
  const db = readDB();
  res.json(db.teachers);
});

// Get specific teacher detail
app.get("/api/teachers/:id", (req, res) => {
  const db = readDB();
  const teacher = db.teachers.find(t => t.id === req.params.id);
  if (!teacher) {
    return res.status(404).json({ error: "Teacher not found" });
  }
  const reviews = db.reviews.filter(r => r.teacherId === req.params.id);
  res.json({ teacher, reviews });
});

// Create a new teacher page (Upload photo / text)
app.post("/api/teachers", checkAdminAuth, (req, res) => {
  const { name, subject, department, avatar, bio, accentColor } = req.body;

  if (!name || !subject || !department) {
    return res.status(400).json({ error: "All required fields (Name, Subject, Department) must be supplied." });
  }

  // Prevent double posts / exact spam
  const db = readDB();
  const exists = db.teachers.some(t => t.name.toLowerCase() === name.toLowerCase() && t.subject.toLowerCase() === subject.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: "A teacher with this exact name and subject already exists." });
  }

  const newTeacher: Teacher = {
    id: `teacher-${Date.now()}`,
    name,
    subject,
    department,
    avatar: avatar || "", // Holds data URL base64 image or empty string
    bio: bio || "Highly dedicated educator.",
    averageRating: 0,
    ratingClarity: 0,
    ratingHelpfulness: 0,
    ratingSupport: 0,
    totalReviews: 0,
    accentColor: accentColor || ["emerald", "blue", "violet", "amber", "rose", "cyan"][Math.floor(Math.random() * 6)]
  };

  db.teachers.push(newTeacher);
  writeDB(db);

  res.status(201).json(newTeacher);
});

// Leave a review / rating
app.post("/api/teachers/:id/reviews", (req, res) => {
  // Check permission constraint
  if (!runtimeStudentEditingEnabled) {
    return res.status(403).json({ error: "Students are currently in View-Only mode. Content modification is locked." });
  }

  const teacherId = req.params.id;
  const { ratingClarity, ratingHelpfulness, ratingSupport, comment, author, grade, isAnonymous } = req.body;

  if (!comment || comment.trim().length < 5) {
    return res.status(400).json({ error: "Comment is too short. Reviews should contain constructive sentences." });
  }

  const db = readDB();
  const teacherExists = db.teachers.some(t => t.id === teacherId);
  if (!teacherExists) {
    return res.status(404).json({ error: "Teacher profile does not exist." });
  }

  // Basic spam check: prevent multiple identical comments with identical ratings on same teacher
  const isSpam = db.reviews.some(
    r => r.teacherId === teacherId &&
         r.comment.toLowerCase() === comment.toLowerCase() &&
         r.ratingClarity === ratingClarity
  );
  if (isSpam) {
    return res.status(400).json({ error: "Simulated Spam Engine Detected: Duplicate entry blocked successfully." });
  }

  const clarityVal = Math.min(5, Math.max(1, ratingClarity || 5));
  const helpfulVal = Math.min(5, Math.max(1, ratingHelpfulness || 5));
  const supportVal = Math.min(5, Math.max(1, ratingSupport || 5));

  // Overall combined rating score
  const finalRatingCombined = Math.round(((clarityVal + helpfulVal + supportVal) / 3) * 10) / 10;

  const newReview: Review = {
    id: `review-${Date.now()}`,
    teacherId,
    rating: finalRatingCombined,
    ratingClarity: clarityVal,
    ratingHelpfulness: helpfulVal,
    ratingSupport: supportVal,
    comment,
    author: isAnonymous ? "Anonymous Student" : (author || "Anonymous Student"),
    grade: grade || "Year 11",
    isAnonymous: !!isAnonymous,
    date: new Date().toISOString(),
    isReported: false,
    reportCount: 0,
    likes: 0,
    likedBy: []
  };

  db.reviews.push(newReview);
  // Recalculate teacher cumulative values
  db.teachers = recalculateTeacherRatings(teacherId, db.reviews, db.teachers);

  writeDB(db);
  res.status(201).json(newReview);
});

// Upvote / Like a review
app.post("/api/reviews/:id/like", (req, res) => {
  const reviewId = req.params.id;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "anonymous_ip";
  const userFingerprint = String(ip);

  const db = readDB();
  const review = db.reviews.find(r => r.id === reviewId);
  if (!review) {
    return res.status(404).json({ error: "Review not found" });
  }

  if (!review.likedBy) {
    review.likedBy = [];
  }

  if (review.likedBy.includes(userFingerprint)) {
    // Unlike if clicked again
    review.likedBy = review.likedBy.filter(item => item !== userFingerprint);
    review.likes = Math.max(0, review.likes - 1);
  } else {
    review.likedBy.push(userFingerprint);
    review.likes += 1;
  }

  writeDB(db);
  res.json({ success: true, likes: review.likes });
});

// Report a review for moderation and audit
app.post("/api/reviews/:id/report", (req, res) => {
  const { reason } = req.body;
  if (!reason || reason.trim() === "") {
    return res.status(400).json({ error: "A report reason must be provided." });
  }

  const db = readDB();
  const review = db.reviews.find(r => r.id === req.params.id);
  if (!review) {
    return res.status(404).json({ error: "Review not found" });
  }

  review.isReported = true;
  review.reportCount = (review.reportCount || 0) + 1;
  review.reportReason = `${review.reportReason ? review.reportReason + " | " : ""}${reason}`;

  writeDB(db);
  res.json({ success: true, review });
});

// Admin endpoint: Fetch all reported or normal reviews
app.get("/api/admin/reviews", checkAdminAuth, (req, res) => {
  const db = readDB();
  res.json({
    reviews: db.reviews,
    teachers: db.teachers
  });
});

// Admin endpoint: Moderation action 'DELETE' a review
app.post("/api/admin/reviews/:id/delete", checkAdminAuth, (req, res) => {
  const reviewId = req.params.id;
  const db = readDB();

  const reviewIndex = db.reviews.findIndex(r => r.id === reviewId);
  if (reviewIndex === -1) {
    return res.status(404).json({ error: "Review not found" });
  }

  const teacherId = db.reviews[reviewIndex].teacherId;
  db.reviews.splice(reviewIndex, 1);

  // Recalculate rating stats since index change
  db.teachers = recalculateTeacherRatings(teacherId, db.reviews, db.teachers);

  writeDB(db);
  res.json({ success: true });
});

// Admin endpoint: Moderation action 'KEEP' a review (dismiss flags)
app.post("/api/admin/reviews/:id/keep", checkAdminAuth, (req, res) => {
  const reviewId = req.params.id;
  const db = readDB();

  const review = db.reviews.find(r => r.id === reviewId);
  if (!review) {
    return res.status(404).json({ error: "Review not found" });
  }

  review.isReported = false;
  review.reportCount = 0;
  review.reportReason = "";

  writeDB(db);
  res.json({ success: true, review });
});

// Admin endpoint: Delete a teacher profile completely
app.post("/api/admin/teachers/:id/delete", checkAdminAuth, (req, res) => {
  const teacherId = req.params.id;
  const db = readDB();

  db.teachers = db.teachers.filter(t => t.id !== teacherId);
  db.reviews = db.reviews.filter(r => r.teacherId !== teacherId);

  writeDB(db);
  res.json({ success: true });
});

// --- VITE DEV AND PROD MIDDLEWARE SETUP ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Create Vite server in middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Rate My Teachers server listening on PORT: ${PORT}`);
  });
}

startServer();
