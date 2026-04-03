export const POSITIONS = [
  { value: 'Goleiro', label: '🧤 Goleiro', color: '#f59e0b' },
  { value: 'Zagueiro', label: '🛡️ Zagueiro', color: '#3b82f6' },
  { value: 'Lateral', label: '🏃 Lateral', color: '#8b5cf6' },
  { value: 'Meia', label: '🎯 Meia', color: '#10b981' },
  { value: 'Atacante', label: '⚡ Atacante', color: '#ef4444' },
];

export const EVENT_TYPES = [
  { value: 'goal', label: '⚽ Gol', color: '#10b981' },
  { value: 'assist', label: '👟 Assistência', color: '#3b82f6' },
  { value: 'yellow_card', label: '🟨 Cartão Amarelo', color: '#f59e0b' },
  { value: 'red_card', label: '🟥 Cartão Vermelho', color: '#ef4444' },
  { value: 'mvp', label: '⭐ Destaque', color: '#f59e0b' },
  { value: 'save', label: '🧤 Defesa Difícil', color: '#f59e0b' },
  { value: 'tackle', label: '🛡️ Desarme', color: '#3b82f6' },
  { value: 'error', label: '❌ Falha', color: '#ef4444' },
  { value: 'dribble', label: '🤹 Drible', color: '#8b5cf6' },
];

export const MATCH_STATUS = {
  scheduled: { label: 'Agendada', color: '#3b82f6' },
  checkin: { label: 'Check-in Aberto', color: '#f59e0b' },
  in_progress: { label: 'Em Andamento', color: '#10b981' },
  finished: { label: 'Finalizada', color: '#64748b' },
};
