import {
  AREA_LIST,
  BLACK_CARD_TEMPLATES,
  CHARACTERS,
  HERMIT_CARD_TEMPLATES,
  WHITE_CARD_TEMPLATES,
} from '../data/cards';

let preloaded = false;

export function preloadAllCardImages(): void {
  if (preloaded || typeof window === 'undefined') return;
  preloaded = true;

  const urls = new Set<string>();
  for (const a of AREA_LIST) {
    urls.add(`/assets/areas/${a.id}.webp`);
  }
  for (const c of CHARACTERS) {
    urls.add(`/assets/characters/${c.id}.webp`);
  }
  for (const card of [
    ...BLACK_CARD_TEMPLATES,
    ...WHITE_CARD_TEMPLATES,
    ...HERMIT_CARD_TEMPLATES,
  ]) {
    urls.add(`/assets/cards/${card.id}.webp`);
  }

  for (const url of urls) {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
  }
}
