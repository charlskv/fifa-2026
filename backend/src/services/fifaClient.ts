import axios from "axios";
import type { MatchRecord } from "../types/matches.js";

const HTTP_TIMEOUT_MS = 20_000;
const FIXTURES_API_URL =
  "https://api.fifa.com/api/v3/calendar/matches?language=en&idCompetition=17&idSeason=285023&count=400";
const WATCH_API_URL =
  "https://api.fifa.com/api/v3/watch/season/285023/DE?language=en";

type LocalizedText = {
  Locale?: string;
  Description?: string;
};

type CalendarTeam = {
  TeamName?: LocalizedText[];
};

type CalendarMatch = {
  IdCompetition?: string;
  IdSeason?: string;
  IdStage?: string;
  IdMatch?: string;
  Date?: string;
  CompetitionName?: LocalizedText[];
  SeasonName?: LocalizedText[];
  Home?: CalendarTeam;
  Away?: CalendarTeam;
};

type CalendarResponse = {
  Results?: CalendarMatch[];
};

type WatchSource = {
  Name?: string;
  Url?: string;
  TvChannelUrl?: string;
};

type WatchMatch = {
  IdMatch?: string;
  Sources?: WatchSource[];
};

type WatchResponse = {
  Matches?: WatchMatch[];
};

function localizedDescription(items?: LocalizedText[]): string {
  if (!items?.length) return "";

  const preferred =
    items.find((item) => item.Locale?.toLowerCase().startsWith("en")) ??
    items[0];

  return preferred?.Description ?? "";
}

function isFutureOrToday(matchDateIso: string): boolean {
  const matchTime = Date.parse(matchDateIso);
  if (Number.isNaN(matchTime)) return false;

  const now = new Date();
  const todayStartUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0,
    0,
    0,
    0,
  );

  return matchTime >= todayStartUtc;
}

function toMatchUrl(match: CalendarMatch): string {
  const idCompetition = match.IdCompetition ?? "17";
  const idSeason = match.IdSeason ?? "285023";
  const idStage = match.IdStage ?? "";
  const idMatch = match.IdMatch ?? "";
  return `https://www.fifa.com/en/match-centre/match/${idCompetition}/${idSeason}/${idStage}/${idMatch}`;
}

function mapWatchSources(matches?: WatchMatch[]): Map<string, MatchRecord> {
  const map = new Map<string, MatchRecord>();

  for (const watchMatch of matches ?? []) {
    const idMatch = watchMatch.IdMatch ?? "";
    if (!idMatch) continue;

    let telekomUrl = "";
    let ardUrl = "";
    let zdfUrl = "";

    for (const source of watchMatch.Sources ?? []) {
      const rawUrl = source.Url || source.TvChannelUrl || "";
      if (!rawUrl) continue;

      const channelName = (source.Name ?? "").toLowerCase();
      const url = rawUrl.toLowerCase();

      if (!telekomUrl && (url.includes("telekom.de") || channelName.includes("fussball.tv") || channelName.includes("telekom"))) {
        telekomUrl = rawUrl;
      }

      if (!ardUrl && (url.includes("ardmediathek.de") || url.includes("ard.de") || channelName.includes("ard"))) {
        ardUrl = rawUrl;
      }

      if (!zdfUrl && (url.includes("zdf.de") || channelName.includes("zdf"))) {
        zdfUrl = rawUrl;
      }
    }

    map.set(idMatch, {
      id: idMatch,
      fifaMatchUrl: "",
      matchDate: "",
      homeTeam: "",
      awayTeam: "",
      competition: "",
      telekomUrl,
      ardUrl,
      zdfUrl,
    });
  }

  return map;
}

export async function fetchRemainingFifaMatchesWithWatchLinks(): Promise<MatchRecord[]> {
  const [fixturesResponse, watchResponse] = await Promise.all([
    axios.get<CalendarResponse>(FIXTURES_API_URL, { timeout: HTTP_TIMEOUT_MS }),
    axios.get<WatchResponse>(WATCH_API_URL, { timeout: HTTP_TIMEOUT_MS }),
  ]);

  const watchByMatch = mapWatchSources(watchResponse.data.Matches);

  const rows: MatchRecord[] = [];

  for (const fixture of fixturesResponse.data.Results ?? []) {
    const id = fixture.IdMatch ?? "";
    const matchDate = fixture.Date ?? "";
    const homeTeam = localizedDescription(fixture.Home?.TeamName);
    const awayTeam = localizedDescription(fixture.Away?.TeamName);

    if (!id || !matchDate || !homeTeam || !awayTeam) continue;
    if (!isFutureOrToday(matchDate)) continue;

    const watch = watchByMatch.get(id);

    rows.push({
      id,
      fifaMatchUrl: toMatchUrl(fixture),
      matchDate,
      homeTeam,
      awayTeam,
      competition:
        localizedDescription(fixture.CompetitionName) ||
        localizedDescription(fixture.SeasonName) ||
        "FIFA World Cup 2026",
      telekomUrl: watch?.telekomUrl ?? "",
      ardUrl: watch?.ardUrl ?? "",
      zdfUrl: watch?.zdfUrl ?? "",
    });
  }

  return rows.sort((a, b) => Date.parse(a.matchDate) - Date.parse(b.matchDate));
}
