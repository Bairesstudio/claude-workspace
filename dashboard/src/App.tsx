import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/ToastContext';
import { Hoy } from './pages/Hoy';
import { Proximos } from './pages/Proximos';
import { Historial } from './pages/Historial';
import { Metricas } from './pages/Metricas';

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Hoy />} />
            <Route path="/proximos" element={<Proximos />} />
            <Route path="/historial" element={<Historial />} />
            <Route path="/metricas" element={<Metricas />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
