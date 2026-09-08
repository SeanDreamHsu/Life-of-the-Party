import type { PixelGrid } from '../pixel';

/**
 * FURNITURE — 32x32, drawn against OBJECT_PALETTE.
 *
 * Redrawn to the same conventions as the food and the party lights, so the set
 * reads as one art pass rather than three:
 *
 *   HUE-MATCHED OUTLINES. A couch is outlined in its own darkest blue, wood in
 *   its own darkest brown. The hard black `o` is reserved for genuine contact
 *   edges; used as a keyline around everything it flattens the whole scene.
 *
 *   RAMPS, NOT PAIRS. Three steps minimum per material, lit from the upper
 *   left: highlight along the top edge, mid through the body, dark underneath.
 *
 *   SPECULARS. Anything with a sheen — metal, ceramic, screens — gets a small
 *   near-white patch where the light would actually catch it.
 *
 *   BROKEN REPETITION. A shelf of identical 2px bars reads as a barcode, a
 *   tabletop of single stray dark pixels reads as dirt. Anything repeated gets
 *   varied widths, varied heights, and gaps, the way a real one would.
 */

/**
 * Three-seat couch. Each cushion is its own lit block with a dark seam, so the
 * back reads as upholstery rather than one painted rectangle, and the arms come
 * forward of the back with their own highlight.
 */
