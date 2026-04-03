export default function Loader({ text = 'Carregando...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-[var(--color-border)]" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--color-accent)] animate-spin" />
      </div>
      <p className="text-[var(--color-text-secondary)] text-sm animate-pulse">{text}</p>
    </div>
  );
}
