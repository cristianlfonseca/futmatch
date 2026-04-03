import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import Loader from '../components/Loader';
import PlayerCard from '../components/PlayerCard';
import { MATCH_STATUS } from '../utils/constants';

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [myRole, setMyRole] = useState('member');
  const [loading, setLoading] = useState(true);

  // Invite state
  const [showInvite, setShowInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Match create state
  const [showCreateMatch, setShowCreateMatch] = useState(false);
  const [matchForm, setMatchForm] = useState({ title: 'Dia do Fut', match_date: '' });

  // Ranking state
  const [showRanking, setShowRanking] = useState(false);
  const [ranking, setRanking] = useState(null);

  const isAdmin = myRole === 'owner' || myRole === 'admin';

  const loadGroup = useCallback(async () => {
    try {
      const [groupRes, matchesRes] = await Promise.all([
        api.get(`/api/groups/${id}`),
        api.get(`/api/groups/${id}/matches`),
      ]);
      setGroup(groupRes.data.group);
      setMembers(groupRes.data.members);
      setMyRole(groupRes.data.my_role);
      setMatches(matchesRes.data.matches);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadGroup(); }, [loadGroup]);

  // Search users
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get(`/api/users/search?q=${searchQuery}`);
        // Exclude existing members
        const memberIds = new Set(members.map((m) => m.user_id));
        setSearchResults(data.users.filter((u) => !memberIds.has(u.id)));
      } catch (err) { console.error(err); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, members]);

  async function sendInvite(userId) {
    try {
      await api.post(`/api/groups/${id}/invite`, { user_id: userId });
      setSearchResults((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao convidar.');
    }
  }

  async function createMatch(e) {
    e.preventDefault();
    try {
      await api.post(`/api/groups/${id}/matches`, matchForm);
      setShowCreateMatch(false);
      setMatchForm({ title: 'Dia do Fut', match_date: '' });
      loadGroup();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao criar partida.');
    }
  }

  async function loadRanking() {
    try {
      const { data } = await api.get(`/api/groups/${id}/ranking`);
      setRanking(data.ranking);
      setShowRanking(true);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja excluir este grupo? Esta ação não pode ser desfeita.')) return;
    try {
      await api.delete(`/api/groups/${id}`);
      navigate('/groups', { replace: true });
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao deletar grupo.');
    }
  }

  async function updateRole(userId, newRole) {
    try {
      await api.patch(`/api/groups/${id}/members/${userId}/role`, { role: newRole });
      loadGroup();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao atualizar cargo.');
    }
  }

  if (loading) return <Loader />;
  if (!group) return <div className="pt-20 px-4 text-center text-[var(--color-text-muted)]">Grupo não encontrado.</div>;

  return (
    <div className="pt-20 pb-24 px-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link to="/groups" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] no-underline">
          ← Voltar
        </Link>
        <h1 className="text-xl font-bold mt-2">{group.name}</h1>
        {group.description && <p className="text-sm text-[var(--color-text-secondary)] mt-1">{group.description}</p>}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {isAdmin && (
          <>
            <button onClick={() => setShowInvite(!showInvite)} className="px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 transition-all cursor-pointer">
              ✉️ Convidar
            </button>
            <button onClick={() => setShowCreateMatch(!showCreateMatch)} className="px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--color-info)]/10 text-[var(--color-info)] hover:bg-[var(--color-info)]/20 transition-all cursor-pointer">
              ⚽ Nova Partida
            </button>
          </>
        )}
        <button onClick={loadRanking} className="px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--color-warning)]/10 text-[var(--color-warning)] hover:bg-[var(--color-warning)]/20 transition-all cursor-pointer">
          🏆 Ranking
        </button>
        {myRole === 'owner' && (
          <button onClick={handleDelete} className="px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20 transition-all cursor-pointer ml-auto">
            🗑 Excluir
          </button>
        )}
      </div>

      {/* Invite panel */}
      {showInvite && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm">Link Mágico</h3>
            <button 
              onClick={() => {
                const link = `${window.location.origin}/groups/${id}/join`;
                navigator.clipboard.writeText(link);
                alert('Link de convite copiado!');
              }}
              className="text-[10px] px-3 py-1.5 rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-semibold cursor-pointer"
            >
              📋 Copiar Link
            </button>
          </div>
          <hr className="border-[var(--color-border)] my-4" />
          <h3 className="font-bold text-sm mb-3">Convidar via Busca</h3>
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-border-focus)] outline-none mb-3"
          />
          {searching && <p className="text-xs text-[var(--color-text-muted)] animate-pulse">Buscando...</p>}
          <div className="space-y-2">
            {searchResults.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-[var(--color-bg-hover)]">
                <div className="flex items-center gap-2">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[var(--color-border)] flex items-center justify-center text-xs font-bold">{user.name[0]}</div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{user.display_name || user.name}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">{user.email}</p>
                  </div>
                </div>
                <button onClick={() => sendInvite(user.id)} className="text-xs px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] cursor-pointer">
                  Convidar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create match form */}
      {showCreateMatch && (
        <form onSubmit={createMatch} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4 mb-6 space-y-3">
          <input
            type="text"
            placeholder="Título"
            value={matchForm.title}
            onChange={(e) => setMatchForm({ ...matchForm, title: e.target.value })}
            className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-border-focus)] outline-none"
          />
          <input
            type="datetime-local"
            value={matchForm.match_date}
            onChange={(e) => setMatchForm({ ...matchForm, match_date: e.target.value })}
            required
            className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-border-focus)] outline-none [color-scheme:dark]"
          />
          <button type="submit" className="w-full py-3 rounded-xl font-semibold text-white bg-[var(--color-info)] hover:opacity-90 cursor-pointer">
            Criar Partida
          </button>
        </form>
      )}

      {/* Ranking modal */}
      {showRanking && ranking && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm">🏆 Ranking do Grupo</h3>
            <button onClick={() => setShowRanking(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer text-sm">✕</button>
          </div>

          {/* Scorers */}
          {ranking.scorers.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-[var(--color-accent)] mb-2">⚽ Artilharia</h4>
              {ranking.scorers.slice(0, 5).map((p, i) => (
                <div key={p.id} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-[var(--color-text-secondary)]">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {p.display_name || p.name}
                  </span>
                  <span className="font-bold text-[var(--color-accent)]">{p.total_goals}</span>
                </div>
              ))}
            </div>
          )}

          {/* Assists */}
          {ranking.assisters.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-[var(--color-info)] mb-2">👟 Garçom</h4>
              {ranking.assisters.slice(0, 5).map((p, i) => (
                <div key={p.id} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-[var(--color-text-secondary)]">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {p.display_name || p.name}
                  </span>
                  <span className="font-bold text-[var(--color-info)]">{p.total_assists}</span>
                </div>
              ))}
            </div>
          )}

          {/* MVPs */}
          {ranking.mvps.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--color-warning)] mb-2">⭐ Destaque</h4>
              {ranking.mvps.slice(0, 5).map((p, i) => (
                <div key={p.id} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-[var(--color-text-secondary)]">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {p.display_name || p.name}
                  </span>
                  <span className="font-bold text-[var(--color-warning)]">{p.mvp_count}×</span>
                </div>
              ))}
            </div>
          )}

          {ranking.scorers.length === 0 && ranking.assisters.length === 0 && (
            <p className="text-xs text-[var(--color-text-muted)] text-center py-4">Nenhuma estatística registrada ainda.</p>
          )}
        </div>
      )}

      {/* Members */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">
          Membros ({members.length})
        </h2>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.user_id} className="relative">
              <PlayerCard player={m} compact />
              
              {/* RBAC Controls */}
              {myRole === 'owner' && m.role !== 'owner' && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                  {m.role === 'admin' ? (
                    <button
                      onClick={() => updateRole(m.user_id, 'member')}
                      className="text-[10px] px-3 py-1.5 rounded-lg border border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-all font-semibold cursor-pointer shadow-sm"
                    >
                      Remover Admin
                    </button>
                  ) : (
                    <button
                      onClick={() => updateRole(m.user_id, 'admin')}
                      className="text-[10px] px-3 py-1.5 rounded-lg border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-all font-semibold cursor-pointer shadow-sm bg-[var(--color-bg-card)]"
                    >
                      ⭐️ Dar Admin
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Matches */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">
          Partidas ({matches.length})
        </h2>
        {matches.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)] text-center py-8">Nenhuma partida criada.</p>
        ) : (
          <div className="space-y-2">
            {matches.map((match) => {
              const statusInfo = MATCH_STATUS[match.status] || MATCH_STATUS.scheduled;
              return (
                <Link
                  key={match.id}
                  to={`/matches/${match.id}`}
                  className="block bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3 hover:border-[var(--color-accent)]/40 transition-all no-underline"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-[var(--color-text-primary)]">{match.title}</h3>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: statusInfo.color + '20', color: statusInfo.color }}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--color-text-muted)]">
                    <span>📅 {new Date(match.match_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    <span>👥 {match.confirmed_count} confirmados</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
