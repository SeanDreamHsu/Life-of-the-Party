import type { MutationStage } from '../../types/game';
import type { PixelGrid } from '../pixel';

/**
 * GUEST POSES — 32x32, front-facing, one per mutation stage.
 *
 * Colour lives in the palette, not here (see art/palette.ts), so these four
 * grids describe posture and expression only. Read them as pictures: the shape
 * you see in the source is the shape that lands on screen.
 *
 *   o outline  s skin  d skin shade  h hair  g hair shade
 *   e eye      w eye white  m mouth   t shirt  u shirt shade
 *   p pants    q pants shade  b shoe   n ground shadow
 */

/** Stage 0 — upright, holding it together, faint smile. */
const TIPSY: PixelGrid = [
  '................................',
  '................................',
  '................................',
  '............oooooooo............',
  '...........ohhhhhhhho...........',
  '..........ohhgghhhhhho..........',
  '..........ohhhhhhhhhho..........',
  '..........ohhsssssshho..........',
  '..........ohseesseesho..........',
  '..........ohssssssssho..........',
  '..........ohsdssssdsho..........',
  '..........ohsssmmsssho..........',
  '..........ohssssssssho..........',
  '...........osssssssso...........',
  '.............odssdo.............',
  '..........otttttttttto..........',
  '.........otttttttttttto.........',
  '.........otttttttttttto.........',
  '.........otttttttttuuuo.........',
  '.........otttttttttuuuo.........',
  '.........osttttttttttso.........',
  '.........osttttttttttso.........',
  '..........otttttttttto..........',
  '..........oppppppppppo..........',
  '..........oppppooppppo..........',
  '..........oppppooppppo..........',
  '..........oppqqooppqqo..........',
  '..........oppppooppppo..........',
  '..........obbbboobbbbo..........',
  '..........obbbboobbbbo..........',
  '..........oooooooooooo..........',
  '........nnnnnnnnnnnnnnnn........',
];

/** Stage 1 — slumped and leaning, eyes shut, mouth a flat grimace. */
const ROUGH: PixelGrid = [
  '................................',
  '................................',
  '................................',
  '................................',
  '.............oooooooo...........',
  '............ohhhhhhhho..........',
  '...........ohhgghhhhhho.........',
  '...........ohhsssssshho.........',
  '...........ohsoossoosho.........',
  '...........ohssssssssho.........',
  '...........ohsdssssdsho.........',
  '...........ohssmmmmssho.........',
  '...........ohssssssssho.........',
  '............osssssssso..........',
  '..............odssdo............',
  '..........otttttttttto..........',
  '.........otttttttttttto.........',
  '.........otttttttttttto.........',
  '.........otttttttttuuuo.........',
  '.........otttttttttuuuo.........',
  '.........osttttttttttso.........',
  '.........osttttttttttso.........',
  '..........otttttttttto..........',
  '..........oppppppppppo..........',
  '..........oppppooppppo..........',
  '..........oppppooppppo..........',
  '..........oppqqooppqqo..........',
  '..........oppppooppppo..........',
  '..........obbbboobbbbo..........',
  '..........obbbboobbbbo..........',
  '..........oooooooooooo..........',
  '........nnnnnnnnnnnnnnnn........',
];

/** Stage 2 — hunched, arms out to the sides, jaw hanging open. */
const MUTATING: PixelGrid = [
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '............oooooooo............',
  '...........ohhhhhhhho...........',
  '..........ohhgghhhhhho..........',
  '..........ohhsssssshho..........',
  '..........ohseesseesho..........',
  '..........ohssssssssho..........',
  '..........ohsdssssdsho..........',
  '..........ohsommmmosho..........',
  '..........ohssmmmmssho..........',
  '...........osssssssso...........',
  '.............odssdo.............',
  '....ooooooottttttttttooooooo....',
  '....osssttttttttttttttttssso....',
  '....osssttttttttttttttttssso....',
  '....ooooooottttttttttooooooo....',
  '..........ottttttttuuo..........',
  '..........ottttttttuuo..........',
  '..........otttttttttto..........',
  '..........oppppppppppo..........',
  '..........oppppooppppo..........',
  '..........oppppooppppo..........',
  '..........oppqqooppqqo..........',
  '..........oppppooppppo..........',
  '..........obbbboobbbbo..........',
  '..........obbbboobbbbo..........',
  '..........oooooooooooo..........',
  '........nnnnnnnnnnnnnnnn........',
];

/** Stage 3 — arms up, hair blown out, mouth wide. Past negotiating with. */
const FERAL: PixelGrid = [
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '......oooo............oooo......',
  '......osso..h.h.h.h...osso......',
  '......osso.ohhhhhhhho.osso......',
  '......ossoohhgghhhhhhoosso......',
  '......ottoohhsssssshhootto......',
  '......ottoohseesseeshootto......',
  '......ottoohsssssssshootto......',
  '......ottoohsommmmoshootto......',
  '......ottoohssmmmmsshootto......',
  '......ottoohsssssssshootto......',
  '......otto.osssssssso.otto......',
  '......otto...odssdo...otto......',
  '......ottoottttttttttootto......',
  '......ooooottttttttttooooo......',
  '..........ottttttttuuo..........',
  '..........ottttttttuuo..........',
  '..........otttttttttto..........',
  '..........oppppppppppo..........',
  '..........oppppooppppo..........',
  '..........oppppooppppo..........',
  '..........oppqqooppqqo..........',
  '..........oppppooppppo..........',
  '..........obbbboobbbbo..........',
  '..........obbbboobbbbo..........',
  '..........oooooooooooo..........',
  '........nnnnnnnnnnnnnnnn........',
];

export const GUEST_POSES: Record<MutationStage, PixelGrid> = {
  0: TIPSY,
  1: ROUGH,
  2: MUTATING,
  3: FERAL,
};
