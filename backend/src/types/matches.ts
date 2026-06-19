export type Channel = "telekom" | "ard" | "zdf";

export interface MatchChannels {
  telekomUrl: string;
  ardUrl: string;
  zdfUrl: string;
}

export interface MatchRecord extends MatchChannels {
  id: string;
  fifaMatchUrl: string;
  matchDate: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
}

export interface MatchesResponse {
  lastUpdated: string | null;
  source: string;
  total: number;
  matches: MatchRecord[];
}

export interface RefreshResponse extends MatchesResponse {
  refreshedAt: string;
}
