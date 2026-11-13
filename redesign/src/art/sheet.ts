/** Contact sheet for reviewing the furniture, food, emote and door sprites. */
import { PROP_DEFS, propSprite, foodSprite, emoteSprite, doorSprite, FOOD_IDS, EMOTE_IDS } from './props';
import type { Sprite } from './pix';
const Z = 5, CELL = 36, COLS = 9;
const items: [string, Sprite][] = [];
for (const [id, def] of Object.entries(PROP_DEFS)) {
  items.push([id, propSprite(id, { on: false })]);
  if (def.switchable) items.push([`${id} on`, propSprite(id, { on: true, f: 1 })]);
  else if (def.frames) items.push([`${id} f1`, propSprite(id, { f: 1 })]);
}
for (const id of FOOD_IDS) items.push([id, foodSprite(id)]);
for (const id of EMOTE_IDS) items.push([id, emoteSprite(id)]);
for (const k of ['h', 'v'] as const) for (const s of ['closed', 'open', 'locked'] as const) items.push([`door ${k} ${s}`, doorSprite(k, s)]);
const cv = document.createElement('canvas');
cv.width = COLS * CELL * Z; cv.height = Math.ceil(items.length / COLS) * (CELL + 4) * Z;
document.body.style.margin = '0'; document.body.appendChild(cv);
const ctx = cv.getContext('2d')!; ctx.imageSmoothingEnabled = false;
const floors = ['#a87244', '#7a3a48', '#d9cdb6', '#566490'];
items.forEach(([name, s], i) => {
  const x = (i % COLS) * CELL * Z, y = Math.floor(i / COLS) * (CELL + 4) * Z;
  ctx.fillStyle = floors[Math.floor(i / COLS) % floors.length]!; ctx.fillRect(x, y, CELL * Z, (CELL + 4) * Z);
  ctx.drawImage(s.base, x + 2 * Z, y + 2 * Z, s.w * Z, s.h * Z);
  ctx.fillStyle = '#fff'; ctx.font = '12px monospace'; ctx.fillText(name, x + 4, y + (CELL + 2) * Z);
});
(window as never as { done: boolean }).done = true;
