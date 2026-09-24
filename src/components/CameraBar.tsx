import { breadcrumbs, WHOLE_LOT, type Camera } from '../game/camera';

interface CameraBarProps {
  camera: Camera;
  floorName: string;
  onMove: (camera: Camera) => void;
}

/**
 * Where you are looking, and the way back out.
 *
 * A trail rather than a single "back" button, because with three depths the
 * useful move is often two steps out rather than one — from a room straight to
 * the whole house — and a trail makes that one click instead of two.
 *
 * Hidden entirely at the top level: when there is nowhere to go back to, a
 * breadcrumb saying "The House" is just a label taking up room.
 */
export default function CameraBar({ camera, floorName, onMove }: CameraBarProps) {
  if (camera.level === 'lot') return null;

  const trail = breadcrumbs(camera).map((crumb, index) => index === 0 ? { ...crumb, label: floorName } : crumb);

  return (
    <div className="plate flex items-center gap-1 px-2.5 py-1.5">
      {trail.map((crumb, index) => (
        <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
          {index > 0 && <span className="text-[0.8rem] text-brass-dim">›</span>}
          {crumb.current ? (
            <span className="legend px-1 text-[0.8rem] font-bold text-bone">{crumb.label}</span>
          ) : (
            <button
              type="button"
              onClick={() => onMove(crumb.camera)}
              className="legend px-1 text-[0.8rem] text-brass hover:text-white"
            >
              {crumb.label}
            </button>
          )}
        </span>
      ))}

      <button
        type="button"
        onClick={() => onMove(WHOLE_LOT)}
        title="View the whole floor (Esc)"
        className="ghostbtn ml-2 px-2 py-0.5 text-[0.72rem]"
      >
        Pull back
      </button>
    </div>
  );
}
