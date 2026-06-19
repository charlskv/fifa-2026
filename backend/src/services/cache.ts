import type { MatchRecord, MatchesResponse } from "../types/matches.js";

interface CacheState {
  lastUpdated: string | null;
  source: string;
  matches: MatchRecord[];
}

const state: CacheState = {
  lastUpdated: null,
  source: "official-fifa",
  matches: [],
};

export function getCachedResponse(): MatchesResponse {
  return {
    lastUpdated: state.lastUpdated,
    source: state.source,
    total: state.matches.length,
    matches: state.matches,
  };
}

export function setCachedMatches(matches: MatchRecord[]): MatchesResponse {
  state.matches = matches;
  state.lastUpdated = new Date().toISOString();

  return getCachedResponse();
}
