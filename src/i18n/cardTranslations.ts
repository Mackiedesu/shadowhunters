import type { AreaId, CharacterDef } from '../types/game';
import type { Lang } from './translations';

export const AREA_DESC_VI: Record<AreaId, string> = {
  hermit_cabin: 'Bạn được rút 1 lá Hermit (Xanh lá).',
  underworld_gate: 'Bạn được rút 1 lá từ chồng bài bất kỳ (Trắng, Đen hoặc Xanh lá).',
  church: 'Bạn được rút 1 lá White (Trắng).',
  cemetery: 'Bạn được rút 1 lá Black (Đen).',
  weird_woods: 'Bạn có thể gây 2 sát thương cho bất kỳ ai hoặc hồi 1 máu cho bất kỳ ai.',
  erstwhile_altar: 'Bạn có thể cướp 1 lá Trang bị từ bất kỳ người chơi nào.',
};

export const CARD_DESC_VI: Record<string, string> = {
  // Black Cards
  banana_peel: 'Đưa 1 lá Trang bị của bạn cho người chơi khác. Nếu không có Trang bị nào, bạn nhận 1 sát thương.',
  bloodthirsty_spider: 'Gây 2 sát thương cho bất kỳ người chơi nào và bạn cũng tự nhận 2 sát thương.',
  butcher_knife: 'Khi tấn công trúng, gây thêm 1 sát thương.',
  chainsaw: 'Khi tấn công trúng, gây thêm 1 sát thương.',
  diabolic_ritual: 'Nếu bạn là Shadow, bạn có thể lộ danh tính để hồi sát thương về 0.',
  dynamite: 'Tung 2 xúc xắc và gây 3 sát thương cho tất cả người chơi ở vùng đất có số tương ứng (ra 7 không có tác dụng).',
  handgun: 'Tầm tấn công của bạn trở thành tất cả các Vùng đất ngoại trừ vùng bạn đang đứng.',
  machine_gun: 'Đòn tấn công của bạn nhắm vào TẤT CẢ người chơi trong tầm đánh (tung xúc xắc 1 lần và áp dụng cho tất cả).',
  masamune: 'Bạn BẮT BUỘC phải tấn công nếu có mục tiêu. Đòn đánh chỉ tung 1 xúc xắc 4 mặt (không bao giờ hụt).',
  moody_goblin: 'Cướp 1 lá Trang bị từ bất kỳ người chơi nào.',
  rusted_broad_axe: 'Khi tấn công trúng, gây thêm 1 sát thương.',
  spiritual_doll: 'Chọn 1 người chơi và tung xúc xắc 6 mặt: ra 1–4 gây 3 sát thương cho họ; ra 5–6 bạn nhận 3 sát thương.',
  vampire_bat: 'Gây 2 sát thương cho bất kỳ người chơi nào và hồi 1 máu cho bản thân.',
  // White Cards
  advent: 'Nếu bạn là Hunter, bạn có thể lộ danh tính để hồi sát thương về 0.',
  blessing: 'Chọn 1 người chơi khác và tung xúc xắc 6 mặt. Người đó hồi lượng máu bằng số xúc xắc.',
  chocolate: 'Nếu tên nhân vật của bạn bắt đầu bằng A, E hoặc U, bạn có thể lộ danh tính để hồi sát thương về 0.',
  concealed_knowledge: 'Sau khi kết thúc lượt này, bạn được đi thêm 1 lượt nữa.',
  disenchant_mirror: 'Nếu tên nhân vật của bạn bắt đầu bằng V hoặc W, bạn BẮT BUỘC phải lộ danh tính.',
  first_aid: 'Đặt mức sát thương của 1 người chơi bất kỳ thành 7 (có thể chọn chính mình).',
  flare_of_judgement: 'Tất cả người chơi khác ngoại trừ bạn đều nhận 2 sát thương.',
  fortune_brooch: 'Bạn không nhận sát thương từ Weird Woods.',
  guardian_angel: 'Bạn không nhận sát thương từ đòn tấn công của người chơi khác cho đến lượt tiếp theo của bạn.',
  holy_robe: 'Đòn tấn công của bạn gây ít hơn 1 sát thương và sát thương bạn nhận từ đòn tấn công giảm đi 1.',
  holy_water: 'Hồi 2 máu cho bản thân.',
  mystic_compass: 'Bạn được tung xúc xắc 2 lần khi di chuyển và chọn 1 trong 2 kết quả.',
  silver_rosary: 'Nếu bạn tấn công và hạ gục 1 người chơi, bạn lấy toàn bộ Trang bị của họ.',
  spear_of_longinus: 'Nếu bạn là Hunter và đánh trúng, bạn có thể lộ danh tính để gây thêm 2 sát thương.',
  talisman: 'Bạn không nhận sát thương từ các lá Đen "Bloodthirsty Spider", "Vampire Bat" và "Dynamite".',
  // Hermit Cards
  aid: 'Nếu bạn là Hunter: hồi 1 máu (nếu chưa mất máu nào thì nhận 1 sát thương).',
  anger: 'Nếu bạn là Hunter hoặc Shadow: đưa 1 Trang bị cho người chơi hiện tại hoặc nhận 1 sát thương.',
  blackmail: 'Nếu bạn là Hunter hoặc Neutral: đưa 1 Trang bị cho người chơi hiện tại hoặc nhận 1 sát thương.',
  bully: 'Nếu HP tối đa của bạn <= 11 (A, B, C, E, U): nhận 1 sát thương.',
  exorcism: 'Nếu bạn là Shadow: nhận 2 sát thương.',
  greed: 'Nếu bạn là Neutral hoặc Shadow: đưa 1 Trang bị cho người chơi hiện tại hoặc nhận 1 sát thương.',
  huddle: 'Nếu bạn là Shadow: hồi 1 máu (nếu chưa mất máu nào thì nhận 1 sát thương).',
  nurturance: 'Nếu bạn là Neutral: hồi 1 máu (nếu chưa mất máu nào thì nhận 1 sát thương).',
  prediction: 'Cho người chơi hiện tại xem bí mật lá bài nhân vật của bạn.',
  slap: 'Nếu bạn là Hunter: nhận 1 sát thương.',
  spell: 'Nếu bạn là Shadow: nhận 1 sát thương.',
  tough_lesson: 'Nếu HP tối đa của bạn >= 12 (D, F, G, V, W): nhận 2 sát thương.',
};

