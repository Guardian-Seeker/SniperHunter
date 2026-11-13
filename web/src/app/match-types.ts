export interface GameStat {
  gameID: string;
  owner: string;
  timestamp: string;
  replayName: string;
  mode: string;
  bots: number;
  players: number;
  duration: number;
  placement: number;
  kills: number;
  assists: number;
  accuracy: number;
  damageDealt: number;
  damageTaken: number;
  distanceTravelled: number;
}

export interface PlatformCount {
  platform: string;
  players: number;
}

export interface Elimination {
  id: number;
  time: number;
  killerID: string;
  killedID: string;
  knocked: number;
  weapon: string;
  killerName: string;
  killedName: string;
  killerSkin: string | null;
  killedSkin: string | null;
  killerBot: number;
  killedBot: number;
}

export interface MatchMember {
  playerID: string;
  username: string;
  platform: string | null;
  skin: string | null;
  isBot: number;
  team: number;
  placement: number;
  kills: number;
  deaths: number;
  games: number;
}

export interface MatchTeam {
  team: number;
  placement: number;
  kills: number;
  deaths: number;
  members: MatchMember[];
}

export interface MatchDetails {
  match: GameStat | null;
  platforms: PlatformCount[];
  eliminations: Elimination[];
  teams: MatchTeam[];
  snipers: MatchMember[];
}

export type RecentGame = Pick<GameStat, 'gameID' | 'timestamp' | 'replayName' | 'mode' | 'placement'>;
