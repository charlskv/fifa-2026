import cors from "cors";
import express from "express";
import { getCachedResponse, setCachedMatches } from "./services/cache.js";
import { fetchRemainingFifaMatchesWithWatchLinks } from "./services/fifaClient.js";
import type { RefreshResponse } from "./types/matches.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);

let isRefreshing = false;

// Configure CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or Curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/matches", (_req, res) => {
  res.json(getCachedResponse());
});

app.post("/api/refresh", async (_req, res) => {
  if (isRefreshing) {
    res.status(409).json({
      error: "Refresh already in progress.",
    });
    return;
  }

  isRefreshing = true;

  try {
    const matches = await fetchRemainingFifaMatchesWithWatchLinks();
    const response = setCachedMatches(matches);

    const body: RefreshResponse = {
      ...response,
      refreshedAt: new Date().toISOString(),
    };

    res.json(body);
  } catch (error) {
    res.status(502).json({
      error: "Failed to refresh fixtures from official FIFA sources.",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    isRefreshing = false;
  }
});

app.listen(port, () => {
  console.log(`FIFA backend listening on http://localhost:${port}`);

  // Preload cache once to make initial UI load useful without manual refresh.
  void (async () => {
    try {
      const matches = await fetchRemainingFifaMatchesWithWatchLinks();
      setCachedMatches(matches);
      console.log(`Startup refresh complete: ${matches.length} matches cached.`);
    } catch (error) {
      console.error("Startup refresh failed:", error);
    }
  })();
});
