import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import Loader from '../components/Loader';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [profileRes, statsRes] = await Promise.all([
          api.get(`/api/users/${id}/profile`),
          api.get(`/api/profile/${id}/stats`)
        ]);
        setProfile(profileRes.data.profile);
        setStats(statsRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) return <Loader text="Buscando jogador..." />;
  if (!profile) return <div className="pt-20 text-center text-[var(--color-text-muted)]">Jogador não encontrado.</div>;

  const getPositionColor = (pos) => {
    const p = {
      'Goleiro': 'var(--color-warning)',
      'Zagueiro': '#3b82f6',
      'Lateral': '#eab308',
      'Meia': 'var(--color-accent)',
      'Atacante': 'var(--color-danger)'
    }[pos];
    return p || '#888';
  };

  return (
    <div className="pt-20 pb-24 px-4 max-w-lg mx-auto">
      <div className="mb-4">
        <button onClick={() => navigate(-1)} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] cursor-pointer">
          ← Voltar
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8 bg-[var(--color-bg-card)] border border-[var(--color-border)] p-4 rounded-2xl shadow-sm">
        <div className="relative flex-shrink-0">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover ring-2 ring-[var(--color-border)]" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] flex items-center justify-center text-white font-bold text-xl">
              {(profile.display_name || profile.name || '?')[0].toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold truncate">{profile.display_name || profile.name}</h1>
          <div className="flex gap-2 items-center mt-1">
             {profile.position && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: getPositionColor(profile.position) + '20', color: getPositionColor(profile.position) }}>
                  {profile.position}
                </span>
             )}
             <span className="text-[10px] text-[var(--color-text-muted)] border border-[var(--color-border)] px-2 py-0.5 rounded-full">
               👑 Rating: {parseFloat(profile.skill_level || 3).toFixed(1)}
             </span>
          </div>
        </div>
      </div>

      {stats && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4 shadow-[0_4px_20px_var(--color-accent)]/5">
          <h2 className="text-sm font-semibold mb-4 text-center">Radar de Desempenho</h2>
          <div className="h-64 w-full text-[10px] mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart 
                cx="50%" 
                cy="50%" 
                outerRadius="70%" 
                data={[
                  { subject: 'Habilidade', A: stats.skill_level || 3, fullMark: 5 },
                  { subject: 'Votos da Galera', A: stats.avg_rating || 3, fullMark: 5 },
                  { subject: 'Gols', A: Math.min(5, (stats.goals || 0) * 0.5 + 2), fullMark: 5 },
                  { subject: 'Ataque', A: Math.min(5, (stats.goals || 0) * 0.2 + (stats.assists || 0) * 0.3 + 2), fullMark: 5 },
                  { subject: 'Defesa', A: profile.position === 'Zagueiro' ? 5 : (profile.position === 'Goleiro' ? 4 : 2), fullMark: 5 }
                ]}
              >
                <PolarGrid stroke="#333" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                <Radar
                   name="Estatísticas"
                   dataKey="A"
                   stroke="var(--color-accent)"
                   fill="var(--color-accent)"
                   fillOpacity={0.5}
                />
                <Tooltip contentStyle={{ backgroundColor: '#1C1C1E', border: '1px solid #333', borderRadius: '8px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-[var(--color-bg-input)] p-3 rounded-xl border border-[var(--color-border)] shadow-sm">
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">Jogos</p>
              <p className="text-2xl font-black text-[var(--color-info)] mt-1">{stats.matches_played}</p>
            </div>
            <div className="bg-[var(--color-bg-input)] p-3 rounded-xl border border-[var(--color-border)] shadow-sm">
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">Craque (MVP)</p>
              <p className="text-2xl font-black text-[var(--color-warning)] mt-1">{stats.mvp_count}</p>
            </div>
            <div className="bg-[var(--color-bg-input)] p-3 rounded-xl border border-[var(--color-border)] shadow-sm">
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">Gols</p>
              <p className="text-2xl font-black text-[var(--color-accent)] mt-1">{stats.goals}</p>
            </div>
            <div className="bg-[var(--color-bg-input)] p-3 rounded-xl border border-[var(--color-border)] shadow-sm">
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide">Assistências</p>
              <p className="text-2xl font-black text-emerald-500 mt-1">{stats.assists}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
