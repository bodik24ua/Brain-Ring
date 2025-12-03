import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QRCodeSVG } from 'qrcode.react'; 
import { useGame } from '../context/GameContext'; 

const PLAYER_STORAGE_KEY = 'brainring_player_data';

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
  return <div style={{ fontSize: '3em', color: (timerRunning && !hasBuzzed) ? 'red' : 'black', margin: '20px 0' }}>{timeLeft.toFixed(1)}</div>;
}

function BuzzerButton({ gameState, teamId, publishAction }) {
    const { timerRunning, timerStartTime, timerDuration, buzzers } = gameState;
    const hasBuzzed = buzzers.some(b => b.teamId === teamId);
    const isActive = timerRunning && !hasBuzzed;
    const handleBuzz = () => {
      if (!isActive) return;
      const elapsed = (Date.now() - timerStartTime) / 1000;
      const remainingTime = timerDuration - elapsed;
      publishAction({ type: 'BUZZ', teamId: teamId, time: remainingTime });
    };
    let buttonText = 'PUSH!'; if (!timerRunning) buttonText = 'wait...'; if (hasBuzzed) buttonText = 'DONE!';
    return (
      <button onClick={handleBuzz} disabled={!isActive} style={{ width: '300px', height: '300px', borderRadius: '50%', fontSize: '2.5em', fontWeight: 'bold', color: 'white', backgroundColor: isActive ? '#ff0000' : '#888888', border: '10px solid #333' }}>{buttonText}</button>
    );
}

