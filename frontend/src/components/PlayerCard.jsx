import { POSITIONS } from '../utils/constants';

export default function PlayerCard({ player, compact = false, draggable = false, className = '' }) {
  const posInfo = POSITIONS.find((p) => p.value === player.position);

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] transition-all hover:border-[var(--color-accent)]/40 hover:shadow-[var(--shadow-glow)] ${
        compact ? 'px-3 py-2' : 'px-4 py-3'
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${className}`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {player.avatar_url ? (
          <img
            src={player.avatar_url}
            alt=""
            className="w-10 h-10 rounded-full object-cover ring-2 ring-[var(--color-border)]"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] flex items-center justify-center text-white font-bold text-sm">
            {(player.display_name || player.name || '?')[0].toUpperCase()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-[var(--color-text-primary)] truncate">
          {player.display_name || player.name}
        </p>
        {posInfo && (
          <span
            className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-0.5"
            style={{ backgroundColor: posInfo.color + '20', color: posInfo.color }}
          >
            {posInfo.label}
          </span>
        )}
      </div>

      {/* Skill */}
      {player.skill_level && (
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={`text-xs ${
                i < player.skill_level
                  ? 'text-[var(--color-star-filled)]'
                  : 'text-[var(--color-star-empty)]'
              }`}
            >
              ★
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
