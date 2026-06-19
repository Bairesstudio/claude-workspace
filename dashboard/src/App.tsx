import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Hoy } from './pages/Hoy';
import { Proximos } from './pages/Proximos';
import { Historial } from './pages/Historial';
import { Metricas } from './pages/Metricas';
import { AdminClientes } from './pages/admin/AdminClientes';
import { AdminClienteDetalle } from './pages/admin/AdminClienteDetalle';

function PublicRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function ProtectedRoutes() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Cargando...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={role === 'admin' ? <Navigate to="/admin" replace /> : <Hoy />} />
        <Route path="/proximos" element={<Proximos />} />
        <Route path="/historial" element={<Historial />} />
        <Route path="/metricas" element={<Metricas />} />
        <Route path="/admin" element={<AdminRoute><AdminClientes /></AdminRoute>} />
        <Route path="/admin/clientes/:id" element={<AdminRoute><AdminClienteDetalle /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicRoute />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