function PlayerPage() {
  const { gameState, isConnected, gameId, connectToGame, publishAction, waitForInvitation } = useGame();
  const { teams, buzzers } = gameState;

  const [scannedData, setScannedData] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showMyQrMode, setShowMyQrMode] = useState(false);
  const [setupInfo, setSetupInfo] = useState(null);

  // Відновлення з LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem(PLAYER_STORAGE_KEY);
    if (saved) {
        try { const p = JSON.parse(saved); if(p && p.gameId) setScannedData(p); } catch(e){}
    }
  }, []);

  // Збереження в LocalStorage
  useEffect(() => {
    if (scannedData) {
        localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(scannedData));
    }
  }, [scannedData]);

  // Функція повного виходу (очищає LS)
  const handleExitGame = () => {
      if (window.confirm('Вийти з гри та очистити дані?')) {
          localStorage.removeItem(PLAYER_STORAGE_KEY);
          setScannedData(null);
          window.location.reload(); 
      }
  };

  useEffect(() => {
    if (showMyQrMode && !gameId) {
        const info = waitForInvitation((gId) => { setScannedData({ gameId: gId, teamId: null }); });
        setSetupInfo(info);
        return () => info.cancel();
    }
  }, [showMyQrMode, gameId, waitForInvitation]);

  useEffect(() => {
    if (scannedData && !isConnected && !gameId) {
      connectToGame(scannedData.gameId, { host: false });
    }
  }, [scannedData, isConnected, gameId, connectToGame]);

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner('qr-reader-container', { fps: 10, qrbox: { width: 250, height: 250 } }, false);
      scanner.render((decodedText) => {
        try {
          const data = JSON.parse(decodedText);
          if (data.gameId && data.teamId) { setScannedData(data); setShowScanner(false); }
        } catch (e) {}
      }, () => {});
      return () => { if (scanner && scanner.getState() === 2) scanner.clear(); };
    }
  }, [showScanner]);

  
  // Стан 1: Вибір методу підключення
  if (!scannedData && !gameId) {
    return (
      <div>
        <nav><Link to="/">&larr; На головну</Link></nav>
        <h1>Сторінка Гравця</h1>
        <h2>Приєднатися до гри</h2>
        
        {!showScanner && !showMyQrMode && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
                <button onClick={() => setShowScanner(true)} style={{ padding: '20px', fontSize: '1.2em' }}>
                    📷 Сканувати QR команди
                </button>
                <button onClick={() => setShowMyQrMode(true)} style={{ padding: '20px', fontSize: '1.2em' }}>
                    📱 Показати мій QR Ведучому
                </button>
            </div>
        )}

        {showScanner && (
            <div>
                <button onClick={() => setShowScanner(false)}>Скасувати</button>
                <div id="qr-reader-container" style={{ width: '400px', margin: '20px auto' }}></div>
            </div>
        )}

        {showMyQrMode && (
            <div style={{ textAlign: 'center', border: '2px dashed #ccc', padding: '20px', margin: '20px' }}>
                <h3>Покажіть це Ведучому</h3>
                {setupInfo && (
                    <QRCodeSVG style={{ padding: '15px', background: '#fff' }} value={JSON.stringify({ setupId: setupInfo.setupId })} size={256} />
                )}
                <br />
                <button onClick={() => setShowMyQrMode(false)} style={{ marginTop: '20px' }}>Скасувати</button>
            </div>
        )}
      </div>
    );
  }

  if (!isConnected || !gameState) return <div style={{padding:'20px'}}><h2>Підключення...</h2></div>;

  // Стан 2: Вибір команди (якщо gameId є, а teamId немає)
  if (scannedData && !scannedData.teamId) {
      return (
          <div style={{ padding: '20px', textAlign: 'center' }}>
              <button onClick={handleExitGame} style={{ float: 'right', fontSize: '0.8em', background: '#8a3c3cff' }}>Вийти</button>
              <h1>Ви у грі! (ID: {gameId})</h1>
              <h2>Оберіть свою команду:</h2>
              
              {teams.length === 0 ? (
                  <p>Ведучий ще не створив жодної команди...</p>
              ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px', margin: '0 auto' }}>
                      {teams.map(team => (
                          <button 
                              key={team.id}
                              onClick={() => setScannedData({ ...scannedData, teamId: team.id })}
                              style={{ padding: '15px', fontSize: '1.3em', backgroundColor: '#1a1a1a', border: '2px solid #ccc', borderRadius: '8px', cursor: 'pointer' }}
                          >
                              {team.name}
                          </button>
                      ))}
                  </div>
              )}
              
              <hr style={{ margin: '30px 0'}} />
              <p>Або відскануйте QR команди:</p>
              <button onClick={() => { setScannedData(null); setShowScanner(true); }}>Сканувати QR</button>
          </div>
      )
  }

  // Стан 3: У грі! (Команда обрана)
  const myBuzz = buzzers.find(b => b.teamId === scannedData.teamId);
  const hasBuzzed = !!myBuzz;
  const myTeam = teams.find(team => team.id === scannedData.teamId);
  const currentQuestionText = gameState.questions.find(q => q.id === gameState.currentQuestionId)?.text;

  // --- ВАЖЛИВО: Якщо команду видалили ---
  if (!myTeam) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', border: '4px solid red', borderRadius: '10px', margin: '20px', backgroundColor: '#fff0f0' }}>
            <h2 style={{ color: 'red' }}>Вашу команду видалено!</h2>
            <p>Ведучий видалив цю команду з гри.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                <button 
                    onClick={() => setScannedData({ ...scannedData, teamId: null })}
                    style={{ padding: '15px', fontSize: '1.1em' }}
                >
                    Обрати іншу команду
                </button>
                
                <button 
                    onClick={handleExitGame} 
                    style={{ padding: '15px', fontSize: '1.1em', backgroundColor: '#ff4444', color: 'white', border: 'none', borderRadius: '5px' }}
                >
                    Вийти повністю (Очистити)
                </button>
            </div>
        </div>
      );
  }

  return (
    <div style={{padding: '20px', minHeight: '100vh', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
         <h3>{myTeam.name}</h3>
         <button onClick={handleExitGame} style={{ fontSize: '0.8em', background:'#973030ff', border:'1px solid red', padding: '5px' }}>Вийти</button>
      </div>

      <div style={{ minHeight: '60px', margin: '10px 0', padding: '10px', border: '1px solid #ccc', borderRadius: '8px', background: '#1a1a1a' }}>
          {gameState.timerRunning && currentQuestionText ? <h3>{currentQuestionText}</h3> : <p style={{color:'#888'}}>Очікуйте на питання...</p>}
      </div>
      
      <LiveTimer timerDuration={gameState.timerDuration} timerStartTime={gameState.timerStartTime} timerRunning={gameState.timerRunning} hasBuzzed={hasBuzzed} buzzTime={myBuzz ? myBuzz.time : 0} />
      <BuzzerButton gameState={gameState} teamId={scannedData.teamId} publishAction={publishAction} />
      
      <hr style={{ margin: '30px 0' }} />
      
      <table style={{ width: '100%', maxWidth: '800px', margin: '0 auto', borderCollapse: 'collapse' }}>
        <thead><tr style={{ backgroundColor: '#707070ff' }}><th>Команда</th><th>Бали</th><th>Час</th></tr></thead>
        <tbody>
          {teams.map((team) => {
            const buzzData = buzzers.find(b => b.teamId === team.id);
            return (
              <tr key={team.id} style={{ fontWeight: team.id === scannedData.teamId ? 'bold' : 'normal' }}>
                <td style={{ border: '1px solid #ccc' }}>{team.name}</td>
                <td style={{ border: '1px solid #ccc' }}>{team.score}</td>
                <td style={{ border: '1px solid #ccc' }}>{buzzData ? buzzData.time.toFixed(2) : '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ marginTop: '20px' }}><button onClick={() => setScannedData({ ...scannedData, teamId: null })} style={{ fontSize: '0.8em', color: '#555' }}>Змінити команду</button></div>
    </div>
  );
}

export default PlayerPage;