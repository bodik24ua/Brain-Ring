import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react'; 
import { useGame } from '../context/GameContext'; 

const RESULTS_STORAGE_KEY = 'brainring_results_data';

function LiveTimer({ timerDuration, timerStartTime, timerRunning, hasBuzzed, buzzTime }) {
  const [timeLeft, setTimeLeft] = useState(timerDuration);
  useEffect(() => {
    if (!timerRunning || hasBuzzed) { setTimeLeft(hasBuzzed ? buzzTime : timerDuration); return; }
    const interval = setInterval(() => {
      const elapsed = (Date.now() - timerStartTime) / 1000;
      const remaining = Math.max(0, timerDuration - elapsed);
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 100); 
    return () => clearInterval(interval);
  }, [timerDuration, timerStartTime, timerRunning, hasBuzzed, buzzTime]);
  return <div style={{ fontSize: '2.5em', color: timerRunning ? 'red' : 'black', margin: '15px 0' }}>{timeLeft.toFixed(1)}</div>;
}

function ResultsPage() {
  const { gameState, isConnected, gameId, connectToGame, waitForInvitation } = useGame();
  const { teams, timerDuration, timerStartTime, timerRunning, buzzers, currentQuestionId, isQuestionActive, questions } = gameState;
  const [manualGameId, setManualGameId] = useState('');
  const [setupInfo, setSetupInfo] = useState(null);

  // Відновлення з LocalStorage
  useEffect(() => {
    if (!gameId) {
      const saved = localStorage.getItem(RESULTS_STORAGE_KEY);
      if (saved) {
          try { const p = JSON.parse(saved); if(p.gameId) { connectToGame(p.gameId, { host: false }); return; } } catch(e){}
      }
      const info = waitForInvitation((gId) => connectToGame(gId, { host: false }));
      setSetupInfo(info);
      return () => info.cancel();
    }
  }, [gameId, waitForInvitation, connectToGame]);

  useEffect(() => { if (gameId) localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify({ gameId })); }, [gameId]);

  const handleDisconnect = () => { if(window.confirm('Відключитися?')) { localStorage.removeItem(RESULTS_STORAGE_KEY); window.location.reload(); } };
  const handleConnect = () => { if (manualGameId.trim() === '') return; connectToGame(manualGameId.trim(), { host: false }); };

  if (!gameId) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <nav><Link to="/">&larr; На головну</Link></nav>
        <h1>Екран Результатів</h1>
        <div style={{ margin: '40px 0', padding: '20px', border: '2px dashed #ccc', borderRadius: '10px' }}>
          <h3>Щоб підключити цей екран:</h3>
          <p>Ведучий має відсканувати цей код:</p>
          {setupInfo && (<div style={{ background: 'white', padding: '10px', display: 'inline-block' }}><QRCodeSVG value={JSON.stringify({ setupId: setupInfo.setupId })} size={256} /></div>)}
        </div>
        <div><p>Або ID вручну:</p><input type="text" placeholder="game-xxxxxx" value={manualGameId} onChange={(e) => setManualGameId(e.target.value)} /><button onClick={handleConnect}>Підключитися</button></div>
      </div>
    );
  }

  // --- ОНОВЛЕНА ЛОГІКА МЕДАЛЕЙ (СПРАВЕДЛИВА) ---
  const getRankIcon = (currentTeam) => {
    // Рахуємо, скільки команд мають строго БІЛЬШЕ балів, ніж поточна
    const teamsWithMorePoints = teams.filter(t => t.score > currentTeam.score);
    const rank = teamsWithMorePoints.length + 1;

    if (rank === 1) return '🥇'; // Якщо ніхто не має більше = 1 місце
    if (rank === 2) return '🥈'; // Якщо 1 команда має більше = 2 місце
    if (rank === 3) return '🥉'; // Якщо 2 команди мають більше = 3 місце
    return ''; // 4+ місце
  };
  // ---------------------------------------------

  const displayTeams = [...teams].sort((a, b) => {
    const buzzA = buzzers.find(buz => buz.teamId === a.id);
    const buzzB = buzzers.find(buz => buz.teamId === b.id);
    if (buzzA && buzzB) return buzzB.time - buzzA.time;
    if (buzzA && !buzzB) return -1;
    if (!buzzA && buzzB) return 1;
    return b.score - a.score;
  });
  const speakerTeamId = buzzers.length > 0 ? buzzers[0].teamId : null;
  const currentQuestionText = questions.find(q => q.id === currentQuestionId)?.text;

  if (!isConnected || !gameState) return <div>Підключення...</div>;

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><Link to="/">&larr; На головну</Link><button onClick={handleDisconnect}>Відключитися</button></div>
      <h1>Результати</h1>
      
      <div style={{ margin: '20px auto', padding: '20px', maxWidth: '800px', border: '2px solid #333', borderRadius: '10px', backgroundColor: '#1a1a1a', fontSize: '1.5em', fontWeight: 'bold' }}>
          {isQuestionActive && currentQuestionText ? <span>{currentQuestionText}</span> : <span style={{ color: '#000000ff' }}>Увага на екран...</span>}
      </div>

      <LiveTimer timerDuration={timerDuration} timerStartTime={timerStartTime} timerRunning={timerRunning} hasBuzzed={false} buzzTime={0} />
      <hr />
      <table style={{ width: '100%', maxWidth: '900px', margin: 'auto', borderCollapse: 'collapse', fontSize: '1.4em' }}>
        <thead><tr style={{ backgroundColor: '#242424' }}><th>Ранг</th><th>Команда</th><th>Бали</th><th>Час</th></tr></thead>
        <tbody>
          {displayTeams.length === 0 ? (<tr><td colSpan="4">Очікування...</td></tr>) : (
            displayTeams.map((team) => {
              const buzzData = buzzers.find(b => b.teamId === team.id);
              const isSpeaker = team.id === speakerTeamId;
              
              // Передаємо весь об'єкт команди, щоб перевірити її бали
              const medal = getRankIcon(team);

              return (
                <tr key={team.id} style={{ backgroundColor: isSpeaker ? '#27754dff' : 'transparent', transition: 'background-color 0.3s' }}>
                  <td style={{ border: '1px solid #ccc' }}>{medal}</td>
                  <td style={{ border: '1px solid #ccc', textAlign: 'left', padding: '10px' }}>{isSpeaker && <span style={{ marginRight: '10px' }}>🎤</span>} {team.name}</td>
                  <td style={{ border: '1px solid #ccc', fontWeight: 'bold' }}>{team.score}</td>
                  <td style={{ border: '1px solid #ccc' }}>{buzzData ? buzzData.time.toFixed(2) : '-'}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ResultsPage;