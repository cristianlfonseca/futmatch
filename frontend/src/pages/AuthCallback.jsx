import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { refetchUser } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      localStorage.setItem('futmatch_token', token);
      refetchUser().then(() => {
        navigate('/groups', { replace: true });
      });
    } else {
      navigate('/login', { replace: true });
    }
  }, [navigate, refetchUser]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-transparent border-t-[var(--color-accent)] animate-spin" />
        <p className="text-[var(--color-text-secondary)] animate-pulse">Autenticando...</p>
      </div>
    </div>
  );
}
