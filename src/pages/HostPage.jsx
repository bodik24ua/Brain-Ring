import { useState, useEffect, useRef } from 'react'; // <-- Додано useRef
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useGame } from '../context/GameContext'; 

function generateId(prefix = 'id-') { return prefix + Math.random().toString(16).slice(2, 10); }

// Стилі
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { backgroundColor: 'white', padding: '30px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.2)', color: '#000000ff', fontWeight: 'bold'};
const sectionStyle = { border: '1px solid #ccc', borderRadius: '8px', padding: '15px', margin: '20px 0' };

function Modal({ team, gameId, onClose }) { 
    const { t } = useTranslation();
    if (!team) return null; 
    const qrValue = JSON.stringify({ gameId, teamId: team.id }); 
    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h2>{team.name}</h2>
                <QRCodeSVG value={qrValue} size={256} /> 
                <p>ID: {team.id}</p>
                <button onClick={onClose} style={{ marginTop: '20px' }}>{t('close')}</button>
            </div>
        </div>
    ); 
}

function TimerControls({ gameState, publishGameState }) {
    const { t } = useTranslation();
    const { timerDuration, timerRunning, buzzers } = gameState;
    const quickSetTimes = [5, 10, 15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240, 270, 300];
  
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
        <h2>{t('timer')}</h2>
        <div>{quickSetTimes.map(time => (<button key={time} onClick={() => setDuration(time)} style={{ fontWeight: timerDuration === time ? 'bold' : 'normal', margin: '2px' }}>{time}{t('secondsSuffix')}</button>))}</div>
        <div style={{ marginTop: '15px' }}>
          <span style={{ fontSize: '1.5em', marginRight: '20px' }}>{timerDuration} s</span>
          <button onClick={toggleTimer} style={{ border: '1px solid yellow', fontSize: '1.5em', padding: '10px 20px', backgroundColor: timerRunning ? '#c15656ff' : '#3bb33bff' }}>{timerRunning ? t('stop') : t('start')}</button>
        </div>
        <div style={{ marginTop: '15px' }}>
          <h3>{t('whoPressed')}:</h3>
          {buzzers.length === 0 ? <p>...</p> : <ol>{buzzers.map((buzz, i) => { const t = gameState.teams.find(x => x.id === buzz.teamId); return <li key={i}><strong style={{ display: 'block', maxWidth: '70vw', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t ? t.name : '??'}</strong> ({buzz.time.toFixed(2)}s)</li> })}</ol>}
        </div>
      </div>
    );
}

