import { useState, useEffect } from 'react';
import api from '../api/client';
import Loader from '../components/Loader';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      const { data } = await api.get('/api/admin/users');
      setUsers(data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, newStatus) {
    try {
      await api.patch(`/api/admin/users/${id}/status`, { is_approved: newStatus });
      setUsers(users.map(u => u.id === id ? { ...u, is_approved: newStatus } : u));
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao atualizar status');
    }
  }

  if (loading) return <Loader text="Carregando painel admin..." />;

  const pendingUsers = users.filter(u => !u.is_approved);
  const approvedUsers = users.filter(u => u.is_approved);

  return (
    <div className="pt-20 pb-24 px-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-6 text-[var(--color-warning)]">🛡️ Painel Admin</h1>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">
          Aguardando Aprovação ({pendingUsers.length})
        </h2>
        {pendingUsers.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)] p-4 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] text-center">Nenhum usuário pendente.</p>
        ) : (
          <div className="space-y-3">
            {pendingUsers.map(user => (
              <div key={user.id} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[var(--color-border)] flex items-center justify-center text-sm font-bold">
                      {user.name[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{user.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)] truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => updateStatus(user.id, true)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--color-accent)] hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                >
                  ✓ Aprovar Usuário
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">
          Usuários Aprovados ({approvedUsers.length})
        </h2>
        {approvedUsers.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)] p-4 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] text-center">Nenhum usuário aprovado.</p>
        ) : (
          <div className="space-y-2">
            {approvedUsers.map(user => (
              <div key={user.id} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3 flex items-center justify-between">
                <div className="flex flex-col min-w-0 pr-4">
                  <p className="font-medium text-xs truncate">{user.name}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] truncate">{user.email}</p>
                </div>
                <button
                  onClick={() => updateStatus(user.id, false)}
                  className="text-[10px] px-3 py-1.5 rounded-lg border border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-all whitespace-nowrap cursor-pointer"
                >
                  Bloquear
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
