import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Loader from './components/Loader';
import Navbar from './components/Navbar';

// Pages
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import WaitingList from './pages/WaitingList';
import Profile from './pages/Profile';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import GroupJoin from './pages/GroupJoin';
import Invites from './pages/Invites';
import MatchDay from './pages/MatchDay';
import AdminDashboard from './pages/AdminDashboard';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_approved && !user.is_superadmin) return <WaitingList />;

  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <Loader />;
  if (user && (user.is_approved || user.is_superadmin)) return <Navigate to="/groups" replace />;

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/callback" element={<AuthCallback />} />

          {/* Protected */}
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
          <Route path="/groups/:id" element={<ProtectedRoute><GroupDetail /></ProtectedRoute>} />
          <Route path="/groups/:id/join" element={<ProtectedRoute><GroupJoin /></ProtectedRoute>} />
          <Route path="/invites" element={<ProtectedRoute><Invites /></ProtectedRoute>} />
          <Route path="/matches/:id" element={<ProtectedRoute><MatchDay /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/groups" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
