import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import type { ReactNode } from 'react';


export default function RequireAuth({ children }: { children: ReactNode }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  if (!isLoggedIn) return <Navigate to="/" replace />;
  return <>{children}</>;
}
