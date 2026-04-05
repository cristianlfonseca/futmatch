import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Loader from '../components/Loader';
import { useAuth } from '../context/AuthContext';

export default function Groups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadGroups(); }, []);

  async function loadGroups() {
    try {
      const { data } = await api.get('/api/groups');
      setGroups(data.groups);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/api/groups', form);
      setForm({ name: '', description: '' });
      setShowCreate(false);
      loadGroups();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao criar grupo.');
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <Loader text="Carregando grupos..." />;

  return (
    <div className="pt-20 pb-24 px-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Meus Grupos</h1>
        <button
          id="btn-new-group"
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] text-white hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
        >
          {showCreate ? '✕ Cancelar' : '+ Novo Grupo'}
        </button>
      </div>

      {/* Pending Votes Alert */}
      {user?.pending_votes && user.pending_votes.length > 0 && (
        <div className="bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/40 rounded-2xl p-4 mb-6 shadow-[0_4px_20px_var(--color-warning)]/10 animate-pulse-slow flex items-center justify-between">
          <div>
            <h3 className="text-[var(--color-warning)] font-bold text-sm mb-1 flex items-center gap-2">
              ⭐ Avaliações Pendentes
            </h3>
            <p className="text-[10px] text-[var(--color-warning)]/80 pr-2">Tem {user.pending_votes.length} pelada(s) recente aguardando o seu voto nas últimas 24 hrs!</p>
          </div>
          <Link to={`/matches/${user.pending_votes[0].id}`} className="px-3 py-2 bg-[var(--color-warning)] rounded-lg flex-shrink-0 text-[var(--color-bg-body)] font-bold text-[10px] hover:bg-[var(--color-warning)]/80 no-underline shadow-sm uppercase tracking-wide">
            Votar Agora
          </Link>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4 mb-6 space-y-3 animate-in"
        >
          <input
            id="input-group-name"
            type="text"
            placeholder="Nome do grupo"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-border-focus)] outline-none text-sm"
            required
          />
          <textarea
            id="input-group-desc"
            placeholder="Descrição (opcional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-border-focus)] outline-none text-sm resize-none"
          />
          <button
            type="submit"
            disabled={creating}
            className="w-full py-3 rounded-xl font-semibold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {creating ? 'Criando...' : 'Criar Grupo'}
          </button>
        </form>
      )}

      {/* Groups list */}
      {groups.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">👥</p>
          <p className="text-[var(--color-text-secondary)] text-sm">Nenhum grupo ainda.</p>
          <p className="text-[var(--color-text-muted)] text-xs mt-1">Crie um grupo para começar sua pelada!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <Link
              key={group.id}
              to={`/groups/${group.id}`}
              className="block bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4 hover:border-[var(--color-accent)]/40 hover:shadow-[var(--shadow-glow)] transition-all no-underline"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-[var(--color-text-primary)]">{group.name}</h3>
                  {group.description && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-1">{group.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                  <span>👥</span>
                  <span>{group.member_count}</span>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    group.role === 'owner'
                      ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                      : 'bg-[var(--color-info)]/10 text-[var(--color-info)]'
                  }`}
                >
                  {group.role === 'owner' ? 'Dono' : group.role === 'admin' ? 'Admin' : 'Membro'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