const COUCH: PixelGrid = [
  '................................',
  '................................',
  '................................',
  '................................',
  '..CCCCCCCCCCCCCCCCCCCCCCCCCCCC..',
  '..CllllllllCllllllllCllllllllC..',
  '..ClcccccccClcccccccClcccccccC..',
  '..ClcccccccClcccccccClcccccccC..',
  '..ClcccccccClcccccccClcccccccC..',
  '..ClcccccccClcccccccClcccccccC..',
  '..ClcccccccClcccccccClcccccccC..',
  '..ClcccccCCClcccccCCClcccccCCC..',
  '..CCCCCCCCCCCCCCCCCCCCCCCCCCCC..',
  '..CCCCCCCCCCCCCCCCCCCCCCCCCCCC..',
  '..CllCCCCCCCCCCCCCCCCCCCCCClcC..',
  '..ClcCllllllCllllllCllllllClcC..',
  '..ClcClcccccClcccccClcccccClcC..',
  '..ClcClcccccClcccccClcccccClcC..',
  '..ClcClcccccClcccccClcccccClcC..',
  '..ClcClcccccClcccccClcccccClcC..',
  '..ClcClcccCCClcccCCClcccCCClcC..',
  '..ClcCCCCCCCCCCCCCCCCCCCCCClcC..',
  '..CccccccccccccccccccccccccccC..',
  '..CCCCCCCCCCCCCCCCCCCCCCCCCCCC..',
  '....www..................www....',
  '....WWW..................WWW....',
  '..nnnnnnnnnnnnnnnnnnnnnnnnnnnn..',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

/**
 * Flat-panel TV. The screen is an equaliser mid-bounce with a near-white cap on
 * each bar, so the set looks switched on even before the lighting layer adds a
 * glow — and a soft glare in the top-left corner keeps the glass from reading
 * as a flat black hole.
 */
const TELEVISION: PixelGrid = [
  '................................',
  '................................',
  '................................',
  '...ZZZZZZZZZZZZZZZZZZZZZZZZZZ...',
  '...ZzzzzzzzzzzzzzzzzzzzzzzzzZ...',
  '...ZzzzkkkkkkkkkkkkkkkkkkkkzZ...',
  '...ZzzkkkkkkkkkkkkkkkkkkkkkzZ...',
  '...ZzkkkkkkkkkkkkkGGkkkkkkkzZ...',
  '...ZzkkkkkkkGGkkkkKKkkkkkkkzZ...',
  '...ZzkkkkkkkKKkkkkKKkkkkkkkzZ...',
  '...ZzkkkkkkkKKkkkkKKkkkkGGkzZ...',
  '...ZzkkkkGGkKKkkkkKKkkkkKKkzZ...',
  '...ZzkkkkKKkKKkGGkKKkkkkKKkzZ...',
  '...ZzkkkkKKkKKkKKkKKkGGkKKkzZ...',
  '...ZzkGGkKKkKKkKKkKKkKKkKKkzZ...',
  '...ZzkKKkKKkKKkKKkKKkKKkKKkzZ...',
  '...ZzkKKkKKkKKkKKkKKkKKkKKkzZ...',
  '...ZzzzzzzzzzzzzzzzzzzzzzzzzZ...',
  '...ZZZZZZZZZZZZZZZZZZZZZZZZZZ...',
  '..............ZzzZ..............',
  '..............ZzzZ..............',
  '..............ZzzZ..............',
  '........ZZZZZZZZZZZZZZZZ........',
  '........ZxxxxxxxxxxxxxxZ........',
  '........ZZZZZZZZZZZZZZZZ........',
  '........nnnnnnnnnnnnnnnn........',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

/**
 * PA speaker — the loudest object in the house and the lure most of the game
 * turns on, so it gets the most detail: a horn tweeter, a twelve-pixel woofer
 * with a lit dust cap, and a power LED. The old version was a plain cabinet
 * with two grey squares stuck on the front.
 */
const SPEAKER: PixelGrid = [
  '................................',
  '................................',
  '................................',
  '........WWWWWWWWWWWWWWWW........',
  '........WyyyyyyyyyyyyyyW........',
  '........WwwwwwwwwwwwwwwW........',
  '........WwwwwwZZZZwwwwwW........',
  '........WwwwwZZzzZZwwwwW........',
  '........WwwwZZzxxzZZwwwW........',
  '........WwwwZZzxxzZZwwwW........',
  '........WwwwwZZzzZZwwwwW........',
  '........WwwwwwZZZZwwwwwW........',
  '........WwwwwwwwwwwwwwwW........',
  '........Ww....ZZZZ....wW........',
  '........Ww..ZZzzzzZZ..wW........',
  '........Ww.ZZzzzzzzZZ.wW........',
  '........WwZZzzzzzzzzZZwW........',
  '........WwZzzzxxxxzzzZwW........',
  '........WwZzzxGxxxxzzZwW........',
  '........WwZzzxxxxxxzzZwW........',
  '........WwZzzzxxxxzzzZwW........',
  '........WwZZzzzzzzzzZZwW........',
  '........Ww.ZZzzzzzzZZ.wW........',
  '........Ww..ZZzzzzZZ..wW........',
  '........Ww....ZZZZ....wW........',
  '........WwwwwwwwwwwwpwwW........',
  '........WwwwwwwwwwwwwwwW........',
  '........WWWWWWWWWWWWWWWW........',
  '........WWWWWWWWWWWWWWWW........',
  '........nnnnnnnnnnnnnnnn........',
  '................................',
  '................................',
];

/**
 * Two-door fridge. A chamfered top, a bright sheen strip down the left of the
 * steel, chrome pull handles on brackets, and a note held on by a magnet —
 * because this is somebody's actual kitchen, not a showroom.
 */
const FRIDGE: PixelGrid = [
  '................................',
  '................................',
  '........ZZZZZZZZZZZZZZZZ........',
  '.......ZxxxxxxxxxxxxxxxxZ.......',
  '.......ZzxxzzzzzzzzzzzzZZ.......',
  '.......ZzxxzzzzzzzzzzzzZZ.......',
  '.......ZzxxzzzzzzzzzZZzZZ.......',
  '.......ZzxxzzzzzzzzzxzzZZ.......',
  '.......ZzxxzzzzzzzzzxzzZZ.......',
  '.......ZzxxzzzzzzzzzxzzZZ.......',
  '.......ZzxxzzzzzzzzzxzzZZ.......',
  '.......ZzxxzzzzzzzzzZZzZZ.......',
  '.......ZZZZZZZZZZZZZZZZZZ.......',
  '.......ZxxxxxxxxxxxxxxxxZ.......',
  '.......ZzxxzzzzzzzzzzzzZZ.......',
  '.......ZzxxzrrzzzzzzzzzZZ.......',
  '.......ZzxxEEEEEzzzzZZzZZ.......',
  '.......ZzxxEiiiEzzzzxzzZZ.......',
  '.......ZzxxEiiiEzzzzxzzZZ.......',
  '.......ZzxxEEEEEzzzzxzzZZ.......',
  '.......ZzxxzzzzzzzzzxzzZZ.......',
  '.......ZzxxzzzzzzzzzZZzZZ.......',
  '.......ZzxxzzzzzzzzzzzzZZ.......',
  '.......ZzxxzzzzzzzzzzzzZZ.......',
  '.......ZZZZZZZZZZZZZZZZZZ.......',
  '.......nnnnnnnnnnnnnnnnnn.......',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

/**
 * Dining table. The old version scattered single dark pixels across the top as
 * "grain", which just reads as grit; grain is short horizontal runs following
 * plank seams, so that is what this draws.
 */
const TABLE: PixelGrid = [
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '....WWWWWWWWWWWWWWWWWWWWWWWW....',
  '....WyyyyyyyyyyyyyyyyyyyyyyW....',
  '....WwwwwwwwWwwwwwwWwwwwwwwW....',
  '....WwyyyywwWwwwwwwWwwwwwwwW....',
  '....WwwwwwwwWwyyyywWwwwwwwwW....',
  '....WwwwwwwwWwwwwwwWwwyyyywW....',
  '....WwwwwwwwWwwwwwwWwwwwwwwW....',
  '....WWWWWWWWWWWWWWWWWWWWWWWW....',
  '....WWWWWWWWWWWWWWWWWWWWWWWW....',
  '......ywW..............ywW......',
  '......ywW..............ywW......',
  '......ywW..............ywW......',
  '......ywW..............ywW......',
  '......WWW..............WWW......',
  '....nnnnnnnnnnnnnnnnnnnnnnnn....',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

/**
 * Beer keg. Shaded across the barrel rather than banded down it, with a domed
 * chrome valve on top and an amber label band — so it reads as a keg at one
 * tile instead of as a bin.
 */
const KEG: PixelGrid = [
  '................................',
  '................................',
  '.............ZZZZZZ.............',
  '.............ZxxxxZ.............',
  '.............ZzzzzZ.............',
  '........ZZZZZZZZZZZZZZZZ........',
  '........ZxxxxxxxxxxxxxxZ........',
  '........ZZZZZZZZZZZZZZZZ........',
  '........ZzxxzzzzzzzzzZZZ........',
  '........ZzxxzzzzzzzzzZZZ........',
  '........ZzxxzzzzzzzzzZZZ........',
  '........ZzxxzzzzzzzzzZZZ........',
  '........ZzxxzzzzzzzzzZZZ........',
  '........ZZZZZZZZZZZZZZZZ........',
  '........ZzxxzzzzzzzzzZZZ........',
  '........ZzxxzzzzzzzzzZZZ........',
  '........ZzxxzzzzzzzzzZZZ........',
  '........ZzxxzzzzzzzzzZZZ........',
  '........ZffffffffffffffZ........',
  '........ZFFFFFFFFFFFFFFZ........',
  '........ZZZZZZZZZZZZZZZZ........',
  '........ZzxxzzzzzzzzzZZZ........',
  '........ZzxxzzzzzzzzzZZZ........',
  '........ZzxxzzzzzzzzzZZZ........',
  '........ZzxxzzzzzzzzzZZZ........',
  '........ZZZZZZZZZZZZZZZZ........',
  '........ZzzzzzzzzzzzzzzZ........',
  '........ZZZZZZZZZZZZZZZZ........',
  '........nnnnnnnnnnnnnnnn........',
  '................................',
  '................................',
  '................................',
];

/**
 * Bed. Two pillows shaded on a diagonal so they read as soft rather than as
 * white cards, and a duvet with a turned-down top edge and two fold creases
 * running down the length.
 */
const BED: PixelGrid = [
  '................................',
  '................................',
  '................................',
  '................................',
  '....WWWWWWWWWWWWWWWWWWWWWWWW....',
  '....WyyyyyyyyyyyyyyyyyyyyyyW....',
  '....WwwwwwwwwwwwwwwwwwwwwwwW....',
  '....WWWWWWWWWWWWWWWWWWWWWWWW....',
  '....WjjjjjjjjjjjjjjjjjjjjjjW....',
  '....WjEEEEEEEEEjjEEEEEEEEEjW....',
  '....WjEEEEEEEiijEEEEEEEiiijW....',
  '....WjEEEEEiiiIjEEEEEiiiIIjW....',
  '....WjEEEiiiIIIjEEEiiiIIIIjW....',
  '....WjEiiiIIIIIjEiiiIIIIIIjW....',
  '....WjjjjjjjjjjjjjjjjjjjjjjW....',
  '....WWWWWWWWWWWWWWWWWWWWWWWW....',
  '....WllllllllllllllllllllllW....',
  '....WllllllllllllllllllllllW....',
  '....WCCCCCCCCCCCCCCCCCCCCCCW....',
  '....WccccccClcccccccClcccccW....',
  '....WccccccClcccccccClcccccW....',
  '....WccccccClcccccccClcccccW....',
  '....WccccccClcccccccClcccccW....',
  '....WccccccClcccccccClcccccW....',
  '....WccccccClcccccccClcccccW....',
  '....WCCCCCCCCCCCCCCCCCCCCCCW....',
  '....WWWWWWWWWWWWWWWWWWWWWWWW....',
  '....WyyyyyyyyyyyyyyyyyyyyyyW....',
  '....WWWWWWWWWWWWWWWWWWWWWWWW....',
  '....nnnnnnnnnnnnnnnnnnnnnnnn....',
  '................................',
  '................................',
];

/**
 * Toilet. The tank is the wide part at the back with a lid seam and a chrome
 * flush handle; the bowl is the narrower oval in front with an actual opening
 * in it. Porcelain runs four steps so it does not read as stacked white cards.
 */
const TOILET: PixelGrid = [
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '.........jjjjjjjjjjjjjj.........',
  '.........jEEEEEEEEEEEEj.........',
  '.........jEiiiiiiiiiiEj.........',
  '.........jEiiiiiiiiiiEj.........',
  '.........jjjjjjjjjjjjjj.........',
  '.........jEiiiiiiiiiiEj.........',
  '.........jExiiiiiiiiiEj.........',
  '.........jIIIIIIIIIIIIj.........',
  '.........jjjjjjjjjjjjjj.........',
  '..........jjjjjjjjjjjj..........',
  '..........jEEEEEEEEEEj..........',
  '.........jEiIIIIIIIIiEj.........',
  '.........jEiIjjjjjjIiEj.........',
  '.........jEiIjjjjjjIiEj.........',
  '.........jEiIjjjjjjIiEj.........',
  '.........jEiIIIIIIIIiEj.........',
  '..........jEiiiiiiiiEj..........',
  '..........jEEEEEEEEEEj..........',
  '...........jjjjjjjjjj...........',
  '..........nnnnnnnnnnnn..........',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

/**
 * Bathroom basin. A gooseneck spout flanked by two taps, and a well sunk four
 * porcelain steps down to a drain — wide enough to read as something you could
 * actually put water in.
 */
const SINK: PixelGrid = [
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '..........ZZZZZZZZZZZZ..........',
  '..........ZxZZxxxxZZxZ..........',
  '..........ZzZZzzzzZZzZ..........',
  '.............ZzzzzZ.............',
  '..............ZzzZ..............',
  '........jjjjjjjjjjjjjjjj........',
  '.......jEEEEEEEEEEEEEEEEj.......',
  '.......jEiIIIIIIIIIIIIiEj.......',
  '.......jEijjjjjjjjjjjjiEj.......',
  '.......jEijjjjjjjjjjjjiEj.......',
  '.......jEijjjjjZZjjjjjiEj.......',
  '.......jEijjjjjjjjjjjjiEj.......',
  '.......jEijjjjjjjjjjjjiEj.......',
  '.......jEiIIIIIIIIIIIIiEj.......',
  '.......jEEEEEEEEEEEEEEEEj.......',
  '........jjjjjjjjjjjjjjjj........',
  '........nnnnnnnnnnnnnnnn........',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

/**
 * Kitchen counter. A steel worktop over two cabinet doors with recessed panels
 * — dark along the top and left of each recess, light along the bottom and
 * right, which is what makes an inset read as inset — and a toe-kick shadow so
 * the whole run does not look glued to the floor.
 */
const COUNTER: PixelGrid = [
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '..ZZZZZZZZZZZZZZZZZZZZZZZZZZZZ..',
  '..ZxxxxxxxxxxxxxxxxxxxxxxxxxxZ..',
  '..ZzzzzzzzzzzzzzzzzzzzzzzzzzzZ..',
  '..ZZZZZZZZZZZZZZZZZZZZZZZZZZZZ..',
  '..WWWWWWWWWWWWWWWWWWWWWWWWWWWW..',
  '..WyyyyyyyyyyyyyyyyyyyyyyyyyyW..',
  '..WwwwwwwwwwwwwWWwwwwwwwwwwwwW..',
  '..WwwWWWWWWWWwwWWwwWWWWWWWWwwW..',
  '..WwwWwwwwwwywxWWxwWwwwwwwywwW..',
  '..WwwWwwwwwwywxWWxwWwwwwwwywwW..',
  '..WwwWwwwwwwywxWWxwWwwwwwwywwW..',
  '..WwwWwwwwwwywwWWwwWwwwwwwywwW..',
  '..WwwyyyyyyyywwWWwwyyyyyyyywwW..',
  '..WwwwwwwwwwwwwWWwwwwwwwwwwwwW..',
  '...dddddddddddddddddddddddddd...',
  '..nnnnnnnnnnnnnnnnnnnnnnnnnnnn..',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

/**
 * Bookshelf. Books get varied widths, varied heights, a darker spine edge on
 * each, gilt title bands on some, plus a flat stack and a bottle in the gaps.
 * A shelf of identical evenly-spaced bars reads as a barcode, not a library.
 */
const BOOKSHELF: PixelGrid = [
  '................................',
  '................................',
  '................................',
  '.....WWWWWWWWWWWWWWWWWWWWWW.....',
  '.....WyyyyyyyyyyyyyyyyyyyyW.....',
  '.....WrRdddfFidddcCpRddhvVW.....',
  '.....WrRhvVfFimmMcCpRddhvVW.....',
  '.....WrRggVfFiggMcCpRddggVW.....',
  '.....WrRhvVfFimmMcCpRddhvVW.....',
  '.....WrRhvVfFimmMcCpRddhvVW.....',
  '.....WyyyyyyyyyyyyyyyyyyyyW.....',
  '.....WdmmMddrRhvVfFddpRdddW.....',
  '.....WdmmMiIrRhvVfFcCpRdddW.....',
  '.....WdggMiIrRggVfFcCpRdddW.....',
  '.....WdmmMiIrRhvVfFcCpRdddW.....',
  '.....WdmmMiIrRhvVfFcCpRdddW.....',
  '.....WyyyyyyyyyyyyyyyyyyyyW.....',
  '.....WfFddhvVrRiImmMddddddW.....',
  '.....WfFcChvVrRiImmMddddddW.....',
  '.....WfFcCggVrRiIggMddffffW.....',
  '.....WfFcChvVrRiImmMddppppW.....',
  '.....WfFcChvVrRiImmMddhhhhW.....',
  '.....WyyyyyyyyyyyyyyyyyyyyW.....',
  '.....WhvVpRddmmMiIcCdddvVdW.....',
  '.....WhvVpRfFmmMiIcCdddvVdW.....',
  '.....WggVpRfFggMiIcCrRhvVdW.....',
  '.....WhvVpRfFmmMiIcCrRhvVdW.....',
  '.....WhvVpRfFmmMiIcCrRhvVdW.....',
  '.....WWWWWWWWWWWWWWWWWWWWWW.....',
  '.....nnnnnnnnnnnnnnnnnnnnnn.....',
  '................................',
  '................................',
];

/**
 * A floor lamp with a lit shade. The shade is drawn as a real light source —
 * near-white at the centre, gold through the middle, amber at the rim — rather
 * than a flat yellow trapezoid, because the lighting layer darkens the whole
 * board and a flat fill just goes grey under it.
 */
const LAMP: PixelGrid = [
  '................................',
  '................................',
  '............FFFFFF..............',
  '...........FggggggF.............',
  '..........FgGGGGGGgF............',
  '.........FgGGGGGGGGgF...........',
  '.........FfGGGGGGGGfF...........',
  '........FffGGGGGGGGffF..........',
  '........FFffffffffffFF..........',
  '........FFFFFFFFFFFFFF..........',
  '..............FfF...............',
  '..............FfF...............',
  '..............FfF...............',
  '..............FfF...............',
  '..............FfF...............',
  '..............FfF...............',
  '..............FfF...............',
  '..............FfF...............',
  '..............FfF...............',
  '..............FfF...............',
  '..............FfF...............',
  '..............FfF...............',
  '..............FfF...............',
  '..............FfF...............',
  '..............FfF...............',
  '..........FFFFFFFFFFFF..........',
  '..........FffffffffffF..........',
  '..........FFFFFFFFFFFF..........',
  '..........nnnnnnnnnnnn..........',
  '................................',
  '................................',
  '................................',
];

const PLANT: PixelGrid = [
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '...............VV...............',
  '.............VvhhvV.............',
  '............VvhhhhvV............',
  '..........VvhhhhhhhhvV..........',
  '.........VvhhhvvhhvvhhV.........',
  '........VvhhhhhhhhhhhhvV........',
  '........VvhhvvhhhhvvhhvV........',
  '........VvhhhhhhhhhhhhvV........',
  '.........VvhhhhhhhhhhvV.........',
  '..........VvhhhhhhhhvV..........',
  '............VvhhhhvV............',
  '..............VvvV..............',
  '..............VvvV..............',
  '..........BBBBBBBBBBBB..........',
  '..........BqqqqqqqqqqB..........',
  '..........BbbbbbbbbbbB..........',
  '...........BbbbbbbbbB...........',
  '...........BbbbbbbbbB...........',
  '............BbbbbbbB............',
  '............BBBBBBBB............',
  '...........nnnnnnnnnn...........',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

/**
 * The surveillance PC — a desk, a monitor, four camera feeds.
 *
 * The screen is the whole point of the object, so it is drawn as a working
 * split feed rather than a lit rectangle: two rooms with people in them, one
 * empty corridor, one channel that has gone to static, and a record light in
 * the corner. That reads as CCTV at sixteen pixels, which "glowing blue pane"
 * does not.
 */
const PC: PixelGrid = [
  '................................',
  '................................',
  '.......oooooooooooooooooo.......',
  '.......ozzzzzzzzzzzzzzzzo.......',
  '.......oZVVVVVVkkVVVVVVZo.......',
  '.......oZVVhhVVkkVVVVVVZo.......',
  '.......oZVhhhhVkkVVVVhVZo.......',
  '.......oZVVhhVVkkVVVVhVZo.......',
  '.......oZvvvvvvkkvvvvvvZo.......',
  '.......oZkkkkkkkkkkkkkkZo.......',
  '.......oZVVVVVVkkVhVVvVZo.......',
  '.......oZVhVVhVkkVVhVVvZo.......',
  '.......oZVhhVhhkkvVVhVVZo.......',
  '.......oZVhVVhVkkVVvVVhZo.......',
  '.......oZvvvvvvkkvvvvvvZo.......',
  '.......oZZpZZZZZZZZZZZZZo.......',
  '.......oooooooooooooooooo.......',
  '..............oZZo..............',
  '..............oZZo..............',
  '...........oZZZZZZZZo...........',
  '...........oooooooooo...........',
  '...yyyyyyyyyyyyyyyyyyyyyyyyyy...',
  '...wwwwwwwwwddddddddwwwwwwwww...',
  '...wwwwwwwwwdzzzzzzdwwwwwwwww...',
  '...WWWWWWWWWWWWWWWWWWWWWWWWWW...',
  '...oooooooooooooooooooooooooo...',
  '.....wWo................wWo.....',
  '.....wWo................wWo.....',
  '.....wWo................wWo.....',
  '...nnnnnnnnnnnnnnnnnnnnnnnnnn...',
  '................................',
  '................................',
];

export const FURNITURE = {
  couch: COUCH,
  television: TELEVISION,
  speaker: SPEAKER,
  fridge: FRIDGE,
  table: TABLE,
  lamp: LAMP,
  keg: KEG,
  bed: BED,
  toilet: TOILET,
  sink: SINK,
  counter: COUNTER,
  bookshelf: BOOKSHELF,
  plant: PLANT,
  pc: PC,
} as const;

export type FurnitureId = keyof typeof FURNITURE;
