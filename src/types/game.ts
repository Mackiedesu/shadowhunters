export type Faction = 'Hunter' | 'Shadow' | 'Neutral';
export type DeckType = 'white' | 'black' | 'hermit';
export type CardKind = 'Single' | 'Equipment';

export type AreaId =
  | 'hermit_cabin'
  | 'underworld_gate'
  | 'church'
  | 'cemetery'
  | 'weird_woods'
  | 'erstwhile_altar';

export interface AreaDef {
  id: AreaId;
  name: string;
  numbers: number[];
  color: string;
  accent: string;
  description: string;
}

export interface CharacterDef {
  id: string;
  name: string;
  faction: Faction;
  maxHp: number;
  isExpansion: boolean;
  winCondition: string;
  abilityName: string;
  abilityDescription: string;
}

export interface CardDef {
  id: string;
  uid?: string;
  deck: DeckType;
  name: string;
  kind: CardKind;
  isExpansion: boolean;
  description: string;
}

export interface PlayerState {
  id: string;
  name: string;
  isHuman: boolean;
  color: string;
  character: CharacterDef;
  damage: number;
  revealed: boolean;
  areaId: AreaId | null;
  equipment: CardDef[];
  alive: boolean;
  deathOrder: number | null;
  abilityUsed: boolean;
  abilityVoided: boolean;
  guardianAngelActive: boolean;
  ghostlyBarrierActive: boolean;
  extraTurns: number;
  agnesTarget: 'above' | 'below';
  fukaPendingNextTurn: boolean;
  /** AI memory: known faction or suspected enemy/ally */
  knownIdentities: Record<string, Faction>;
}

export type GamePhase =
  | 'setup'
  | 'start_turn'
  | 'move'
  | 'area_action'
  | 'attack'
  | 'end_turn'
  | 'game_over';

export type PendingAction =
  | { type: 'choose_area_roll7'; playerId: string }
  | { type: 'choose_mystic_compass'; playerId: string; roll1: [number, number]; roll2: [number, number] }
  | { type: 'choose_emi_move'; playerId: string; adjacentAreas: AreaId[] }
  | { type: 'choose_underworld_deck'; playerId: string }
  | { type: 'choose_weird_woods_target'; playerId: string }
  | { type: 'choose_erstwhile_steal'; playerId: string }
  | { type: 'resolve_card_target'; playerId: string; card: CardDef; validTargetIds: string[]; mode: 'damage' | 'heal' | 'steal' | 'give_equipment' | 'first_aid' | 'hermit_give' | 'reveal_choice' }
  | { type: 'hermit_response'; fromPlayerId: string; targetPlayerId: string; card: CardDef }
  | { type: 'choose_attack_target'; playerId: string }
  | { type: 'bob_steal_or_damage'; attackerId: string; defenderId: string; damage: number }
  | { type: 'charles_extra_attack'; playerId: string }
  | { type: 'werewolf_counter'; werewolfId: string; attackerId: string }
  | { type: 'kill_loot'; killerId: string; victimId: string; count: number }
  | { type: 'use_ability_target'; playerId: string; abilityId: string; validTargetIds: string[] }
  | { type: 'spear_reveal_prompt'; attackerId: string; targets: { id: string; rawDiff: number }[] }
  | { type: 'pass_and_play_gate'; nextPlayerId: string };

export interface LogEntry {
  id: number;
  turn: number;
  text: string;
  tone: 'info' | 'combat' | 'heal' | 'card' | 'reveal' | 'death' | 'win';
}

export interface GameConfig {
  playerCount: number;
  humanCount: number;
  humanNames: string[];
  includeExpansion: boolean;
}

export interface GameState {
  config: GameConfig;
  phase: GamePhase;
  turnNumber: number;
  currentPlayerIndex: number;
  players: PlayerState[];
  /** 3 zones, each containing 2 AreaIds */
  zones: [AreaId, AreaId][];
  whiteDeck: CardDef[];
  whiteDiscard: CardDef[];
  blackDeck: CardDef[];
  blackDiscard: CardDef[];
  hermitDeck: CardDef[];
  hermitDiscard: CardDef[];
  lastDice: { d6: number; d4: number; label: string } | null;
  pending: PendingAction | null;
  winners: { playerId: string; reason: string }[];
  logs: LogEntry[];
  deadCount: number;
  /** Current turn flags */
  hasMoved: boolean;
  hasUsedArea: boolean;
  hasAttacked: boolean;
  lastDrawnCard: CardDef | null;
}
