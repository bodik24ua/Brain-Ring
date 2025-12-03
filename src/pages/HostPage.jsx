import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useGame } from '../context/GameContext'; 

function generateId(prefix = 'id-') { return prefix + Math.random().toString(16).slice(2, 10); }

// Стилі
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { backgroundColor: 'white', padding: '30px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' };
const sectionStyle = { border: '1px solid #ccc', borderRadius: '8px', padding: '15px', margin: '20px 0' };

// Компонент модального вікна з QR-кодом команди
function Modal({ team, gameId, onClose }) { 
    if (!team) return null; 
    const qrValue = JSON.stringify({ gameId, teamId: team.id }); 
    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h2>{team.name}</h2>
                <QRCodeSVG value={qrValue} size={256} /> 
                <p>ID: {team.id}</p>
                <button onClick={onClose} style={{ marginTop: '20px' }}>Закрити</button>
            </div>
        </div>
    ); 
}

// Компонент керування таймером
function TimerControls({ gameState, publishGameState }) {
    const { timerDuration, timerRunning, buzzers } = gameState;
    const quickSetTimes = [15, 30, 45, 60, 90, 120, 300];
  
    const setDuration = (seconds) => publishGameState({ ...gameState, timerDuration: seconds });
    
    const toggleTimer = () => {
      if (timerRunning) {
        publishGameState({ ...gameState, timerRunning: false, timerStartTime: null });
      } else {
        publishGameState({ 
            ...gameState, 
            timerRunning: true, 
            timerStartTime: Date.now(), 
            buzzers: [],
            isQuestionActive: true 
        });
      }
    };
  
    return (
      <div style={sectionStyle}>
        <h2>Таймер</h2>
        <div>{quickSetTimes.map(time => (<button key={time} onClick={() => setDuration(time)} style={{ fontWeight: timerDuration === time ? 'bold' : 'normal', margin: '2px' }}>{time}s</button>))}</div>
        <div style={{ marginTop: '15px' }}>
          <span style={{ fontSize: '1.5em', marginRight: '20px' }}>{timerDuration} s</span>
          <button onClick={toggleTimer} style={{ fontSize: '1.5em', padding: '10px 20px', backgroundColor: timerRunning ? '#ffcccc' : '#ccffcc' }}>{timerRunning ? 'СТОП' : 'СТАРТ'}</button>
        </div>
        <div style={{ marginTop: '15px' }}>
          <h3>Хто натиснув:</h3>
          {buzzers.length === 0 ? <p>...</p> : <ol>{buzzers.map((buzz, i) => { const t = gameState.teams.find(x => x.id === buzz.teamId); return <li key={i}><strong>{t ? t.name : '??'}</strong> ({buzz.time.toFixed(2)}s)</li> })}</ol>}
        </div>
      </div>
    );
}

