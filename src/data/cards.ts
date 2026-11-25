import type { AreaDef, AreaId, CardDef, CharacterDef, Faction } from '../types/game.ts';

export const PLAYER_COLORS = [
  '#e53935', // Crimson
  '#1e88e5', // Sapphire
  '#43a047', // Emerald
  '#fdd835', // Gold
  '#8e24aa', // Amethyst
  '#fb8c00', // Amber
  '#00acc1', // Cyan
  '#f4511e', // Coral
];

export const FACTION_DISTRIBUTION: Record<number, { Hunter: number; Shadow: number; Neutral: number }> = {
  4: { Hunter: 2, Shadow: 2, Neutral: 0 },
  5: { Hunter: 2, Shadow: 2, Neutral: 1 },
  6: { Hunter: 2, Shadow: 2, Neutral: 2 },
  7: { Hunter: 2, Shadow: 2, Neutral: 3 },
  8: { Hunter: 3, Shadow: 3, Neutral: 2 },
};

export const AREAS: Record<AreaId, AreaDef> = {
  hermit_cabin: {
    id: 'hermit_cabin',
    name: "Hermit's Cabin",
    numbers: [2, 3],
    color: '#2e7d32',
    accent: '#66bb6a',
    description: 'You may draw a Hermit (Green) Card.',
  },
  underworld_gate: {
    id: 'underworld_gate',
    name: 'Underworld Gate',
    numbers: [4, 5],
    color: '#6a1b9a',
    accent: '#ab47bc',
    description: 'You may draw a card from the stack of your choice (White, Black, or Hermit).',
  },
  church: {
    id: 'church',
    name: 'Church',
    numbers: [6],
    color: '#b8860b',
    accent: '#ffd54f',
    description: 'You may draw a White Card.',
  },
  cemetery: {
    id: 'cemetery',
    name: 'Cemetery',
    numbers: [8],
    color: '#37474f',
    accent: '#90a4ae',
    description: 'You may draw a Black Card.',
  },
  weird_woods: {
    id: 'weird_woods',
    name: 'Weird Woods',
    numbers: [9],
    color: '#455a64',
    accent: '#78909c',
    description: 'You may either give 2 damage to any player or heal 1 damage of any player.',
  },
  erstwhile_altar: {
    id: 'erstwhile_altar',
    name: 'Erstwhile Altar',
    numbers: [10],
    color: '#5d4037',
    accent: '#a1887f',
    description: 'You may steal an Equipment Card from any player.',
  },
};

export const AREA_LIST: AreaDef[] = Object.values(AREAS);

export interface CardTemplate extends CardDef {
  count: number;
}

