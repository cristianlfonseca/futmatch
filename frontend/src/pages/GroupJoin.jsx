import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import Loader from '../components/Loader';

export default function GroupJoin() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function joinGroup() {
      try {
        await api.post(`/api/groups/${id}/join`);
        navigate(`/groups/${id}`);
      } catch (err) {
        setError(err.response?.data?.error || 'Erro ao entrar no grupo.');
        setLoading(false);
      }
    }
    joinGroup();
  }, [id, navigate]);

  if (loading) return <Loader text="Entrando no grupo..." />;

  return (
    <div className="pt-20 px-4 text-center max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">Ops!</h1>
      <p className="text-[var(--color-danger)] mb-6">{error}</p>
      <button 
        onClick={() => navigate('/groups')} 
        className="px-6 py-3 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] cursor-pointer"
      >
        Ver Meus Grupos
      </button>
    </div>
  );
}
