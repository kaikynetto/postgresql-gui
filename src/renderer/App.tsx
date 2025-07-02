import React, { useEffect, useState } from 'react';
import { MemoryRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import WelcomePage from './pages/WelcomePage';
import DB from './pages/DB';

export default function App() {
  const [hasConnection, setHasConnection] = useState<boolean | null>(null);

  useEffect(() => {
    window.electron.ipcRenderer.sendMessage('load-data');

    const unsub = window.electron.ipcRenderer.on('load-data-response', (data) => {
      if (data && data.connectUrl) {
        setHasConnection(true);
      } else {
        setHasConnection(false);
      }
    });

    return () => unsub();
  }, []);

  if (hasConnection === null) {
    return <div>Carregando...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={hasConnection ? <Navigate to="/DB" replace /> : <WelcomePage />} />
        <Route path="/DB" element={<DB />} />
      </Routes>
    </Router>
  );
}
