import { useState, useEffect } from 'react';
import api from '../api/client';
import Loader from '../components/Loader';

export default function Invites() {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadInvites(); }, []);

  async function loadInvites() {
    try {
      const { data } = await api.get('/api/invites');
      setInvites(data.invites);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function respond(id, status) {
    try {
      await api.patch(`/api/invites/${id}`, { status });
      setInvites((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao responder convite.');
    }
  }

  if (loading) return <Loader text="Carregando convites..." />;

  return (
    <div className="pt-20 pb-24 px-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-6">Convites</h1>

      {invites.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">✉️</p>
          <p className="text-[var(--color-text-secondary)] text-sm">Nenhum convite pendente.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4"
            >
              <h3 className="font-semibold text-[var(--color-text-primary)]">{invite.group_name}</h3>
              {invite.group_description && (
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{invite.group_description}</p>
              )}
              <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                Convidado por <span className="font-medium text-[var(--color-text-primary)]">{invite.invited_by_name}</span>
              </p>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => respond(invite.id, 'accepted')}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] active:scale-[0.98] transition-all cursor-pointer"
                >
                  ✓ Aceitar
                </button>
                <button
                  onClick={() => respond(invite.id, 'declined')}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] active:scale-[0.98] transition-all cursor-pointer"
                >
                  ✕ Recusar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
