import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import { useTranslation } from 'react-i18next';

import HomePage from './pages/HomePage';
import HostPage from './pages/HostPage';
import PlayerPage from './pages/PlayerPage';
import ResultsPage from './pages/ResultsPage';

import './index.css';
import './i18n'; // Import the i18n configuration
import './App.css'

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div>
      <button onClick={() => changeLanguage('en')}>🇬🇧English</button>
      <button onClick={() => changeLanguage('uk')}>🇺🇦Ukrainian</button>
      <button onClick={() => changeLanguage('es')}>🇪🇸Spanish</button>
      <button onClick={() => changeLanguage('sv')}>🇸🇪Swedish</button>
      <button onClick={() => changeLanguage('de')}>🇩🇪German</button>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Using Suspense for lazy loading translations */}
    <Suspense fallback="Loading...">
      {/* Обгортаємо ВСЕ в GameProvider, щоб "мозок" був доступний скрізь */}
      <GameProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <LanguageSwitcher />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/host" element={<HostPage />} />
            <Route path="/player" element={<PlayerPage />} />
            <Route path="/results" element={<ResultsPage />} />
          </Routes>
        </BrowserRouter>
      </GameProvider>
    </Suspense>
  </React.StrictMode>,
);