function HostPage() {
  const { gameState, gameId, isConnected, connectToGame, publishGameState, inviteDevice } = useGame();
  
  const { teams, questions, buzzers, currentQuestionId, usedQuestionIds = [] } = gameState;

  const [newTeamName, setNewTeamName] = useState('');
  const [newQuestionText, setNewQuestionText] = useState(''); 
  const [showQrForTeam, setShowQrForTeam] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

  // Ініціалізація
  useEffect(() => {
    if (!gameId && !isConnected) {
      const savedData = localStorage.getItem('brainring_host_data');
      let idToUse = savedData ? JSON.parse(savedData).gameId : null;
      if (!idToUse) idToUse = generateId('game-');
      connectToGame(idToUse, { host: true }); 
    }
  }, [gameId, isConnected, connectToGame]); 

  // Логіка Сканера
  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner('host-qr-scanner', { fps: 10, qrbox: { width: 250, height: 250 } }, false);
      scanner.render((decodedText) => {
        try {
          const data = JSON.parse(decodedText);
          if (data.setupId) { inviteDevice(data.setupId); alert('Підключено!'); setShowScanner(false); }
        } catch (e) {}
      }, () => {});
      return () => { if (scanner && scanner.getState() === 2) scanner.clear(); };
    }
  }, [showScanner, inviteDevice]);

  // --- Функції керування КОМАНДАМИ ---
  const handleCreateTeam = () => { 
      if (newTeamName.trim() === '' || teams.length >= 6) return; 
      const newTeam = { id: generateId('team-'), name: newTeamName.trim(), score: 0 };
      publishGameState({ ...gameState, teams: [...teams, newTeam] }); 
      setNewTeamName(''); 
  };

  // --- НОВА ФУНКЦІЯ: Видалити команду ---
  const handleDeleteTeam = (teamId) => {
    if (!window.confirm('Ви впевнені, що хочете видалити цю команду?')) return;

    // 1. Прибираємо команду зі списку
    const updatedTeams = teams.filter(t => t.id !== teamId);
    
    // 2. Прибираємо її з "натискань" (щоб не висіла в списку buzzers)
    const updatedBuzzers = buzzers.filter(b => b.teamId !== teamId);

    publishGameState({ 
        ...gameState, 
        teams: updatedTeams,
        buzzers: updatedBuzzers
    });
  };
  
  const updateScore = (teamId, amount) => { 
      const updatedTeams = teams.map(team => team.id === teamId ? { ...team, score: team.score + amount } : team);
      publishGameState({ ...gameState, teams: updatedTeams }); 
  };
  
  // --- Функції керування ПИТАННЯМИ ---
  const handleAddQuestion = () => { if (newQuestionText.trim() === '') return; publishGameState({ ...gameState, questions: [...questions, { id: generateId('q-'), text: newQuestionText.trim() }] }); setNewQuestionText(''); };
  const handleRemoveQuestion = (qid) => { if (window.confirm('Видалити?')) publishGameState({ ...gameState, questions: questions.filter(q => q.id !== qid) }); };
  
  const handleSelectQuestion = (qId) => {
      const newUsed = usedQuestionIds.includes(qId) ? usedQuestionIds : [...usedQuestionIds, qId];
      publishGameState({
          ...gameState,
          currentQuestionId: qId,
          usedQuestionIds: newUsed,
          isQuestionActive: false, 
          buzzers: [] 
      });
  };

  const handleClearUsed = () => { if(window.confirm('Очистити закреслення?')) publishGameState({...gameState, usedQuestionIds: []}); };
  const handleResetGame = () => { if (window.confirm('Скинути гру?')) { localStorage.removeItem('brainring_host_data'); window.location.reload(); } };
  
  const handleExportQuestions = () => {
      if (!questions.length) return alert('Немає питань');
      const dataStr = JSON.stringify(questions, null, 2);
      const link = document.createElement('a');
      link.href = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      link.download = 'questions.json';
      link.click();
  };
  const handleImportQuestions = (e) => {
      const file = e.target.files[0]; if(!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => { try { const q = JSON.parse(ev.target.result); if(Array.isArray(q)) publishGameState({...gameState, questions: q}); } catch(err){ alert('Помилка файлу'); } };
      reader.readAsText(file);
      e.target.value = null;
  };

  if (!isConnected || !gameId) return <div>Завантаження...</div>;
  
  return (
    <div>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/">&larr; На головну</Link>
        <div>
            <button onClick={() => setShowScanner(!showScanner)} style={{ marginRight: '10px' }}>{showScanner ? 'Закрити' : '📷 Підключити'}</button>
            <button onClick={handleResetGame} style={{ backgroundColor: '#ffdddd', border: '1px solid red' }}>Скинути</button>
        </div>
      </nav>
      
      {showScanner && <div style={sectionStyle}><div id="host-qr-scanner" style={{ maxWidth: '300px', margin: 'auto' }}></div></div>}

      <h1>Сторінка Ведучого</h1>
      <div style={{ padding: '10px', backgroundColor: '#dfffe2' }}>ID: {gameId}</div>

      <TimerControls gameState={gameState} publishGameState={publishGameState} />

      <div style={{ padding: '10px', border: '2px solid blue', borderRadius: '8px', marginBottom: '20px', backgroundColor: '#f0f8ff' }}>
          <h3>Вибране питання:</h3>
          {currentQuestionId ? (
              <p style={{ fontSize: '1.2em' }}>
                  {questions.find(q => q.id === currentQuestionId)?.text || 'Помилка'}
                  {!gameState.isQuestionActive && <span style={{ color: 'red', marginLeft: '10px', fontSize: '0.8em' }}>(Приховано)</span>}
              </p>
          ) : <p>Питання не вибрано</p>}
      </div>

      <div style={sectionStyle}>
        <h2>Команди</h2>
        
        <div style={{ marginBottom: '15px' }}>
          <input 
            type="text" 
            placeholder="Назва нової команди" 
            value={newTeamName} 
            onChange={(e) => setNewTeamName(e.target.value)} 
            style={{ padding: '5px', width: '200px' }}
          />
          <button onClick={handleCreateTeam} style={{ marginLeft: '10px' }}>Створити</button>
        </div>

        {teams.length === 0 ? <p>Немає команд.</p> : (
          <table style={{ width: '100%' }}>
            <thead><tr><th>Назва</th><th>Бали</th><th>Час</th><th>Дії</th></tr></thead>
            <tbody>
              {teams.map((team) => {
                const buzzData = buzzers.find(b => b.teamId === team.id);
                return (
                  <tr key={team.id}>
                    <td><strong>{team.name}</strong></td>
                    <td>
                        <button onClick={() => updateScore(team.id, -1)} style={{ width: '30px' }}>-</button> 
                        <span style={{ margin: '0 10px', fontSize: '1.2em' }}>{team.score}</span> 
                        <button onClick={() => updateScore(team.id, 1)} style={{ width: '30px' }}>+</button>
                    </td>
                    <td>{buzzData ? buzzData.time.toFixed(2) : '-'}</td>
                    <td>
                        <button onClick={() => setShowQrForTeam(team)} style={{ marginRight: '5px' }}>QR</button>
                        {/* Кнопка видалення */}
                        <button onClick={() => handleDeleteTeam(team.id)} style={{ backgroundColor: '#ffdddd', color: 'red', border: '1px solid red' }}>X</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><h2>Питання</h2><button onClick={handleClearUsed}>Очистити</button></div>
        <div>
          <input type="text" value={newQuestionText} onChange={(e) => setNewQuestionText(e.target.value)} style={{ width: '60%' }} />
          <button onClick={handleAddQuestion}>Додати</button>
          <button onClick={handleExportQuestions}>Експорт</button>
          <label style={{ marginLeft: '5px', background:'#eee', padding:'2px' }}>Імпорт<input type="file" accept=".json" style={{display:'none'}} onChange={handleImportQuestions}/></label>
        </div>
        <ul style={{ maxHeight: '300px', overflowY: 'auto', marginTop: '10px', border: '1px solid #eee' }}>
          {questions.map((q, i) => {
            const isUsed = usedQuestionIds.includes(q.id);
            const isSel = currentQuestionId === q.id;
            return (
                <li key={q.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: isSel ? '#e6f7ff' : 'transparent', borderBottom:'1px solid #eee' }}>
                    <div onClick={() => handleSelectQuestion(q.id)} style={{ cursor: 'pointer', flex: 1, textDecoration: isUsed ? 'line-through' : 'none', color: isUsed ? '#888' : 'black' }}>
                        <strong>{i+1}.</strong> {q.text}
                    </div>
                    <button onClick={() => handleRemoveQuestion(q.id)} style={{ color: 'red', background: 'none', border: 'none' }}>x</button>
                </li>
            );
          })}
        </ul>
      </div>
      
      <Modal team={showQrForTeam} gameId={gameId} onClose={() => setShowQrForTeam(null)} />
    </div>
  );
}
export default HostPage;