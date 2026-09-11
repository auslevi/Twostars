import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory + file persistence for quiz scores
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "score.json");

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error("Failed to create data dir", e);
  }
}

let latestScoreData: any = null;

if (fs.existsSync(DATA_FILE)) {
  try {
    latestScoreData = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch (e) {
    console.error("Failed to read existing score file", e);
  }
}

// API Routes
app.get("/api/score", (req, res) => {
  if (!latestScoreData) {
    return res.json({ hasScore: false, message: "No quiz score submitted yet" });
  }
  return res.json({ hasScore: true, ...latestScoreData });
});

app.post("/api/score", (req, res) => {
  const { name, score, total, answers, timestamp, signature } = req.body;

  if (typeof score !== "number" || typeof total !== "number") {
    return res.status(400).json({ error: "Invalid score payload" });
  }

  latestScoreData = {
    name: name || "Panagiotis",
    score,
    total,
    percentage: Math.round((score / total) * 100),
    answers: answers || [],
    timestamp: timestamp || new Date().toISOString(),
    signature: signature || null,
    submittedAtFormatted: new Date().toLocaleString("en-US", {
      dateStyle: "full",
      timeStyle: "short",
    }),
  };

  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(latestScoreData, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write score file", e);
  }

  return res.json({ success: true, latestScoreData });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Anniversary server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
