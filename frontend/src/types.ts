export type RoleAbility = {
  name: string;
  description: string;
  sample_actions?: string[];
};

export type Player = {
  id: string;
  name: string;
  role_id?: string | null;
  connected: boolean;
};

export type Role = {
  id: string;
  name: string;
  title: string;
  public_info: string;
  avatar?: string;
  abilities?: RoleAbility[];
};

export type PrivateRole = Role & {
  secret_identity: string;
  faction: string;
  goals: string[];
  relationships?: string[];
  pressure_points?: string[];
  abilities?: RoleAbility[];
  initial_clues: { id: string; name: string; text: string }[];
};

export type LogEntry = {
  type: string;
  at?: string;
  text?: string;
  name?: string;
  player_id?: string;
};

export type RoomView = {
  code: string;
  story: {
    story_id: string;
    title: string;
    max_players: number;
    world_setting: string;
    factions: { id: string; name: string; goal: string }[];
    roles: Role[];
  };
  players: Player[];
  role_claims: Record<string, string>;
  current_chapter_id: string;
  current_chapter: { id: string; title: string; opening: string };
  world_state: Record<string, unknown>;
  public_log: LogEntry[];
  private_messages?: LogEntry[];
  recommended_actions?: RecommendedAction[];
  me?: Player;
  my_role?: PrivateRole | null;
  ended: boolean;
  ending?: { id: string; title: string; text: string } | null;
};

export type RecommendedAction = {
  id: string;
  title: string;
  text: string;
  reason?: string;
  priority?: "low" | "medium" | "high";
};

export type WsMessage = {
  type: string;
  payload: Record<string, unknown>;
};
