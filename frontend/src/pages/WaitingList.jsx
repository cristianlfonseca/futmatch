import { useAuth } from '../context/AuthContext';

export default function WaitingList() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-[var(--color-warning)] opacity-5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full text-center">
        <div className="w-20 h-20 rounded-2xl bg-[var(--color-warning)]/10 flex items-center justify-center text-5xl mb-6">
          ⏳
        </div>

        <h1 className="text-2xl font-bold mb-3 text-[var(--color-text-primary)]">
          Aguardando Aprovação
        </h1>
        <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed mb-8">
          Olá, <span className="text-[var(--color-text-primary)] font-medium">{user?.name}</span>!
          Sua conta foi criada com sucesso, mas precisa ser aprovada por um administrador para acessar o sistema.
        </p>

        <div className="w-full bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4 mb-8">
          <div className="flex items-center gap-3 mb-3">
            {user?.avatar_url && (
              <img src={user.avatar_url} alt="" className="w-12 h-12 rounded-full" />
            )}
            <div className="text-left">
              <p className="font-semibold text-sm">{user?.name}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-warning)] animate-pulse" />
            <span className="text-[var(--color-warning)]">Pendente de aprovação</span>
          </div>
        </div>

        <button
          onClick={logout}
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors cursor-pointer"
        >
          Sair e usar outra conta
        </button>
      </div>
    </div>
  );
}
