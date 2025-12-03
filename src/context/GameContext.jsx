import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import mqtt from 'mqtt';

const MQTT_BROKER_URL = 'wss://broker.hivemq.com:8884/mqtt';
const STORAGE_KEY = 'brainring_host_data';

const GameContext = createContext();

const initialGameState = {
  teams: [],
  questions: [],
  currentQuestionId: null,
  isQuestionActive: false, 
  usedQuestionIds: [],    
  timerDuration: 60,
  timerStartTime: null,
  timerRunning: false,
  buzzers: [],
};

export function GameProvider({ children }) {
  const [gameState, setGameState] = useState(initialGameState);
  const [isConnected, setIsConnected] = useState(false);
  const [gameId, setGameId] = useState(null);
  const [isHost, setIsHost] = useState(false); 
  
  const mqttClientRef = useRef(null);
  const stateTopicRef = useRef(null);
  const actionTopicRef = useRef(null);
  const gameStateRef = useRef(gameState);
  
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    if (isHost && gameId) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ gameId, gameState }));
    }
  }, [gameState, gameId, isHost]);

  const waitForInvitation = useCallback((onGameIdReceived) => {
    const setupId = 'setup-' + Math.random().toString(16).slice(2, 8);
    const setupTopic = `brainring/setup/${setupId}`;
    const client = mqtt.connect(MQTT_BROKER_URL);
    client.on('connect', () => client.subscribe(setupTopic));
    client.on('message', (t, m) => { if(t===setupTopic){ try{const d=JSON.parse(m.toString()); if(d.gameId){ client.end(); onGameIdReceived(d.gameId); }}catch(e){} } });
    return { setupId, cancel: () => client.end() };
  }, []);

  const inviteDevice = useCallback((setupId) => {
    if (mqttClientRef.current && isHost && gameId) {
      mqttClientRef.current.publish(`brainring/setup/${setupId}`, JSON.stringify({ gameId }), { qos: 1 });
      return true;
    }
    return false;
  }, [isHost, gameId]);

  const connectToGame = useCallback((gameIdToUse, options = { host: false }) => {
    if (mqttClientRef.current) return;

    let startState = initialGameState;
    if (options.host) {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.gameId === gameIdToUse && parsed.gameState) {
            startState = parsed.gameState;
            if (startState.timerRunning) {
               startState.timerRunning = false;
               startState.timerStartTime = null;
            }
          }
        } catch (e) { console.error(e); }
      }
    }

    setGameState(startState);
    gameStateRef.current = startState;
    setIsHost(options.host);
    setGameId(gameIdToUse);
    
    const stateTopic = `brainring/game/${gameIdToUse}/state`;
    const actionTopic = `brainring/game/${gameIdToUse}/action`;
    stateTopicRef.current = stateTopic;
    actionTopicRef.current = actionTopic;

    const client = mqtt.connect(MQTT_BROKER_URL);
    mqttClientRef.current = client;

    client.on('connect', () => {
      console.log('MQTT Connected!');
      setIsConnected(true);
      client.subscribe([stateTopic, actionTopic]);
      if (options.host) {
        const message = JSON.stringify(startState);
        client.publish(stateTopic, message, { retain: true, qos: 1 });
      }
    });

    client.on('message', (topic, message) => {
      const messageString = message.toString();
      if (topic === stateTopicRef.current) {
        try { setGameState(JSON.parse(messageString)); } catch (e) {}
      }
      if (topic === actionTopicRef.current && options.host) {
        try { handlePlayerAction(JSON.parse(messageString)); } catch (e) {}
      }
    });
    client.on('close', () => setIsConnected(false));
  }, []);

  const handlePlayerAction = (action) => {
    if (action.type === 'BUZZ') {
      const currentState = gameStateRef.current; 
      const alreadyBuzzed = currentState.buzzers.some(b => b.teamId === action.teamId);
      
      if (currentState.timerRunning && !alreadyBuzzed) {
        const newBuzzer = { teamId: action.teamId, time: action.time };
        
        // Створюємо новий список
        const newBuzzersList = [...currentState.buzzers, newBuzzer].sort((a, b) => b.time - a.time);
        
        // --- НОВА ЛОГІКА: АВТОСТОП ---
        let newTimerRunning = currentState.timerRunning;
        
        // Якщо кількість тих, хто натиснув == кількості команд -> СТОП
        if (newBuzzersList.length >= currentState.teams.length && currentState.teams.length > 0) {
            console.log('Всі команди натиснули. Зупиняємо таймер.');
            newTimerRunning = false;
        }
        // -----------------------------

        const newState = {
          ...currentState,
          timerRunning: newTimerRunning, // Оновлюємо статус таймера
          buzzers: newBuzzersList
        };
        
        publishGameState(newState);
      }
    }
  };

  const publishGameState = (newGameState) => {
    setGameState(newGameState);
    gameStateRef.current = newGameState;
    if (mqttClientRef.current && mqttClientRef.current.connected) {
      const message = JSON.stringify(newGameState);
      mqttClientRef.current.publish(stateTopicRef.current, message, { retain: true, qos: 1 });
    }
  };
  
  const publishAction = (action) => {
    if (mqttClientRef.current && mqttClientRef.current.connected) {
      const message = JSON.stringify(action);
      mqttClientRef.current.publish(actionTopicRef.current, message, { qos: 1 });
    }
  };

  const value = { gameState, gameId, isConnected, isHost, connectToGame, publishGameState, publishAction, inviteDevice, waitForInvitation };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  return useContext(GameContext);
}