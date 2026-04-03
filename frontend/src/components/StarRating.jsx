export default function StarRating({ value = 0, onChange, readonly = false, size = 'md' }) {
  const sizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-3xl' };
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="flex items-center gap-1">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`${sizes[size]} transition-all ${
            readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
          } ${
            star <= value
              ? 'text-[var(--color-star-filled)] drop-shadow-[0_0_4px_rgba(245,158,11,0.4)]'
              : 'text-[var(--color-star-empty)]'
          }`}
          style={{ background: 'none', border: 'none', padding: 0 }}
        >
          ★
        </button>
      ))}
      {!readonly && (
        <span className="ml-2 text-sm text-[var(--color-text-muted)]">
          {value > 0 ? `${value}/5` : 'Selecione'}
        </span>
      )}
    </div>
  );
}