export const BLACK_CARD_TEMPLATES: CardTemplate[] = [
  {
    id: 'banana_peel',
    deck: 'black',
    name: 'Banana Peel',
    kind: 'Single',
    isExpansion: false,
    count: 1,
    description: 'Give one of your equipment cards to another character. If you have no equipment cards, you receive 1 point of damage.',
  },
  {
    id: 'bloodthirsty_spider',
    deck: 'black',
    name: 'Bloodthirsty Spider',
    kind: 'Single',
    isExpansion: false,
    count: 1,
    description: 'You give 2 points of damage to any character and receive 2 points of damage yourself.',
  },
  {
    id: 'butcher_knife',
    deck: 'black',
    name: 'Butcher Knife',
    kind: 'Equipment',
    isExpansion: false,
    count: 1,
    description: 'On a successful attack, you give 1 point of extra damage.',
  },
  {
    id: 'chainsaw',
    deck: 'black',
    name: 'Chainsaw',
    kind: 'Equipment',
    isExpansion: false,
    count: 1,
    description: 'On a successful attack, you give 1 point of extra damage.',
  },
  {
    id: 'diabolic_ritual',
    deck: 'black',
    name: 'Diabolic Ritual',
    kind: 'Single',
    isExpansion: false,
    count: 1,
    description: 'If you are a Shadow, you may reveal your identity. If you do, your damage points are reset to 0.',
  },
  {
    id: 'dynamite',
    deck: 'black',
    name: 'Dynamite',
    kind: 'Single',
    isExpansion: false,
    count: 1,
    description: 'Roll the 2 dice and give 3 points of damage to all characters in the location designated by the total number rolled (nothing happens on a 7).',
  },
  {
    id: 'handgun',
    deck: 'black',
    name: 'Handgun',
    kind: 'Equipment',
    isExpansion: false,
    count: 1,
    description: 'Your attack range becomes all Areas outside your current Zone.',
  },
  {
    id: 'machine_gun',
    deck: 'black',
    name: 'Machine Gun',
    kind: 'Equipment',
    isExpansion: false,
    count: 1,
    description: 'Your attacks target all characters within your attack range (roll the dice once and apply the same damage to all affected characters).',
  },
  {
    id: 'masamune',
    deck: 'black',
    name: 'Masamune',
    kind: 'Equipment',
    isExpansion: false,
    count: 1,
    description: 'You MUST attack if possible. Your attacks are executed by a single roll of the 4-sided die (you cannot fail).',
  },
  {
    id: 'moody_goblin',
    deck: 'black',
    name: 'Moody Goblin',
    kind: 'Single',
    isExpansion: false,
    count: 2,
    description: 'You steal an equipment card from any character.',
  },
  {
    id: 'rusted_broad_axe',
    deck: 'black',
    name: 'Rusted Broad Axe',
    kind: 'Equipment',
    isExpansion: false,
    count: 1,
    description: 'On a successful attack, you give 1 point of extra damage.',
  },
  {
    id: 'spiritual_doll',
    deck: 'black',
    name: 'Spiritual Doll',
    kind: 'Single',
    isExpansion: false,
    count: 1,
    description: 'Pick any character and roll a 6-sided die. If 1 to 4, give 3 damage to that character. If 5 or 6, you get 3 damage.',
  },
  {
    id: 'vampire_bat',
    deck: 'black',
    name: 'Vampire Bat',
    kind: 'Single',
    isExpansion: false,
    count: 3,
    description: 'You give 2 points of damage to any character and heal 1 point of your own damage.',
  },
];

export const WHITE_CARD_TEMPLATES: CardTemplate[] = [
  {
    id: 'advent',
    deck: 'white',
    name: 'Advent',
    kind: 'Single',
    isExpansion: false,
    count: 1,
    description: 'If you are a Hunter, you may reveal your identity. If you do, your damage points are reset to 0.',
  },
  {
    id: 'blessing',
    deck: 'white',
    name: 'Blessing',
    kind: 'Single',
    isExpansion: false,
    count: 1,
    description: 'Pick a character other than yourself and roll a 6-sided die. That character heals the amount of damage shown on the die.',
  },
  {
    id: 'chocolate',
    deck: 'white',
    name: 'Chocolate (ex)',
    kind: 'Single',
    isExpansion: true,
    count: 1,
    description: "If your character's name begins with A, E, or U, you may reveal your identity. If you do, your damage points are reset to 0.",
  },
  {
    id: 'concealed_knowledge',
    deck: 'white',
    name: 'Concealed Knowledge',
    kind: 'Single',
    isExpansion: false,
    count: 1,
    description: 'Once this turn is over, you will take another turn.',
  },
  {
    id: 'disenchant_mirror',
    deck: 'white',
    name: 'Disenchant Mirror (ex)',
    kind: 'Single',
    isExpansion: true,
    count: 1,
    description: "If your character's name begins with V or W, you must reveal your identity.",
  },
  {
    id: 'first_aid',
    deck: 'white',
    name: 'First Aid',
    kind: 'Single',
    isExpansion: false,
    count: 1,
    description: "Set a character's damage at 7 (you may choose yourself).",
  },
  {
    id: 'flare_of_judgement',
    deck: 'white',
    name: 'Flare of Judgement',
    kind: 'Single',
    isExpansion: false,
    count: 1,
    description: 'All characters except yourself receive 2 points of damage.',
  },
  {
    id: 'fortune_brooch',
    deck: 'white',
    name: 'Fortune Brooch',
    kind: 'Equipment',
    isExpansion: false,
    count: 1,
    description: 'You receive no damage from the Weird Woods.',
  },
  {
    id: 'guardian_angel',
    deck: 'white',
    name: 'Guardian Angel',
    kind: 'Single',
    isExpansion: false,
    count: 1,
    description: 'You get no damage from another character attack until your next turn.',
  },
  {
    id: 'holy_robe',
    deck: 'white',
    name: 'Holy Robe',
    kind: 'Equipment',
    isExpansion: false,
    count: 1,
    description: 'Your attacks do 1 less point of damage and the amount of damage you receive from attacks is reduced by 1.',
  },
  {
    id: 'holy_water',
    deck: 'white',
    name: 'Holy Water of Healing',
    kind: 'Single',
    isExpansion: false,
    count: 2,
    description: 'Heal 2 points of your damage.',
  },
  {
    id: 'mystic_compass',
    deck: 'white',
    name: 'Mystic Compass',
    kind: 'Equipment',
    isExpansion: false,
    count: 1,
    description: 'You may roll twice to move and choose which result to use.',
  },
  {
    id: 'silver_rosary',
    deck: 'white',
    name: 'Silver Rosary',
    kind: 'Equipment',
    isExpansion: false,
    count: 1,
    description: 'If you attack and kill another character, you steal all their equipment.',
  },
  {
    id: 'spear_of_longinus',
    deck: 'white',
    name: 'Spear of Longinus',
    kind: 'Equipment',
    isExpansion: false,
    count: 1,
    description: 'If you are a Hunter and your attack is successful, you may reveal your identity. If you do, your attack does 2 extra points of damage.',
  },
  {
    id: 'talisman',
    deck: 'white',
    name: 'Talisman',
    kind: 'Equipment',
    isExpansion: false,
    count: 1,
    description: 'You receive no damage from the black cards "Bloodthirsty Spider", "Vampire Bat" and "Dynamite".',
  },
];

