import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import StarRating from '../components/StarRating';
import Loader from '../components/Loader';
import { POSITIONS } from '../utils/constants';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

export default function Profile() {
  const { user, refetchUser } = useAuth();
  const [form, setForm] = useState({
    display_name: '',
    birth_date: '',
    position: '',
    skill_level: 0,
    height: '',
    weight: '',
    dominant_foot: ''
  });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const { data } = await api.get('/api/profile');
      
      try {
        if (user?.id) {
          const statsRes = await api.get(`/api/profile/${user.id}/stats`);
          setStats(statsRes.data);
        }
      } catch (err) {
        console.error('Failed to load stats', err);
      }

      if (data.profile) {
        setForm({
          display_name: data.profile.display_name || '',
          birth_date: data.profile.birth_date?.split('T')[0] || '',
          position: data.profile.position || '',
          skill_level: data.profile.skill_level || 0,
          height: data.profile.height || '',
          weight: data.profile.weight || '',
          dominant_foot: data.profile.dominant_foot || '',
        });
      } else {
        setForm((f) => ({ ...f, display_name: user?.name || '' }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/api/profile', form);
      await refetchUser();
      setMessage({ type: 'success', text: 'Perfil salvo com sucesso!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Erro ao salvar.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader text="Carregando perfil..." />;

  return (
    <div className="pt-20 pb-24 px-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-6">Meu Perfil</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Display name */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
            Nome de Jogador
          </label>
          <input
            id="input-display-name"
            type="text"
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-border-focus)] outline-none"
            placeholder="Seu nome no campo"
            required
          />
        </div>

        {/* Birth date */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
            Data de Nascimento
          </label>
          <input
            id="input-birth-date"
            type="date"
            value={form.birth_date}
            onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
            className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text-primary)] focus:border-[var(--color-border-focus)] outline-none [color-scheme:dark]"
          />
        </div>

        {/* Position */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
            Posição Principal
          </label>
          <div className="grid grid-cols-2 gap-2">
            {POSITIONS.map((pos) => (
              <button
                key={pos.value}
                type="button"
                onClick={() => setForm({ ...form, position: pos.value })}
                className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                  form.position === pos.value
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]'
                }`}
              >
                {pos.label}
              </button>
            ))}
          </div>
        </div>

        {/* Physical Attributes */}
        <div className="grid grid-cols-3 gap-2">
          {/* Height */}
          <div>
            <label className="block text-[10px] font-medium text-[var(--color-text-secondary)] mb-1">
              Altura (m)
            </label>
            <input
              type="number"
              step="0.01"
              value={form.height}
              onChange={(e) => setForm({ ...form, height: e.target.value })}
              className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-border-focus)] outline-none"
              placeholder="1.75"
            />
          </div>
          {/* Weight */}
          <div>
            <label className="block text-[10px] font-medium text-[var(--color-text-secondary)] mb-1">
              Peso (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
              className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-border-focus)] outline-none"
              placeholder="70.5"
            />
          </div>
          {/* Foot */}
          <div>
            <label className="block text-[10px] font-medium text-[var(--color-text-secondary)] mb-1">
              Pé Dominante
            </label>
            <select
              value={form.dominant_foot}
              onChange={(e) => setForm({ ...form, dominant_foot: e.target.value })}
              className="w-full bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-xl px-2 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-border-focus)] outline-none"
            >
              <option value="">Selecione</option>
              <option value="Direito">Destro</option>
              <option value="Esquerdo">Canhoto</option>
              <option value="Ambidestro">Ambidestro</option>
            </select>
          </div>
        </div>

        {/* Skill Level */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
            Nível de Habilidade
          </label>
          <StarRating
            value={form.skill_level}
            onChange={(val) => setForm({ ...form, skill_level: val })}
            size="lg"
          />
        </div>

        {/* Message */}
        {message && (
          <div
            className={`p-3 rounded-xl text-sm font-medium ${
              message.type === 'success'
                ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Submit */}
        <button
          id="btn-save-profile"
          type="submit"
          disabled={saving}
          className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-[var(--color-gradient-start)] to-[var(--color-gradient-end)] hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Salvando...' : 'Salvar Perfil'}
        </button>
      </form>

      {/* Radar Chart Visuals */}
      {stats && (
        <div className="mt-8 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4">
          <h2 className="text-sm font-semibold mb-4 text-center">Gráfico de Performance</h2>
          <div className="h-64 w-full text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart 
                cx="50%" 
                cy="50%" 
                outerRadius="70%" 
                data={[
                  { subject: 'Habilidade', A: stats.skill_level || 3, fullMark: 5 },
                  { subject: 'Votos da Galera', A: stats.avg_rating || 3, fullMark: 5 },
                  { subject: 'Gols', A: Math.min(5, (stats.goals || 0) * 0.5 + 2), fullMark: 5 }, // Scaled for chart
                  { subject: 'Ataque', A: Math.min(5, (stats.goals || 0) * 0.2 + (stats.assists || 0) * 0.3 + 2), fullMark: 5 },
                  { subject: 'Defesa', A: form.position === 'Zagueiro' ? 5 : (form.position === 'Goleiro' ? 4 : 2), fullMark: 5 }
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
          <div className="grid grid-cols-2 gap-2 mt-4 text-center">
            <div className="bg-[var(--color-bg-input)] p-2 rounded-xl border border-[var(--color-border)]">
              <p className="text-[10px] text-[var(--color-text-muted)]">Jogos</p>
              <p className="text-lg font-bold text-[var(--color-info)]">{stats.matches_played}</p>
            </div>
            <div className="bg-[var(--color-bg-input)] p-2 rounded-xl border border-[var(--color-border)]">
              <p className="text-[10px] text-[var(--color-text-muted)]">Destaque (MVP)</p>
              <p className="text-lg font-bold text-[var(--color-warning)]">{stats.mvp_count}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
