import type { MutationStage } from '../../types/game';
import type { PixelGrid } from '../pixel';

export type CharacterFrame = 'idle' | 'blink' | 'step-a' | 'step-b' | 'dance-a' | 'dance-b';
export type CharacterDirection = 'front' | 'back';
type Hair = 'swept' | 'curls' | 'shag' | 'ponytail' | 'quiff' | 'bob' | 'cap' | 'bun' | 'parted' | 'fade' | 'mohawk' | 'locs';
type Outfit = 'jacket' | 'cardigan' | 'hoodie' | 'dress' | 'vest' | 'stripe' | 'apron';
type Accessory = 'glasses' | 'tie' | 'earrings' | 'headphones' | 'scarf' | 'chain' | 'none';

interface CharacterLook {
  hair: Hair;
  outfit: Outfit;
  accessory: Accessory;
  broad?: boolean;
}

const HOST_LOOK: CharacterLook = { hair: 'quiff', outfit: 'vest', accessory: 'tie' };
/** Identity data is independent of lure data: clothes must never reveal a solution. */
export const CHARACTER_LOOKS: Record<string, CharacterLook> = {
  host: HOST_LOOK,
  'guest-gary': { hair: 'swept', outfit: 'jacket', accessory: 'none', broad: true },
  'guest-denise': { hair: 'curls', outfit: 'cardigan', accessory: 'earrings' },
  'guest-moss': { hair: 'shag', outfit: 'hoodie', accessory: 'scarf' },
  'guest-priya': { hair: 'ponytail', outfit: 'dress', accessory: 'earrings' },
  'guest-benno': { hair: 'quiff', outfit: 'vest', accessory: 'chain', broad: true },
  'guest-roz': { hair: 'bob', outfit: 'jacket', accessory: 'glasses' },
  'guest-teddy': { hair: 'cap', outfit: 'stripe', accessory: 'none', broad: true },
  'guest-nadia': { hair: 'bun', outfit: 'jacket', accessory: 'headphones' },
  'guest-colm': { hair: 'parted', outfit: 'cardigan', accessory: 'glasses' },
  'guest-yusuf': { hair: 'fade', outfit: 'vest', accessory: 'tie' },
  'guest-bex': { hair: 'mohawk', outfit: 'jacket', accessory: 'chain' },
  'guest-marlon': { hair: 'locs', outfit: 'apron', accessory: 'none', broad: true },
  // The tutorial's stranger. Without a look of its own it fell back to the host's and read as you.
  'guest-demo': { hair: 'swept', outfit: 'hoodie', accessory: 'none' },
};

const HAIR: Record<Hair, PixelGrid> = {
  swept: ['...ooooooo....', '..ohHHhhhho...', '.ohHHhhhhggo..', '.ohhhgggggggo.', '.ohh....ggggo.', '..hg......gg..'],
  curls: ['..ooo..ooo....', '.ohHhoohHho...', 'ohHHhhhhhhhho.', 'ohhhgghhhggggo', '.ohhg...ggggo.', 'ohhg.....ggggo', '.ohg......ggo.'],
  shag: ['...oo.ooo.....', '..ohhohHho....', '.ohHHhhhhhho..', 'ohHHhhhhhhhgo.', '.ohhhghhggggo.', '.ohh..hg..ggo.', '.ohg......ggo.', '..hg.......go.', '..g.........g.'],
  ponytail: ['........ooo...', '..oooooohHho..', '.ohHHhhhhohgo.', 'ohHHhhhhgohgo.', 'ohhhgggggohgo.', 'ohh......o.ggo', '.hg.......oggo', '..........oggo', '...........og.'],
  quiff: ['.....oooo.....', '...oohHHho....', '..ohHHhhhgo...', '.ohHHhhhhggo..', '.ohhhgggggggo.', '.ohh.....gggo.', '..hg......gg..'],
  bob: ['...ooooooo....', '..ohHHhhhho...', '.ohHHhhhhhgo..', '.ohHhhhhggggo.', '.ohhgg...gggo.', '.ohh......ggo.', '.ohh......ggo.', '.ohhg.....ggo.', '..ogg.....go..'],
  cap: ['...ooooooo....', '..otrrrrtto...', '.otrrrrtttuo..', '.otttttttuuo..', 'ottttttttttuoo', '.ohh......ggo.'],
  bun: ['.....oooo.....', '....ohHHho....', '....ohhhgo....', '..ooohhhgooo..', '.ohHHhhhhhgo..', '.ohhhgggggggo.', '.ohh......ggo.', '..hg.......g..'],
  parted: ['...ooooooo....', '..ohHHhgHho...', '.ohHHhgHHhgo..', '.ohhhgghhhggo.', '.ohhg....gggo.', '..hg......gg..'],
  fade: ['...ooooooo....', '..ohHHhhhho...', '.ohhhhhhhhgo..', '.oggggggggggo.', '..gg......gg..'],
  mohawk: ['.....ooo......', '....ohHho.....', '....ohHhgo....', '...ohHHhgo....', '..oggHHhggoo..', '.ogggHHhggggo.', '..gg......gg..'],
  locs: ['..oo.oo.oo....', '.ohhohhohho...', 'ohHHhhhhhhhgo.', 'ohhhghhghhggo.', '.ohhghhghgggo.', '.ohg......ggo.', '.ohg......ggo.', '..hg......gg..', '..g........g..'],
};