export const CHAR_VI: Record<string, { win: string; ability: string }> = {
  allie: {
    win: 'Bạn sống sót cho đến khi có người chơi khác đạt điều kiện thắng.',
    ability: 'Một lần mỗi trận, hồi toàn bộ sát thương của bạn về 0.',
  },
  bob: {
    win: 'Bạn sở hữu từ 5 lá Trang bị trở lên.',
    ability: 'Nếu bạn gây từ 2 sát thương trở lên khi tấn công, bạn có thể chọn cướp 1 Trang bị của nạn nhân thay vì gây sát thương.',
  },
  charles: {
    win: 'Đòn tấn công của bạn hạ gục 1 người chơi và tổng số người chết đạt từ 3 trở lên.',
    ability: 'Sau khi tấn công, bạn có thể tự nhận 2 sát thương để tấn công thêm 1 lần nữa.',
  },
  daniel: {
    win: 'Bạn là người đầu tiên chết, hoặc bạn sống sót và phe Hunter giành chiến thắng.',
    ability: 'Ngay khi có 1 người chơi chết, danh tính của bạn sẽ tự động lộ.',
  },
  emi: {
    win: 'Toàn bộ Shadow đã chết.',
    ability: 'Khi di chuyển, bạn có thể đi sang Vùng đất kề bên thay vì tung xúc xắc.',
  },
  franklin: {
    win: 'Toàn bộ Shadow đã chết.',
    ability: 'Một lần mỗi trận, gây sát thương cho 1 người chơi bất kỳ bằng kết quả tung xúc xắc 6 mặt.',
  },
  george: {
    win: 'Toàn bộ Shadow đã chết.',
    ability: 'Một lần mỗi trận, gây sát thương cho 1 người chơi bất kỳ bằng kết quả tung xúc xắc 4 mặt.',
  },
  unknown: {
    win: 'Toàn bộ Hunter đã chết, hoặc 3 Neutral đã chết.',
    ability: 'Khi nhận thẻ Hermit, bạn có quyền nói dối về danh tính mà không cần lộ diện.',
  },
  vampire: {
    win: 'Toàn bộ Hunter đã chết, hoặc 3 Neutral đã chết.',
    ability: 'Nếu bạn tấn công và gây sát thương cho người chơi khác, bạn hồi 2 máu cho bản thân.',
  },
  werewolf: {
    win: 'Toàn bộ Hunter đã chết, hoặc 3 Neutral đã chết.',
    ability: 'Sau khi bị người chơi khác tấn công, bạn có thể phản công lại người đó ngay lập tức.',
  },
  agnes: {
    win: 'Người chơi phía trên (hoặc phía dưới nếu đã đổi) trong danh sách đạt điều kiện thắng.',
    ability: 'Đầu lượt của bạn, có thể đổi điều kiện thắng sang người chơi phía dưới mình.',
  },
  bryan: {
    win: 'Đòn tấn công của bạn hạ gục nhân vật có HP tối đa >= 13, hoặc bạn đang ở Erstwhile Altar khi có người thắng.',
    ability: 'Nếu bạn tấn công hạ gục nhân vật có HP tối đa <= 12, danh tính của bạn sẽ bị lộ.',
  },
  catherine: {
    win: 'Bạn là người đầu tiên chết, hoặc bạn là 1 trong 2 người sống sót cuối cùng.',
    ability: 'Hồi 1 máu cho bản thân vào đầu mỗi lượt của bạn (khi đã lộ diện).',
  },
  david: {
    win: 'Bạn sở hữu từ 3 món trở lên trong bộ: Talisman, Spear of Longinus, Holy Robe, Silver Rosary.',
    ability: 'Một lần mỗi trận, lấy 1 lá Trang bị tùy chọn từ bất kỳ người chơi nào đã chết.',
  },
  bob_ex: {
    win: 'Bạn sở hữu từ 4 lá Trang bị trở lên.',
    ability: 'Nếu bạn tấn công hạ gục 1 người chơi, bạn lấy toàn bộ Trang bị của họ.',
  },
  ellen: {
    win: 'Toàn bộ Shadow đã chết.',
    ability: 'Một lần mỗi trận, vào đầu lượt, chọn 1 người chơi và vô hiệu hóa Kỹ năng đặc biệt của họ đến hết trận.',
  },
  fuka: {
    win: 'Toàn bộ Shadow đã chết.',
    ability: 'Một lần mỗi trận, đặt mức sát thương của 1 người chơi bất kỳ thành 7.',
  },
  gregor: {
    win: 'Toàn bộ Shadow đã chết.',
    ability: 'Một lần mỗi trận, khi kết thúc lượt, bạn không nhận bất kỳ sát thương nào đến đầu lượt tiếp theo.',
  },
  ultrasoul: {
    win: 'Toàn bộ Hunter đã chết, hoặc 3 Neutral đã chết.',
    ability: 'Đầu lượt, có thể gây 3 sát thương cho 1 người chơi đang ở Underworld Gate.',
  },
  valkyrie: {
    win: 'Toàn bộ Hunter đã chết, hoặc 3 Neutral đã chết.',
    ability: 'Khi tấn công, bạn chỉ tung 1 xúc xắc 4 mặt (không bao giờ đánh hụt).',
  },
  wight: {
    win: 'Toàn bộ Hunter đã chết, hoặc 3 Neutral đã chết.',
    ability: 'Một lần mỗi trận, khi kết thúc lượt, bạn được đi thêm số lượt bằng số người đã chết.',
  },
};

