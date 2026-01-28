import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { GameProvider } from './context/GameContext'

import HomePage from './pages/HomePage'
import HostPage from './pages/HostPage'
import PlayerPage from './pages/PlayerPage'
import ResultsPage from './pages/ResultsPage'

import './index.css'
import './i18n' // Import the i18n configuration

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Using Suspense for lazy loading translations */}
    <Suspense fallback="Loading...">
      {/* Обгортаємо ВСЕ в GameProvider, щоб "мозок" був доступний скрізь */}
      <GameProvider>
        <BrowserRouter>
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
)