export const HERMIT_CARD_TEMPLATES: CardTemplate[] = [
  {
    id: 'aid',
    deck: 'hermit',
    name: 'Aid',
    kind: 'Single',
    isExpansion: false,
    count: 1,
    description: 'If you are a Hunter: heal 1 damage (if you have none, take 1 damage).',
  },
  {
    id: 'anger',
    deck: 'hermit',
    name: 'Anger',
    kind: 'Single',
    isExpansion: false,
    count: 2,
    description: 'If you are a Hunter or Shadow: give 1 equipment to current player or take 1 damage.',
  },
  {
    id: 'blackmail',
    deck: 'hermit',
    name: 'Blackmail',
    kind: 'Single',
    isExpansion: false,
    count: 2,
    description: 'If you are a Hunter or Neutral: give 1 equipment to current player or take 1 damage.',
  },
  {
    id: 'bully',
    deck: 'hermit',
    name: 'Bully (ex)',
    kind: 'Single',
    isExpansion: true,
    count: 1,
    description: 'If your max HP is 11 or less (A, B, C, E, U): take 1 damage.',
  },
  {
    id: 'exorcism',
    deck: 'hermit',
    name: 'Exorcism',
    kind: 'Single',
    isExpansion: false,
    count: 1,
    description: 'If you are a Shadow: take 2 damage.',
  },
  {
    id: 'greed',
    deck: 'hermit',
    name: 'Greed',
    kind: 'Single',
    isExpansion: false,
    count: 2,
    description: 'If you are a Neutral or Shadow: give 1 equipment to current player or take 1 damage.',
  },
  {
    id: 'huddle',
    deck: 'hermit',
    name: 'Huddle',
    kind: 'Single',
    isExpansion: false,
    count: 1,
    description: 'If you are a Shadow: heal 1 damage (if you have none, take 1 damage).',
  },
  {
    id: 'nurturance',
    deck: 'hermit',
    name: 'Nurturance',
    kind: 'Single',
    isExpansion: false,
    count: 1,
    description: 'If you are a Neutral: heal 1 damage (if you have none, take 1 damage).',
  },
  {
    id: 'prediction',
    deck: 'hermit',
    name: 'Prediction',
    kind: 'Single',
    isExpansion: false,
    count: 1,
    description: 'Show your character card secretly to the current player.',
  },
  {
    id: 'slap',
    deck: 'hermit',
    name: 'Slap',
    kind: 'Single',
    isExpansion: false,
    count: 2,
    description: 'If you are a Hunter: take 1 damage.',
  },
  {
    id: 'spell',
    deck: 'hermit',
    name: 'Spell',
    kind: 'Single',
    isExpansion: false,
    count: 1,
    description: 'If you are a Shadow: take 1 damage.',
  },
  {
    id: 'tough_lesson',
    deck: 'hermit',
    name: 'Tough Lesson (ex)',
    kind: 'Single',
    isExpansion: true,
    count: 1,
    description: 'If your max HP is 12 or greater (D, F, G, V, W): take 2 damage.',
  },
];

