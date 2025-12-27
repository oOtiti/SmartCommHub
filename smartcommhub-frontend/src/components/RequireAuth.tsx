import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export default function RequireAuth({ children }: { children: JSX.Element }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  if (!isLoggedIn) return <Navigate to="/" replace />;
  return children;
}