function HostPage() {
  const { t } = useTranslation();
  const { gameState, gameId, isConnected, connectToGame, publishGameState, inviteDevice } = useGame();
  
  // Захист від пустих даних
  const { teams, questions, buzzers, currentQuestionId, usedQuestionIds = [] } = gameState;

  const [newTeamName, setNewTeamName] = useState('');
  const [newQuestionText, setNewQuestionText] = useState(''); 
  const [showQrForTeam, setShowQrForTeam] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

  // --- REF ДЛЯ ІМПОРТУ ---
  const fileInputRef = useRef(null); 

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
          if (data.setupId) { inviteDevice(data.setupId); alert(t('deviceConnected')); setShowScanner(false); }
        } catch (e) {}
      }, () => {});
      return () => { if (scanner && scanner.getState() === 2) scanner.clear(); };
    }
  }, [showScanner, inviteDevice, t]);

  // Керування командами
  const handleCreateTeam = () => { 
      if (newTeamName.trim() === '' || teams.length >= 6) return; 
      const newTeam = { id: generateId('team-'), name: newTeamName.trim(), score: 0 };
      publishGameState({ ...gameState, teams: [...teams, newTeam] }); 
      setNewTeamName(''); 
  };
  const handleDeleteTeam = (teamId) => {
    if (!window.confirm(t('confirmDeleteTeam'))) return;
    const updatedTeams = teams.filter(t => t.id !== teamId);
    const updatedBuzzers = buzzers.filter(b => b.teamId !== teamId);
    publishGameState({ ...gameState, teams: updatedTeams, buzzers: updatedBuzzers });
  };
  const updateScore = (teamId, amount) => { 
      const updatedTeams = teams.map(team => team.id === teamId ? { ...team, score: team.score + amount } : team);
      publishGameState({ ...gameState, teams: updatedTeams }); 
  };
  
  // Керування питаннями
  const handleAddQuestion = () => { if (newQuestionText.trim() === '') return; publishGameState({ ...gameState, questions: [...questions, { id: generateId('q-'), text: newQuestionText.trim() }] }); setNewQuestionText(''); };
  const handleRemoveQuestion = (qid) => { if (window.confirm(t('confirmDeleteQuestion'))) publishGameState({ ...gameState, questions: questions.filter(q => q.id !== qid) }); };
  
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

  const handleClearUsed = () => { if(window.confirm(t('confirmClearUsed'))) publishGameState({...gameState, usedQuestionIds: []}); };
  const handleResetGame = () => { if (window.confirm(t('confirmResetGame'))) { localStorage.removeItem('brainring_host_data'); window.location.reload(); } };
  
  // --- ВИПРАВЛЕНИЙ ІМПОРТ/ЕКСПОРТ ---
  const handleExportQuestions = () => {
      if (!questions.length) return alert(t('noQuestionsToExport'));
      const dataStr = JSON.stringify(questions, null, 2);
      const link = document.createElement('a');
      link.href = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      link.download = 'questions.json';
      link.click();
  };
  
  // Функція кліку по прихованому інпуту
  const triggerImport = () => {
      if (fileInputRef.current) {
          fileInputRef.current.click();
      }
  };

  const handleImportQuestions = (e) => {
      const file = e.target.files[0]; 
      if(!file) return;
      
      const reader = new FileReader();
      reader.onload = (ev) => { 
          try { 
              const q = JSON.parse(ev.target.result); 
              if(Array.isArray(q)) {
                  // Додаємо нові питання до існуючих або замінюємо (тут я замінюю для простоти, але можна об'єднати)
                  if(window.confirm(t('foundQuestionsPrompt', { count: q.length }))) {
                      // Тут ми об'єднуємо старі і нові, генеруючи нові ID для уникнення конфліктів
                      const newQuestionsWithIds = q.map(item => ({
                          id: item.id || generateId('q-'),
                          text: item.text || item // Підтримка і об'єктів {text: "..."} і просто масиву строк
                      }));
                      publishGameState({...gameState, questions: [...questions, ...newQuestionsWithIds]});
                      alert(t('questionsAddedSuccess'));
                  }
              } else {
                  alert(t('fileShouldContainArray'));
              }
          } catch(err) { 
              alert(t('jsonFormatError')); 
          } 
      };
      reader.readAsText(file);
      e.target.value = null; // Скидаємо значення інпуту, щоб можна було вибрати той самий файл знову
  };

  if (!isConnected || !gameId) return <div>{t('loading')}</div>;
  
  return (
    <div>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/">&larr; {t('toHomePage')}</Link>
        <div>
            <button onClick={() => setShowScanner(!showScanner)} style={{ backgroundColor: '#0f2b15ff', marginRight: '10px', border: '1px solid green' }}>{showScanner ? t('close') : t('connect')}</button>
            <button onClick={handleResetGame} style={{ backgroundColor: '#361010ff', border: '1px solid red' }}>{t('reset')}</button>
        </div>
      </nav>
      
      {showScanner && <div style={sectionStyle}><div id="host-qr-scanner" style={{ maxWidth: '300px', margin: 'auto' }}></div></div>}

      <h1>{t('hostPageTitle')}</h1>
      <div style={{ padding: '10px' }}>{t('gameIdLabel')} {gameId}</div>

      <TimerControls gameState={gameState} publishGameState={publishGameState} />

      <div style={{ padding: '10px', border: '3px solid skyblue', borderRadius: '8px', marginBottom: '20px' }}>
          <h3>{t('selectedQuestion')}:</h3>
          {currentQuestionId ? (
              <p style={{ fontSize: '1.5em' }}>
                  {questions.find(q => q.id === currentQuestionId)?.text || t('errorLabel')}
                  {!gameState.isQuestionActive && <span style={{ color: 'red', marginLeft: '10px', fontSize: '0.8em' }}>({t('hiddenLabel')})</span>}
              </p>
          ) : <p>{t('noQuestionSelected')}</p>}
      </div>

      <div style={sectionStyle}>
        <h2>{t('teams')}</h2>
        <div style={{ marginBottom: '15px' }}>
          <input type="text" placeholder={t('newTeamNamePlaceholder')} value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} style={{ padding: '5px', width: '200px' }} />
          <button onClick={handleCreateTeam} style={{ marginLeft: '10px' }}>{t('create')}</button>
        </div>
        {teams.length === 0 ? <p>{t('noTeams')}</p> : (
          <table style={{ width: '100%' }}>
            <thead><tr><th>{t('name')}</th><th>{t('score')}</th><th>{t('time')}</th><th>{t('actions')}</th></tr></thead>
            <tbody>
              {teams.map((team) => {
                const buzzData = buzzers.find(b => b.teamId === team.id);
                return (
                  <tr key={team.id}>
                    <td style={{ maxWidth: '20vw', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><strong>{team.name}</strong></td>
                    <td>
                        <button onClick={() => updateScore(team.id, -1)} style={{ width: '30px' }}>-</button> 
                        <span style={{ margin: '0 10px', fontSize: '1.2em' }}>{team.score}</span> 
                        <button onClick={() => updateScore(team.id, 1)} style={{ width: '30px' }}>+</button>
                    </td>
                    <td>{buzzData ? buzzData.time.toFixed(2) : '-'}</td>
                    <td>
                        <button onClick={() => setShowQrForTeam(team)} style={{ marginRight: '5px' }}>{t('qrCode')}</button>
                        <button onClick={() => handleDeleteTeam(team.id)} style={{ backgroundColor: '#2f1c1cff', color: 'red', border: '1px solid red' }}>{t('delete')}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><h2>{t('questions')}</h2><button onClick={handleAddQuestion} style={{ margin: '5px' }}>{t('add')}</button></div>
        <div>
          <input type="text" value={newQuestionText} onChange={(e) => setNewQuestionText(e.target.value)} style={{ width: '100%', height: '30px', fontSize: '1.2em'}} />
          <br />
          <button onClick={handleExportQuestions} style={{ margin: '5px' }}>{t('export')}</button>
          <button onClick={triggerImport} style={{ margin: '5px', border: '1px solid lightlue' }}>{t('import')}</button>
          <button onClick={handleClearUsed} style={{ margin: '5px' }}>{t('clear')}</button>

          <input 
              type="file" 
              accept=".json" 
              style={{ display: 'none' }} 
              ref={fileInputRef} // Прив'язуємо ref
              onChange={handleImportQuestions} 
          />
        </div>
        

        <ul style={{ maxHeight: '300px', overflowY: 'auto', marginTop: '10px', border: '1px solid #eee' }}>
          {questions.map((q, i) => {
            const isUsed = usedQuestionIds.includes(q.id);
            const isSel = currentQuestionId === q.id;
            return (
                <li key={q.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: isSel ? '#004d70ff' : 'transparent', borderBottom:'1px solid #eee' }}>
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