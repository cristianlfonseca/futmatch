import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { path: '/groups', label: 'Grupos', icon: '👥' },
  { path: '/invites', label: 'Convites', icon: '✉️' },
  { path: '/profile', label: 'Perfil', icon: '⚽' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <>
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-bg-secondary)]/80 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/groups" className="flex items-center gap-2 group no-underline mt-1">
            <span className="text-2xl drop-shadow-[0_0_8px_var(--color-accent-glow)] group-hover:scale-110 transition-transform">⚽</span>
            <span className="text-lg font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-gradient-end)]">
              Resenha FC
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {user?.avatar_url && (
              <img
                src={user.avatar_url}
                alt=""
                className="w-8 h-8 rounded-full ring-2 ring-[var(--color-accent)]/30"
              />
            )}
            <button
              onClick={logout}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-danger)] cursor-pointer"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Bottom navigation (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-bg-secondary)]/90 backdrop-blur-xl border-t border-[var(--color-border)]">
        <div className="max-w-lg mx-auto flex justify-around py-2">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl no-underline transition-all ${
                  active
                    ? 'text-[var(--color-accent)] bg-[var(--color-accent)]/10'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          {user?.is_superadmin && (
            <Link
              to="/admin"
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl no-underline transition-all ${
                location.pathname.startsWith('/admin')
                  ? 'text-[var(--color-warning)] bg-[var(--color-warning)]/10'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              <span className="text-lg">🛡️</span>
              <span className="text-[10px] font-medium">Admin</span>
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
