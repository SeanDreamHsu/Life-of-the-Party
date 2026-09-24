import { FLOORS, type FloorId } from '../data/floors';
import type { Guest } from '../types/game';
import { floorAt } from '../data/floors';

interface Props {
  active: FloorId;
  hostFloor: FloorId;
  guests: readonly Guest[];
  onSelect: (floor: FloorId) => void;
}

export default function FloorSelector({ active, hostFloor, guests, onSelect }: Props) {
  return <nav className="floor-selector plate pointer-events-auto" aria-label="Choose a floor">
    <h2 className="legend floor-selector-title">Floors</h2>
    {FLOORS.map(floor => <button type="button" key={floor.id}
      className="floor-button" aria-pressed={active === floor.id}
      onClick={() => onSelect(floor.id)} aria-label={`View ${floor.name}`}>
      <span className="floor-number">{floor.number}</span>
      <span className="floor-copy"><strong>{floor.name}</strong><small>{floor.description}</small>
        <small>{guests.filter(guest => floorAt(guest.x, guest.y) === floor.id).length} guests{hostFloor === floor.id ? ' · You are here' : ''}</small>
      </span>
      {hostFloor === floor.id && <span className="floor-host-dot" aria-hidden="true" />}
    </button>)}
    <p className="floor-selector-hint">Floors share the same footprint.<br />Walk onto a staircase, then click it to change floors.</p>
  </nav>;
}