export function getAreaDesc(id: AreaId, fallback: string, lang: Lang): string {
  return lang === 'vi' ? AREA_DESC_VI[id] || fallback : fallback;
}

export function getCardDesc(id: string, fallback: string, lang: Lang): string {
  return lang === 'vi' ? CARD_DESC_VI[id] || fallback : fallback;
}

export function getCharWin(id: string, fallback: string, lang: Lang): string {
  return lang === 'vi' ? CHAR_VI[id]?.win || fallback : fallback;
}

export function getCharAbility(id: string, fallback: string, lang: Lang): string {
  return lang === 'vi' ? CHAR_VI[id]?.ability || fallback : fallback;
}

export function getCharCardDesc(char: CharacterDef, lang: Lang): string {
  const win = getCharWin(char.id, char.winCondition, lang);
  const ability = getCharAbility(char.id, char.abilityDescription, lang);
  if (lang === 'vi') {
    return `Phe: ${char.faction} • ${char.maxHp} HP\nĐiều kiện thắng: ${win}\nKỹ năng (${char.abilityName}): ${ability}`;
  }
  return `Faction: ${char.faction} • ${char.maxHp} HP\nWin Condition: ${win}\nAbility (${char.abilityName}): ${ability}`;
}

export function translateLogText(text: string, lang: Lang): string {
  if (lang === 'en') {
    if (text.endsWith('không có hành động tấn công phù hợp, tự động kết thúc lượt.')) {
      return text.replace(
        'không có hành động tấn công phù hợp, tự động kết thúc lượt.',
        'has no valid attack action, auto-ending turn.'
      );
    }
    if (text.endsWith('Round 1 không được phép tấn công thường, tự động kết thúc lượt.')) {
      return text.replace(
        'Round 1 không được phép tấn công thường, tự động kết thúc lượt.',
        'Round 1 normal attacks are not allowed, auto-ending turn.'
      );
    }
    if (text.endsWith('không còn hành động nào khác, tự động kết thúc lượt.')) {
      return text.replace(
        'không còn hành động nào khác, tự động kết thúc lượt.',
        'has no other actions left, auto-ending turn.'
      );
    }
    return text;
  }

  // Vietnamese translations for English engine logs
  let m: RegExpMatchArray | null;
  if ((m = text.match(/^--- (.+)'s Turn ---$/))) {
    return `--- Lượt của ${m[1]} ---`;
  }
  if ((m = text.match(/^Game started with (\d+) players \((.+)\)\.$/))) {
    return `Trận đấu bắt đầu với ${m[1]} người chơi (${m[2]}).`;
  }
  if ((m = text.match(/^(.+) rolled 7 \((.+)\)! Choose any Area\.$/))) {
    return `${m[1]} tung ra 7 (${m[2]})! Hãy chọn Vùng đất bất kỳ.`;
  }
  if ((m = text.match(/^(.+) moved to (.+)\.$/))) {
    return `${m[1]} đã di chuyển tới ${m[2]}.`;
  }
  if ((m = text.match(/^(.+) drew a Hermit card\.$/))) {
    return `${m[1]} đã rút 1 lá Hermit.`;
  }
  if ((m = text.match(/^(.+) drew (.+) \((.+)\)\.$/))) {
    return `${m[1]} đã rút ${m[2]} (${m[3]}).`;
  }
  if ((m = text.match(/^(.+) gave a Hermit card to (.+)\.$/))) {
    return `${m[1]} đã đưa 1 lá Hermit cho ${m[2]}.`;
  }
  if ((m = text.match(/^(.+) gave (.+) to (.+)\.$/))) {
    return `${m[1]} đã đưa ${m[2]} cho ${m[3]}.`;
  }
  if ((m = text.match(/^(.+) reported: Hermit card had no effect\.$/))) {
    return `${m[1]} báo: Thẻ Hermit không có tác dụng.`;
  }
  if ((m = text.match(/^(.+) targets (.+) for an attack!$/))) {
    return `${m[1]} chọn mục tiêu tấn công là ${m[2]}!`;
  }
  if ((m = text.match(/^(.+)'s attack missed \(rolled (.+)\)!$/))) {
    return `Đòn đánh của ${m[1]} bị hụt (tung ra ${m[2]})!`;
  }
  if ((m = text.match(/^(.+) takes (\d+) damage(?: \((.+)\))? \((.+)\)\.$/))) {
    return `${m[1]} nhận ${m[2]} sát thương${m[3] ? ` (${m[3]})` : ''} (${m[4]}).`;
  }
  if ((m = text.match(/^(.+) healed (\d+) damage(?: \((.+)\))? \((.+)\)\.$/))) {
    return `${m[1]} hồi ${m[2]} máu${m[3] ? ` (${m[3]})` : ''} (${m[4]}).`;
  }
  if ((m = text.match(/^(.+) is protected and takes 0 damage!$/))) {
    return `${m[1]} được bảo vệ và nhận 0 sát thương!`;
  }
  if ((m = text.match(/^(.+) revealed their identity: (.+)!$/))) {
    return `${m[1]} đã lộ danh tính: ${m[2]}!`;
  }
  if ((m = text.match(/^(.+) revealed as (.+) — (.+)!$/))) {
    return `${m[1]} lộ diện là ${m[2]} — ${m[3]}!`;
  }
  if ((m = text.match(/^💀 (.+) has died!$/))) {
    return `💀 ${m[1]} đã tử trận!`;
  }
  if ((m = text.match(/^🏆 GAME OVER! Winners: (.+)$/))) {
    return `🏆 KẾT THÚC! Người chiến thắng: ${m[1]}`;
  }
  if ((m = text.match(/^(.+) took (.+) from (.+)\.$/))) {
    return `${m[1]} đã lấy ${m[2]} từ ${m[3]}.`;
  }
  if ((m = text.match(/^(.+) chose to stay hidden \((.+)\)\.$/))) {
    return `${m[1]} chọn giữ bí mật danh tính (${m[2]}).`;
  }
  if ((m = text.match(/^(.+) takes an extra turn!$/))) {
    return `${m[1]} được đi thêm 1 lượt!`;
  }
  if ((m = text.match(/^(.+) will take an extra turn after this one!$/))) {
    return `${m[1]} sẽ được đi thêm 1 lượt sau lượt này!`;
  }
  if ((m = text.match(/^(.+) is protected by Guardian Angel until their next turn!$/))) {
    return `${m[1]} được Guardian Angel bảo vệ đến lượt tiếp theo!`;
  }
  if ((m = text.match(/^(.+) secretly showed their identity to (.+)\.$/))) {
    return `${m[1]} đã cho ${m[2]} xem bí mật danh tính.`;
  }
  if ((m = text.match(/^Prediction: (.+) secretly showed (.+) to (.+)\.$/))) {
    return `Prediction: ${m[1]} đã cho ${m[3]} xem bí mật (${m[2]}).`;
  }
  if ((m = text.match(/^First Aid set (.+)'s damage to (.+)\.$/))) {
    return `First Aid đã đặt sát thương của ${m[1]} thành ${m[2]}.`;
  }

  return text;
}