const cache = new Map<string, PixelGrid>();

/**
 * Hand-authored masks assemble on one 32px canvas. Sharing the rig keeps feet
 * aligned across frames; separate hair, tailoring and accessories keep the
 * cast recognizable even after their skin and posture change.
 */
export function characterGrid(
  id: string,
  stage: MutationStage,
  frame: CharacterFrame = 'idle',
  direction: CharacterDirection = 'front',
): PixelGrid {
  const key = `${id}:${stage}:${frame}:${direction}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const look = CHARACTER_LOOKS[id] ?? HOST_LOOK;
  const pixels = Array.from({ length: 32 }, () => Array<string>(32).fill('.'));
  function stamp(x: number, y: number, rows: PixelGrid): void {
    rows.forEach((row, dy) => [...row].forEach((ink, dx) => {
      const target = pixels[y + dy];
      if (ink !== '.' && target && target[x + dx] !== undefined) target[x + dx] = ink;
    }));
  }
  function box(x: number, y: number, w: number, h: number, ink: string): void {
    stamp(x, y, Array<string>(h).fill(ink.repeat(w)));
  }

  const walk = frame === 'step-a' ? 1 : frame === 'step-b' ? -1 : 0;
  const dance = frame === 'dance-a' ? 1 : frame === 'dance-b' ? -1 : 0;
  const back = direction === 'back';
  const slump = stage >= 2 ? 2 : stage === 1 ? 1 : 0;
  const bob = walk !== 0 || dance !== 0 ? -1 : 0;
  const torsoY = 16 + bob;
  const left = look.broad ? 9 : 10;
  const width = look.broad ? 14 : 12;

  // Shoes stay on the ground plane. Alternating lengths supplies a real stride.
  stamp(11 - (dance === 1 ? 1 : 0), 24 + (walk === 1 ? -1 : 0), ['opppo', 'opqqo', 'oppqo', 'obBBo', 'obboo']);
  stamp(17 + (dance === -1 ? 1 : 0), 24 + (walk === -1 ? -1 : 0), ['opppo', 'opqqo', 'oppqo', 'obBBo', 'obboo']);
  box(left, torsoY, width, 9, 'o');
  box(left + 1, torsoY + 1, width - 2, 6, 't');
  box(left + 1, torsoY + 1, 2, 5, 'r');
  box(left + width - 3, torsoY + 2, 2, 6, 'u');
  box(left + 1, torsoY + 7, width - 2, 1, 'u');
  if (!back) {
    if (look.outfit === 'jacket' || look.outfit === 'cardigan') {
      stamp(14, torsoY + 1, ['waww', 'twut', '.wu.', '.wu.', '.wu.', '.au.']);
      stamp(left + 2, torsoY + 5, ['uu', 'rr']);
    } else if (look.outfit === 'vest') {
      stamp(12, torsoY, ['wwsswwww', 'wuttuutw', 'wtuttuwt', '.tuuuuw.', '.uutuuw.', '.uutuuw.', '.uutuuw.']);
      box(16, torsoY + 3, 1, 4, 'a');
    } else if (look.outfit === 'hoodie') {
      stamp(12, torsoY, ['udssduuu', 'tudduutt', '.w..w...', '.w..w...', '........', '.uuuuuu.', '.rrrrrr.']);
    } else if (look.outfit === 'stripe') {
      box(left + 1, torsoY + 3, width - 3, 1, 'w');
      box(left + 1, torsoY + 5, width - 3, 1, 'w');
    } else if (look.outfit === 'apron') {
      stamp(12, torsoY + 1, ['wtttttw', 'wwwwwww', 'wwwwwww', 'wwduwww', 'wwuuwuw', 'wwwwwww', 'ddddddd']);
    }
    if (look.accessory === 'tie') stamp(15, torsoY, ['aa', '.a', '.a', '.a', 'aa']);
    if (look.accessory === 'chain') stamp(12, torsoY + 1, ['a.....a', '.a...a.', '..aaa..']);
    if (look.accessory === 'scarf') stamp(12, torsoY, ['aaaaaaa', '..aau..', '..aau..', '..aau..']);
    if (look.accessory === 'headphones') stamp(10, torsoY, ['koo......ook', 'kBo......oBk', '.ooaaaaaaoo.']);
  } else {
    box(left + 2, torsoY + 1, width - 5, 1, 'r');
    if (look.outfit === 'hoodie') stamp(12, torsoY, ['ouuuuuuo', '.otttto.', '..oooo..']);
  }
  if (look.outfit === 'dress') {
    stamp(9, torsoY + 6, ['.otttttttttto.', 'ottrtttttttuuo', 'ottttttttttuuo', '.ouuuuuuuuuuo.']);
    if (!back) box(11, torsoY + 4, 10, 1, 'a');
  }

  // Bent elbows for late mutation and dancing; sleeves and hands swing opposite feet.
  const armY = torsoY + 1;
  const arm = ['ottto', 'ortuo', 'ostuo', '.osso', '.odso', '..oo.'];
  stamp(left - 3, armY - (walk === -1 ? 1 : 0) - (stage >= 2 ? 2 : 0) - (dance === 1 ? 3 : 0), arm);
  stamp(left + width - 2, armY - (walk === 1 ? 1 : 0) - (stage === 3 ? 4 : 0) - (dance === -1 ? 3 : 0), arm.map(row => [...row].reverse().join('')));

  const hx = stage >= 2 ? 10 : 9;
  const hy = 5 + slump + bob;
  stamp(hx, hy, [
    '...ooooooo....', '..osssssssso..', '.osssssssddso.', '.ossssssssddo.',
    'osssssssssddso', 'odsswesswessdo', '.osssssssdddo.', '.osssssssdddo.',
    '..osssmmssdo..', '...osssssdo...', '....oddddo....', '.....dsso.....',
  ]);
  if (frame === 'blink' || stage === 1) stamp(hx + 4, hy + 5, ['ee..ee']);
  if (stage >= 2) stamp(hx + 5, hy + 8, ['ommo', '.mm.']);
  if (stage === 3) stamp(hx + 5, hy + 8, ['ommo', 'owwo']);
  if (back) {
    stamp(hx, hy, ['...ooooooo....', '..oghhhhhggo..', '.ohHHhhhhgggo.', '.ohHHhhhhgggo.', '.ohhhhhhhgggo.', '.oghhhhhhgggo.', '..oggggggggo..', '...oggggggo...', '....oggggo....', '.....dddo.....']);
  }
  stamp(hx, hy - 3, HAIR[look.hair]);
  if (!back && look.accessory === 'glasses') stamp(hx + 2, hy + 4, ['oooo.oooo', 'okwoookwo', '.oo...oo.']);
  if (!back && look.accessory === 'earrings') {
    stamp(hx + 1, hy + 7, ['a']); stamp(hx + 11, hy + 7, ['a']);
  }
  const result = pixels.map(row => row.join(''));
  cache.set(key, result);
  return result;
}

/** Bare poses remain available for the tutorial's mutation diagram. */
export const GUEST_POSES: Record<MutationStage, PixelGrid> = {
  0: characterGrid('guest-gary', 0),
  1: characterGrid('guest-gary', 1),
  2: characterGrid('guest-gary', 2),
  3: characterGrid('guest-gary', 3),
};
