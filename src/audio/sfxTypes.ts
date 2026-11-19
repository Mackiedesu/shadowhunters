export type SfxId =
  // Group A: Lobby & Turn Flow
  | 'room_join'
  | 'room_leave'
  | 'game_start'
  | 'your_turn'
  | 'turn_timer_tick'
  | 'victory'
  | 'defeat'
  // Group B: Dice & Movement
  | 'dice_roll'
  | 'move_area'
  | 'roll_seven'
  | 'teleport'
  // Group C: Cards, Equipment & Areas
  | 'card_draw_white'
  | 'card_draw_black'
  | 'card_draw_hermit'
  | 'equip_item'
  | 'steal_item'
  | 'dynamite_boom'
  // Group D: Combat, Damage & Healing
  | 'attack_hit'
  | 'attack_heavy'
  | 'attack_miss'
  | 'shield_block'
  | 'heal'
  | 'counter_attack'
  // Group E: Reveal, Abilities & Death
  | 'reveal_shadow'
  | 'reveal_hunter'
  | 'reveal_neutral'
  | 'special_ability'
  | 'player_death'
  // Group F: UI Feedback
  | 'ui_card_zoom';

export interface SfxMeta {
  volume: number;
  cooldownMs: number;
  duckBgm?: boolean;
  jitterPitch?: boolean;
}

export const SFX_META: Record<SfxId, SfxMeta> = {
  room_join: { volume: 0.45, cooldownMs: 250 },
  room_leave: { volume: 0.3, cooldownMs: 250 },
  game_start: { volume: 0.6, cooldownMs: 1000, duckBgm: true },
  your_turn: { volume: 0.48, cooldownMs: 600 },
  turn_timer_tick: { volume: 0.25, cooldownMs: 700 },
  victory: { volume: 0.65, cooldownMs: 2000, duckBgm: true },
  defeat: { volume: 0.6, cooldownMs: 2000, duckBgm: true },

  dice_roll: { volume: 0.5, cooldownMs: 140, jitterPitch: true },
  move_area: { volume: 0.4, cooldownMs: 120, jitterPitch: true },
  roll_seven: { volume: 0.45, cooldownMs: 300 },
  teleport: { volume: 0.48, cooldownMs: 300 },

  card_draw_white: { volume: 0.45, cooldownMs: 180 },
  card_draw_black: { volume: 0.48, cooldownMs: 180 },
  card_draw_hermit: { volume: 0.45, cooldownMs: 180 },
  equip_item: { volume: 0.42, cooldownMs: 180 },
  steal_item: { volume: 0.5, cooldownMs: 200 },
  dynamite_boom: { volume: 0.62, cooldownMs: 300, duckBgm: true },

  attack_hit: { volume: 0.52, cooldownMs: 110, jitterPitch: true },
  attack_heavy: { volume: 0.62, cooldownMs: 140, jitterPitch: true, duckBgm: true },
  attack_miss: { volume: 0.4, cooldownMs: 120, jitterPitch: true },
  shield_block: { volume: 0.52, cooldownMs: 140 },
  heal: { volume: 0.45, cooldownMs: 180 },
  counter_attack: { volume: 0.55, cooldownMs: 200 },

  reveal_shadow: { volume: 0.6, cooldownMs: 300, duckBgm: true },
  reveal_hunter: { volume: 0.58, cooldownMs: 300, duckBgm: true },
  reveal_neutral: { volume: 0.55, cooldownMs: 300, duckBgm: true },
  special_ability: { volume: 0.5, cooldownMs: 220 },
  player_death: { volume: 0.68, cooldownMs: 400, duckBgm: true },

  ui_card_zoom: { volume: 0.22, cooldownMs: 80, jitterPitch: true },
};
