import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ExperiencePage } from './pages/ExperiencePage';
import { QrPage } from './pages/QrPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ExperiencePage />} />
        <Route path="/qr" element={<QrPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