export const CHARACTERS: CharacterDef[] = [
  // BASE 4 NEUTRALS
  {
    id: 'allie',
    name: 'Allie',
    faction: 'Neutral',
    maxHp: 8,
    isExpansion: false,
    winCondition: 'You survive until another player reaches their Win Condition.',
    abilityName: "Mother's Love",
    abilityDescription: 'Once per game, you may reset your damage points to 0.',
  },
  {
    id: 'bob',
    name: 'Bob',
    faction: 'Neutral',
    maxHp: 10,
    isExpansion: false,
    winCondition: 'You possess 5 or more equipment cards.',
    abilityName: 'Robbery',
    abilityDescription: 'If you would inflict 2 or more points of damage in an attack, you may instead steal an Equipment card from your victim.',
  },
  {
    id: 'charles',
    name: 'Charles',
    faction: 'Neutral',
    maxHp: 11,
    isExpansion: false,
    winCondition: 'Your attack kills a character and that kill puts the total body count at 3 or more.',
    abilityName: 'Bloody Feast',
    abilityDescription: 'After attacking, you may inflict 2 points of damage to yourself to attack again.',
  },
  {
    id: 'daniel',
    name: 'Daniel',
    faction: 'Neutral',
    maxHp: 13,
    isExpansion: false,
    winCondition: 'You are the first character to die, or you survive and the Hunters achieve their Win Condition.',
    abilityName: 'Scream',
    abilityDescription: 'Once a character dies, your identity is revealed.',
  },
  // BASE 3 HUNTERS
  {
    id: 'emi',
    name: 'Emi',
    faction: 'Hunter',
    maxHp: 10,
    isExpansion: false,
    winCondition: 'All Shadows are dead.',
    abilityName: 'Teleport',
    abilityDescription: 'When you move, you can move to the other Area in your current Zone instead of rolling the dice.',
  },
  {
    id: 'franklin',
    name: 'Franklin',
    faction: 'Hunter',
    maxHp: 12,
    isExpansion: false,
    winCondition: 'All Shadows are dead.',
    abilityName: 'Lightning',
    abilityDescription: 'Once per game, inflict damage to any player equal to the roll of a 6-sided die.',
  },
  {
    id: 'george',
    name: 'George',
    faction: 'Hunter',
    maxHp: 14,
    isExpansion: false,
    winCondition: 'All Shadows are dead.',
    abilityName: 'Demolish',
    abilityDescription: 'Once per game, inflict damage to any player equal to the roll of a 4-sided die.',
  },
  // BASE 3 SHADOWS
  {
    id: 'unknown',
    name: 'Unknown',
    faction: 'Shadow',
    maxHp: 11,
    isExpansion: false,
    winCondition: 'All Hunters are dead, or 3 Neutrals are dead.',
    abilityName: 'Deceit',
    abilityDescription: 'When given a Hermit card, you may lie about your identity without revealing yourself.',
  },
  {
    id: 'vampire',
    name: 'Vampire',
    faction: 'Shadow',
    maxHp: 13,
    isExpansion: false,
    winCondition: 'All Hunters are dead, or 3 Neutrals are dead.',
    abilityName: 'Suck Blood',
    abilityDescription: 'If you attack a player and inflict damage, you heal 2 points of your own damage.',
  },
  {
    id: 'werewolf',
    name: 'Werewolf',
    faction: 'Shadow',
    maxHp: 14,
    isExpansion: false,
    winCondition: 'All Hunters are dead, or 3 Neutrals are dead.',
    abilityName: 'Counterattack',
    abilityDescription: 'After being attacked by a player, you may immediately attack back that player.',
  },
  // EXPANSION 5 NEUTRALS
  {
    id: 'agnes',
    name: 'Agnes',
    faction: 'Neutral',
    maxHp: 8,
    isExpansion: true,
    winCondition: 'The player above (or below if switched) you in the player list reaches their Win Condition.',
    abilityName: 'Capricious',
    abilityDescription: 'At the start of your turn, you may change your win condition to "The player below you in the player list reaches their Win Condition."',
  },
  {
    id: 'bryan',
    name: 'Bryan',
    faction: 'Neutral',
    maxHp: 10,
    isExpansion: true,
    winCondition: 'Your attack kills a character with max HP 13+, or you are on Erstwhile Altar when another player wins.',
    abilityName: 'My Mistake',
    abilityDescription: 'If your attack kills a character who has a max HP of 12 or less, your identity is revealed.',
  },
  {
    id: 'catherine',
    name: 'Catherine',
    faction: 'Neutral',
    maxHp: 11,
    isExpansion: true,
    winCondition: 'You are the first character to die, or you are one of the last two characters remaining.',
    abilityName: 'Stigmata',
    abilityDescription: 'Heal 1 point of your own damage at the start of your turn (when revealed).',
  },
  {
    id: 'david',
    name: 'David',
    faction: 'Neutral',
    maxHp: 13,
    isExpansion: true,
    winCondition: 'You possess 3 or more of: Talisman, Spear of Longinus, Holy Robe, Silver Rosary.',
    abilityName: 'Gravedigger',
    abilityDescription: 'Once per game, you may loot one Equipment card of your choice from any dead player.',
  },
  {
    id: 'bob_ex',
    name: 'Bob (ex)',
    faction: 'Neutral',
    maxHp: 10,
    isExpansion: true,
    winCondition: 'You have 4 or more Equipment cards.',
    abilityName: 'Robbery (ex)',
    abilityDescription: 'If your attack kills a character, you take all the Equipment cards that character had.',
  },
  // EXPANSION 3 HUNTERS
  {
    id: 'ellen',
    name: 'Ellen',
    faction: 'Hunter',
    maxHp: 10,
    isExpansion: true,
    winCondition: 'All Shadows are dead.',
    abilityName: 'Chain of Forbidden Curse',
    abilityDescription: 'Once per game, at the start of your turn, choose a character and void their Special Ability for the rest of the game.',
  },
  {
    id: 'fuka',
    name: 'Fuka',
    faction: 'Hunter',
    maxHp: 12,
    isExpansion: true,
    winCondition: 'All Shadows are dead.',
    abilityName: 'Dynamite Nurse',
    abilityDescription: 'Once per game, at the start of your next turn, set the damage of any character to 7.',
  },
  {
    id: 'gregor',
    name: 'Gregor',
    faction: 'Hunter',
    maxHp: 14,
    isExpansion: true,
    winCondition: 'All Shadows are dead.',
    abilityName: 'Ghostly Barrier',
    abilityDescription: 'Once per game, when your turn is over, you cannot receive any damage until the start of your next turn.',
  },
  // EXPANSION 3 SHADOWS
  {
    id: 'ultrasoul',
    name: 'Ultrasoul',
    faction: 'Shadow',
    maxHp: 11,
    isExpansion: true,
    winCondition: 'All Hunters are dead, or 3 Neutrals are dead.',
    abilityName: 'Murder Ray',
    abilityDescription: 'At the start of your turn, you can inflict 3 points of damage on any one character at Underworld Gate.',
  },
  {
    id: 'valkyrie',
    name: 'Valkyrie',
    faction: 'Shadow',
    maxHp: 13,
    isExpansion: true,
    winCondition: 'All Hunters are dead, or 3 Neutrals are dead.',
    abilityName: 'Horn of War Outbreak',
    abilityDescription: 'When you attack, your attack is executed by a single roll of the 4-sided die (you cannot fail).',
  },
  {
    id: 'wight',
    name: 'Wight',
    faction: 'Shadow',
    maxHp: 14,
    isExpansion: true,
    winCondition: 'All Hunters are dead, or 3 Neutrals are dead.',
    abilityName: 'Multiplication',
    abilityDescription: 'Once per game, when your turn ends, you may take as many extra turns as there are dead characters.',
  },
];

export function buildDeck(templates: CardTemplate[]): CardDef[] {
  const deck: CardDef[] = [];
  let uidCounter = 1;
  for (const tpl of templates) {
    for (let i = 0; i < tpl.count; i++) {
      deck.push({
        id: tpl.id,
        uid: `${tpl.id}_${uidCounter++}`,
        deck: tpl.deck,
        name: tpl.name,
        kind: tpl.kind,
        isExpansion: tpl.isExpansion,
        description: tpl.description,
      });
    }
  }
  return shuffle(deck);
}

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getFactionColor(faction: Faction): string {
  switch (faction) {
    case 'Hunter':
      return '#4fc3f7';
    case 'Shadow':
      return '#ef5350';
    case 'Neutral':
      return '#ffd54f';
  }
}
