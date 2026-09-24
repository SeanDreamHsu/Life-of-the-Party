import Legend from './Legend';
import CharacterBody from './CharacterBody';
import PixelSprite from './PixelSprite';
import { FOOD, PROPS, foodArt, furnitureArt, poseArt, type Art } from '../art';
import { GUEST_SKINS } from '../art/palette';
import { createInitialGuests } from '../data/initialState';
import { MUTATION_META, type MutationStage } from '../types/game';

const STAGES: readonly MutationStage[] = [0, 1, 2, 3];

interface TileProps {
  art: Art;
  caption: string;
  sub?: string;
}

function GalleryTile({ art, caption, sub }: TileProps) {
  return (
    <figure className="flex flex-col items-center gap-1">
      <PixelSprite
        art={art}
        className="well h-16 w-16"
        label={caption}
      />
      <figcaption className="text-center text-[0.72rem] leading-tight text-bone-dim">
        {caption}
        {sub && <span className="block text-bone-dim/60 italic">{sub}</span>}
      </figcaption>
    </figure>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="legend mb-2 border-b border-brass-dim pb-1 text-[0.95rem] font-bold">
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * Every sprite in the game on one screen. This is a working tool, not a game
 * screen — it is how you spot that a pose reads wrong or a palette is muddy
 * without hunting for the guest on the board.
 */
export default function SpriteGallery() {
  const guests = createInitialGuests();
  const guestIds = Object.keys(GUEST_SKINS);

  return (
    <div className="plate p-4">
      <Section title="The host & the last twelve standing">
        <p className="mb-4 text-sm text-bone-dim">A tired host. Twelve distinct personalities. One very long night.</p>
        <div className="grid grid-cols-4 gap-4 sm:grid-cols-7">
          {[{ id: 'host', name: 'You', mutationStage: 0 as const }, ...guests].map((guest, index) => (
            <figure key={guest.id} className="text-center">
              <div className="relative mx-auto h-24 w-24 rounded bg-[#283039]">
                <CharacterBody id={guest.id} stage={guest.mutationStage} phase={index * .31} label={guest.name} />
              </div>
              <figcaption className="mt-1 text-sm text-bone">{guest.name}</figcaption>
            </figure>
          ))}
        </div>
      </Section>
      <Section title="Motion study — idle / walk / walk north / dance">
        <div className="flex gap-6">
          {(['idle', 'walk', 'north', 'dance'] as const).map(mode => (
            <figure key={mode}>
              <div className="relative h-24 w-24 bg-[#283039]">
                <CharacterBody id="host" stage={0} moving={mode === 'walk' || mode === 'north'} direction={mode === 'north' ? 'back' : 'front'} dancing={mode === 'dance'} label={mode} />
              </div>
              <figcaption className="mt-1 text-center text-sm text-bone-dim">{mode}</figcaption>
            </figure>
          ))}
        </div>
      </Section>
      <Section title="Guests — four mutation stages each">
        <div className="space-y-3">
          {guestIds.map((id) => {
            const name = guests.find((guest) => guest.id === id)?.name ?? id;
            return (
              <div key={id} className="flex flex-wrap items-start gap-3">
                <div className="w-16 pt-5 text-[0.85rem] font-bold text-bone">{name}</div>
                {STAGES.map((stage) => (
                  <GalleryTile
                    key={stage}
                    art={poseArt(id, stage)}
                    caption={`Stage ${stage}`}
                    sub={MUTATION_META[stage].label}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Floor materials">
        <div className="max-w-xs"><Legend /></div>
      </Section>

      <Section title="Props and decorations">
        <div className="flex flex-wrap gap-3">
          {(Object.keys(PROPS) as (keyof typeof PROPS)[]).map((id) => (
            <GalleryTile key={id} art={furnitureArt(id)} caption={id} />
          ))}
        </div>
      </Section>

      <Section title="Food loot">
        <div className="flex flex-wrap gap-3">
          {(Object.keys(FOOD) as (keyof typeof FOOD)[]).map((id) => (
            <GalleryTile key={id} art={foodArt(id)} caption={id} />
          ))}
        </div>
      </Section>

      <p className="text-[0.75rem] text-bone-dim italic">
        All sprites are 32x32, authored as text grids in{' '}
        <code className="text-white/50">src/art/sprites/</code>. Edit a character in the grid and
        the pixel changes on screen.
      </p>
    </div>
  );
}
