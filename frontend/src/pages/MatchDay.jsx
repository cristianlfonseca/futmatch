import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../api/client';
import Loader from '../components/Loader';
import { useAuth } from '../context/AuthContext';
import { MATCH_STATUS, EVENT_TYPES } from '../utils/constants';

function SortablePlayer({ player }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: player.checkin_id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const posInfo = { Goleiro: '🧤', Zagueiro: '🛡️', Lateral: '🏃', Meia: '🎯', Atacante: '⚡' };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg px-3 py-2 cursor-grab active:cursor-grabbing hover:border-[var(--color-accent)]/40 transition-all"
    >
      {player.avatar_url ? (
        <img src={player.avatar_url} alt="" className="w-7 h-7 rounded-full" />
      ) : (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] flex items-center justify-center text-white text-[10px] font-bold">
          {(player.display_name || player.name || '?')[0]}
        </div>
      )}
      <span className="text-sm font-medium flex-1 truncate">{player.display_name || player.name}</span>
      <span className="text-xs">{posInfo[player.position] || ''}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className={`text-[8px] ${i < (player.skill_level || 3) ? 'text-[var(--color-star-filled)]' : 'text-[var(--color-star-empty)]'}`}>★</span>
        ))}
      </div>
    </div>
  );
}

export default function MatchDay() {
  const { id } = useParams();
  const { user } = useAuth();
  const [match, setMatch] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [events, setEvents] = useState([]);
  const [myRole, setMyRole] = useState('member');
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState({});

  // Event form
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({ user_id: '', event_type: 'goal', quantity: 1 });

  // Voting form
  const [showVoting, setShowVoting] = useState(false);
  const [ratings, setRatings] = useState({});

  // Live match
  const [liveTime, setLiveTime] = useState(0);
  const [loadingLiveEvent, setLoadingLiveEvent] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const loadMatch = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/matches/${id}`);
      setMatch(data.match);
      setCheckins(data.checkins);
      setEvents(data.events);
      setMyRole(data.my_role);

      // Group by team
      const grouped = {};
      data.checkins.filter(c => c.confirmed).forEach((c) => {
        const t = c.team || 0;
        if (!grouped[t]) grouped[t] = [];
        grouped[t].push(c);
      });
      setTeams(grouped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadMatch(); }, [loadMatch]);

  useEffect(() => {
    let interval;
    if (match?.status === 'in_progress') {
      interval = setInterval(() => setLiveTime(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [match?.status]);

  const formatTime = (secs) => `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;

  const myCheckin = checkins.find((c) => c.user_id === user?.id);
  const isConfirmed = myCheckin?.confirmed;
  const isAdmin = myRole === 'owner' || myRole === 'admin';
  const confirmedCount = checkins.filter((c) => c.confirmed).length;

  async function handleCheckin() {
    try {
      const res = await api.post(`/api/matches/${id}/checkin`);
      alert(res.data.message);
      loadMatch();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro no check-in.');
    }
  }

  async function handleBalance() {
    try {
      await api.post(`/api/matches/${id}/balance-teams`, { num_teams: 2 });
      loadMatch();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao balancear.');
    }
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Find which team the dropped-on player is in
    const overTeamKey = Object.keys(teams).find((t) => teams[t].some((p) => p.checkin_id === over.id));
    if (!overTeamKey) return;

    // Move player
    const activePlayer = checkins.find((c) => c.checkin_id === active.id);
    if (activePlayer) {
      api.patch(`/api/matches/${match.id}/checkins/${active.id}/team`, { team: parseInt(overTeamKey) });
      loadMatch();
    }
  }

  async function recordEvent(e) {
    e.preventDefault();
    try {
      await api.post(`/api/matches/${id}/events`, eventForm);
      setEventForm({ user_id: '', event_type: 'goal', quantity: 1 });
      loadMatch();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao registrar.');
    }
  }

  async function deleteEvent(eventId) {
    try {
      await api.delete(`/api/match-events/${eventId}`);
      loadMatch();
    } catch (err) { console.error(err); }
  }

  async function handleStartMatch() {
    try {
      await api.post(`/api/matches/${id}/start`);
      loadMatch();
    } catch (err) { alert('Erro ao iniciar'); }
  }

  async function handleFinishMatch() {
    if (!confirm('Deseja finalizar a partida e calcular os Destaques?')) return;
    try {
      const res = await api.post(`/api/matches/${id}/finish`);
      alert(res.data.message);
      loadMatch();
    } catch (err) { alert('Erro ao finalizar'); }
  }

  async function recordLiveEvent(userId, type) {
    setLoadingLiveEvent(true);
    try {
      await api.post(`/api/matches/${id}/events`, { user_id: userId, event_type: type, quantity: 1 });
      loadMatch();
    } catch (err) { }
    setLoadingLiveEvent(false);
  }

  async function submitRatings() {
    const toSend = Object.keys(ratings).map(uid => ({ rated_user_id: uid, rating: ratings[uid] }));
    if (toSend.length === 0) {
      alert('Nenhuma avaliação preenchida!');
      return;
    }
    try {
      await api.post(`/api/matches/${id}/rate`, { ratings: toSend });
      setShowVoting(false);
      alert('Avaliações salvas com sucesso!');
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao avaliar.');
    }
  }

  if (loading) return <Loader />;
  if (!match) return <div className="pt-20 px-4 text-center text-[var(--color-text-muted)]">Partida não encontrada.</div>;

  const statusInfo = MATCH_STATUS[match.status] || MATCH_STATUS.scheduled;
  const confirmedPlayers = checkins.filter((c) => c.confirmed && !c.is_waitlist);
  const waitlistPlayers = checkins.filter((c) => c.is_waitlist);
  const teamKeys = Object.keys(teams).sort();

  const getHighlights = () => {
    if (match?.status !== 'finished') return null;
    const stats = {};
    events.forEach(ev => {
      if (!stats[ev.user_id]) stats[ev.user_id] = { name: ev.display_name || ev.name, avatar: ev.avatar_url, goals: 0, assists: 0, tackles: 0, saves: 0, errors: 0, mvp: 0 };
      if (ev.event_type === 'goal') stats[ev.user_id].goals += ev.quantity;
      if (ev.event_type === 'assist') stats[ev.user_id].assists += ev.quantity;
      if (ev.event_type === 'tackle') stats[ev.user_id].tackles += ev.quantity;
      if (ev.event_type === 'save') stats[ev.user_id].saves += ev.quantity;
      if (ev.event_type === 'error') stats[ev.user_id].errors += ev.quantity;
      if (ev.event_type === 'mvp') stats[ev.user_id].mvp += ev.quantity;
    });

    const getTop = (key) => Object.values(stats).sort((a,b) => b[key] - a[key]).find(p => p[key] > 0);
    
    return {
      craque: getTop('mvp'),
      artilheiro: getTop('goals'),
      garcom: getTop('assists'),
      xerifao: getTop('tackles'),
      paredao: getTop('saves'),
      bolaMurcha: getTop('errors')
    };
  };

  const highlights = getHighlights();

  return (
    <div className="pt-20 pb-24 px-4 max-w-lg mx-auto">
      {/* Header */}
      <Link to={`/groups/${match.group_id}`} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] no-underline">
        ← Voltar ao grupo
      </Link>
      <div className="flex items-center justify-between mt-2 mb-1">
        <h1 className="text-xl font-bold">{match.title}</h1>
        <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: statusInfo.color + '20', color: statusInfo.color }}>
          {statusInfo.label}
        </span>
      </div>
      <p className="text-xs text-[var(--color-text-muted)] mb-6">
        📅 {new Date(match.match_date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
      </p>

      {/* Destaques do Dia (Finished) */}
      {highlights && (
        <div className="bg-gradient-to-br from-[var(--color-bg-card)] to-[var(--color-bg-secondary)] border border-[var(--color-warning)]/40 rounded-2xl p-5 mb-6 shadow-[0_4px_20px_var(--color-warning)]/10">
          <h2 className="text-center font-bold text-[var(--color-warning)] uppercase tracking-widest text-sm mb-4 flex items-center justify-center gap-2">⭐ Destaques da Partida ⭐</h2>
          <div className="grid grid-cols-2 gap-3">
            {highlights.craque && (
              <div className="col-span-2 bg-[var(--color-bg-input)] rounded-xl p-3 flex items-center gap-3 border border-[var(--color-warning)]/20 shadow-sm">
                <div className="text-3xl drop-shadow-md">👑</div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-[var(--color-warning)]">Craque (MVP)</p>
                  <p className="font-semibold">{highlights.craque.name}</p>
                </div>
              </div>
            )}
            {highlights.artilheiro && (
              <div className="bg-[var(--color-bg-input)] rounded-xl p-3 border border-[var(--color-border)] shadow-sm">
                <p className="text-[10px] uppercase font-bold text-[var(--color-accent)]">⚽ Artilheiro</p>
                <p className="font-semibold text-sm truncate">{highlights.artilheiro.name}</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">{highlights.artilheiro.goals} Gols</p>
              </div>
            )}
            {highlights.garcom && (
              <div className="bg-[var(--color-bg-input)] rounded-xl p-3 border border-[var(--color-border)] shadow-sm">
                <p className="text-[10px] uppercase font-bold text-[var(--color-info)]">👟 Garçom</p>
                <p className="font-semibold text-sm truncate">{highlights.garcom.name}</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">{highlights.garcom.assists} Assist.</p>
              </div>
            )}
            {highlights.xerifao && (
              <div className="bg-[var(--color-bg-input)] rounded-xl p-3 border border-[var(--color-border)] shadow-sm">
                <p className="text-[10px] uppercase font-bold text-blue-500">🛡️ Xerifão</p>
                <p className="font-semibold text-sm truncate">{highlights.xerifao.name}</p>
              </div>
            )}
            {highlights.paredao && (
              <div className="bg-[var(--color-bg-input)] rounded-xl p-3 border border-[var(--color-border)] shadow-sm">
                <p className="text-[10px] uppercase font-bold text-teal-500">🧤 Paredão</p>
                <p className="font-semibold text-sm truncate">{highlights.paredao.name}</p>
              </div>
            )}
            {highlights.bolaMurcha && (
              <div className="col-span-2 bg-[var(--color-bg-input)] rounded-xl p-3 border border-[var(--color-danger)]/20 shadow-sm flex items-center gap-3">
                <div className="text-2xl opacity-80">❌</div>
                <div>
                   <p className="text-[10px] uppercase font-bold text-[var(--color-danger)]">Bola Murcha</p>
                   <p className="font-semibold text-sm">{highlights.bolaMurcha.name}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Check-in button */}
      {match.status === 'scheduled' && (
        <button
          id="btn-checkin"
          onClick={handleCheckin}
          className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] cursor-pointer mb-6 ${
            isConfirmed || myCheckin?.is_waitlist
              ? 'bg-[var(--color-accent)] text-white shadow-[0_0_20px_var(--color-accent-glow)]'
              : 'bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]'
          }`}
        >
          {isConfirmed ? `✓ Presença Confirmada (${confirmedCount})` : (myCheckin?.is_waitlist ? `⏱ Na Lista de Espera (${waitlistPlayers.length})` : `Confirmar Presença (${confirmedCount})`)}
        </button>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(match.status === 'finished' || match.status === 'in_progress') && isConfirmed && (
          <button onClick={() => setShowVoting(!showVoting)} className="px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--color-warning)]/10 text-[var(--color-warning)] hover:bg-[var(--color-warning)]/20 cursor-pointer">
            ⭐ Avaliar Jogadores
          </button>
        )}
        {isAdmin && match.status === 'scheduled' && (
          <>
            <button onClick={handleBalance} className="px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--color-info)]/10 text-[var(--color-info)] hover:bg-[var(--color-info)]/20 cursor-pointer">
              🎲 Sortear Times
            </button>
            <button onClick={handleStartMatch} className="px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--color-success)]/10 text-[var(--color-success)] hover:bg-[var(--color-success)]/20 cursor-pointer">
              ▶️ Iniciar Partida
            </button>
          </>
        )}
        {isAdmin && match.status === 'in_progress' && (
          <button onClick={handleFinishMatch} className="px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20 cursor-pointer">
            ⏹ Finalizar Partida
          </button>
        )}
        {isAdmin && (
          <button onClick={() => setShowEventForm(!showEventForm)} className="px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 cursor-pointer mt-1 w-full">
            📝 Lançar Evento Manual
          </button>
        )}
      </div>

      {match.status === 'in_progress' && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 mb-6 text-center shadow-[0_0_30px_var(--color-accent-glow)]">
          <p className="text-[var(--color-text-muted)] text-xs font-bold uppercase tracking-wider mb-2 animate-pulse">Partida em Andamento</p>
          <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] tabular-nums">
            {formatTime(liveTime)}
          </p>
        </div>
      )}

      {/* Event form */}
      {showEventForm && (
        <form onSubmit={recordEvent} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4 mb-6 space-y-3">
          <select
            value={eventForm.user_id}
            onChange={(e) => setEventForm({ ...eventForm, user_id: e.target.value })}
            required
            className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-border-focus)] outline-none"
          >
            <option value="">Selecione o jogador</option>
            {confirmedPlayers.map((p) => (
              <option key={p.user_id} value={p.user_id}>{p.display_name || p.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <select
              value={eventForm.event_type}
              onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}
              className="flex-1 bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-border-focus)] outline-none"
            >
              {EVENT_TYPES.map((et) => (
                <option key={et.value} value={et.value}>{et.label}</option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              max="20"
              value={eventForm.quantity}
              onChange={(e) => setEventForm({ ...eventForm, quantity: parseInt(e.target.value) || 1 })}
              className="w-20 bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-xl px-3 py-3 text-sm text-[var(--color-text-primary)] text-center focus:border-[var(--color-border-focus)] outline-none"
            />
          </div>
          <button type="submit" className="w-full py-3 rounded-xl font-semibold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] cursor-pointer">
            Registrar
          </button>
        </form>
      )}

      {/* Voting modal */}
      {showVoting && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4 mb-6">
          <h3 className="font-bold text-sm mb-3 text-center">Avalie seus parceiros (Anônimo)</h3>
          <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-2">
            {confirmedPlayers.filter(p => p.user_id !== user?.id).map((p) => (
              <div key={p.user_id} className="flex flex-col gap-1 bg-[var(--color-bg-input)] rounded-xl p-3 border border-[var(--color-border)]">
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">{p.display_name || p.name}</span>
                <input 
                   type="range" min="0" max="5" step="0.5"
                   value={ratings[p.user_id] || 0}
                   onChange={(e) => setRatings({...ratings, [p.user_id]: parseFloat(e.target.value)})}
                   className="w-full accent-[var(--color-accent)] cursor-pointer mt-2"
                />
                <div className="flex justify-between text-[10px] text-[var(--color-text-muted)] font-bold mt-1">
                  <span>0 (Fraco)</span>
                  <span className="text-[var(--color-warning)] text-xs bg-[var(--color-bg-card)] px-2 py-0.5 rounded-md border border-[var(--color-border)]">
                    {ratings[p.user_id] || 0} ⭐
                  </span>
                  <span>5 (Craque)</span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={submitRatings} className="w-full py-3 rounded-xl font-semibold text-[var(--color-bg-body)] bg-[var(--color-warning)] hover:bg-[var(--color-warning)]/80 cursor-pointer">
            Enviar Avaliações
          </button>
        </div>
      )}

      {/* Teams */}
      {teamKeys.length > 0 && teamKeys.some((k) => k !== '0') ? (
        match.status === 'in_progress' ? (
          // LIVE DASHBOARD TEAMS
          <div className="space-y-4 mb-6 relative">
            {loadingLiveEvent && <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl" />}
            {teamKeys.filter((k) => k !== '0').map((teamKey) => (
              <div key={teamKey} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-3">
                <h3 className="text-sm font-bold mb-3 border-b border-[var(--color-border)] pb-2">Time {teamKey}</h3>
                <div className="space-y-2">
                  {teams[teamKey].map((p) => (
                    <div key={p.checkin_id} className="bg-[var(--color-bg-input)] rounded-xl p-3 flex flex-col gap-2">
                       <span className="font-semibold text-sm">{p.display_name || p.name}</span>
                       <div className="flex justify-between">
                         <button onClick={() => recordLiveEvent(p.user_id, 'goal')} className="text-xl hover:scale-125 transition-transform cursor-pointer" title="Gol">⚽</button>
                         <button onClick={() => recordLiveEvent(p.user_id, 'assist')} className="text-xl hover:scale-125 transition-transform cursor-pointer" title="Assistência">👟</button>
                         <button onClick={() => recordLiveEvent(p.user_id, 'tackle')} className="text-xl hover:scale-125 transition-transform cursor-pointer" title="Desarme">🛡️</button>
                         <button onClick={() => recordLiveEvent(p.user_id, 'save')} className="text-xl hover:scale-125 transition-transform cursor-pointer" title="Defesa">🧤</button>
                         <button onClick={() => recordLiveEvent(p.user_id, 'error')} className="text-xl hover:scale-125 transition-transform cursor-pointer" title="Falha">❌</button>
                         <button onClick={() => recordLiveEvent(p.user_id, 'dribble')} className="text-xl hover:scale-125 transition-transform cursor-pointer" title="Drible">🤹</button>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // DRAG AND DROP TEAMS
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {teamKeys.filter((k) => k !== '0').map((teamKey) => {
                const teamPlayers = teams[teamKey] || [];
                const totalSkill = teamPlayers.reduce((s, p) => s + (p.skill_level || 3), 0);
                return (
                  <div key={teamKey} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold">Time {teamKey}</h3>
                      <span className="text-[10px] text-[var(--color-text-muted)]">⭐ {totalSkill}</span>
                    </div>
                    <SortableContext items={teamPlayers.map((p) => p.checkin_id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-1.5">
                        {teamPlayers.map((p) => (
                          <SortablePlayer key={p.checkin_id} player={p} />
                        ))}
                      </div>
                    </SortableContext>
                  </div>
                );
              })}
            </div>
          </DndContext>
        )
      ) : (
        /* Confirmed players list */
        confirmedPlayers.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">Confirmados ({confirmedCount})</h2>
            <div className="space-y-2">
              {confirmedPlayers.map((p) => (
                <div key={p.user_id} className="flex items-center gap-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-7 h-7 rounded-full" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] flex items-center justify-center text-white text-[10px] font-bold">
                      {(p.display_name || p.name || '?')[0]}
                    </div>
                  )}
                  <span className="text-sm font-medium">{p.display_name || p.name}</span>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Waitlist */}
      {waitlistPlayers.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">Lista de Espera ({waitlistPlayers.length})</h2>
          <div className="space-y-2 opacity-70">
            {waitlistPlayers.map((p) => (
              <div key={p.user_id} className="flex items-center gap-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2">
                <span className="text-xs font-medium">{p.display_name || p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Match Events */}
      {events.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3">Súmula</h2>
          <div className="space-y-1.5">
            {events.map((ev) => {
              const typeInfo = EVENT_TYPES.find((t) => t.value === ev.event_type);
              return (
                <div key={ev.id} className="flex items-center justify-between bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span>{typeInfo?.label.split(' ')[0]}</span>
                    <span className="font-medium">{ev.display_name || ev.name}</span>
                    {ev.quantity > 1 && <span className="text-[var(--color-text-muted)]">×{ev.quantity}</span>}
                  </div>
                  {isAdmin && (
                    <button onClick={() => deleteEvent(ev.id)} className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] text-xs cursor-pointer">✕</button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
