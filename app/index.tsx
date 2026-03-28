import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av'; // Added for music
import * as Haptics from 'expo-haptics';
import * as Updates from 'expo-updates';
import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function GravityBallTab() {
  const [view, setView] = useState<'menu' | 'game' | 'instructions' | 'settings'>('menu');
  const [highScore, setHighScore] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null); 
  const webViewRef = useRef<WebView>(null);


  useEffect(() => {
    async function loadAndPlayMusic() {
      try {
        const { sound: newSound } = await Audio.Sound.createAsync(
          require('../../assets/audio/bg-music.mp3'), 
          { shouldPlay: true, isLooping: true, volume: 0.5 }
        );
        setSound(newSound);
      } catch (error) {
        console.log("Error loading music:", error);
      }
    }

    loadAndPlayMusic();

   
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);


  useEffect(() => {
    async function checkUpdates() {
      if (__DEV__) return;
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (e) {
        console.log("OTA Check Skipped");
      }
    }
    checkUpdates();
  }, []);

  
  useEffect(() => {
    const loadScore = async () => {
      const saved = await AsyncStorage.getItem('gravity_high_score');
      if (saved) setHighScore(parseInt(saved));
    };
    loadScore();
  }, []);

  const handleMessage = async (event: any) => {
    const data = JSON.parse(event.nativeEvent.data);
    if (data.type === 'HAPTIC_ERROR') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    if (data.type === 'NEW_HIGH_SCORE') {
      await AsyncStorage.setItem('gravity_high_score', data.score.toString());
      setHighScore(data.score);
    }
    if (data.type === 'GO_MENU') setView('menu');
  };

  const MenuButton = ({ title, onPress, secondary = false }: { title: string, onPress: () => void, secondary?: boolean }) => (
    <TouchableOpacity 
      style={[styles.btn, secondary && styles.btnSecondary]} 
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      activeOpacity={0.8}
    >
      <Text style={styles.btnText}>{title}</Text>
    </TouchableOpacity>
  );


  if (view === 'settings') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.subView}>
          <Text style={styles.subTitle}>SYSTEM CONFIG</Text>
          <View style={styles.contentBox}>
            <Text style={styles.contentText}>
              FIRMWARE: DAPS_v1.1.2{"\n"}
              OTA_STATUS: [LINKED]{"\n"}
              UPDATE_ID: {Updates.updateId?.substring(0, 8) || 'LOCAL_DEV'}{"\n"}
              HAPTICS: [FAIL_ONLY]{"\n"}
              AUDIO: [CORE_OS_ACTIVE]
            </Text>
          </View>
          <MenuButton title="BACK TO HQ" onPress={() => setView('menu')} secondary />
        </View>
      </SafeAreaView>
    );
  }


  if (view === 'instructions') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.subView}>
          <Text style={styles.subTitle}>MISSION DATA</Text>
          <View style={styles.contentBox}>
            <Text style={styles.contentText}>
              1. TAP TO FLIP GRAVITY{"\n"}
              2. VELOCITY INCREASES EVERY 5 GATES{"\n"}
              3. DO NOT IMPACT ENERGY BARRIERS
            </Text>
          </View>
          <MenuButton title="BACK TO HQ" onPress={() => setView('menu')} secondary />
        </View>
      </SafeAreaView>
    );
  }

  if (view === 'menu') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.menuContent}>
          <View style={styles.header}>
            <Text style={styles.brandTag}>DAPS // CORE_OS</Text>
            <Text style={styles.logoText}>GRAVITY{"\n"}<Text style={{color: '#63b3ed'}}>BALL</Text></Text>
          </View>

          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>ARCHIVED PEAK SCORE</Text>
            <Text style={styles.scoreValue}>{highScore}</Text>
          </View>

          <View style={styles.navGroup}>
            <MenuButton title="INITIATE MISSION" onPress={() => setView('game')} />
            <MenuButton title="MISSION DATA" onPress={() => setView('instructions')} secondary />
            <MenuButton title="SYSTEM PREFS" onPress={() => setView('settings')} secondary />
          </View>

          <Text style={styles.versionTag}>DAPS TECHNOLOGIES // 2026</Text>
        </View>
      </SafeAreaView>
    );
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
            body { font-family: 'Orbitron', sans-serif; background-color: #0f172a; margin: 0; padding: 0; overflow: hidden; }
            #game-container { width: 100vw; height: 100vh; display: flex; flex-direction: column; }
            .ui-panel { height: 70px; padding: 0 25px; color: #fff; display: flex; justify-content: space-between; align-items: center; background: #1e293b; border-bottom: 3px solid #63b3ed; box-sizing: border-box;}
            canvas { flex: 1; touch-action: none; background-color: #0f172a; }
            .overlay { position: absolute; inset: 0; background: rgba(15, 23, 42, 0.98); display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 10; text-align: center; }
            .hidden { display: none !important; }
            .btn { padding: 1.2rem 3rem; margin-top: 15px; font-size: 1.1rem; font-weight: 700; background: #2563eb; color: white; border: none; font-family: 'Orbitron'; letter-spacing: 2px; }
        </style>
    </head>
    <body>
        <div id="game-container">
            <div class="ui-panel">
                <div style="font-size: 1.5rem; font-weight: 900; color: #63b3ed;">SCORE: <span id="cur-score">0</span></div>
                <div style="text-align: right; color: #f6e05e; font-size: 0.8rem;">PB: <span id="best-score">${highScore}</span></div>
            </div>
            <div style="position: relative; flex: 1; display: flex;">
                <canvas id="game-canvas"></canvas>
                <div id="start-overlay" class="overlay">
                    <h2 style="color: #63b3ed; font-size: 1.8rem; letter-spacing: 4px;">SYSTEM READY</h2>
                    <button onclick="startGame()" class="btn">START</button>
                </div>
                <div id="over-overlay" class="overlay hidden">
                    <h2 style="font-size: 2.2rem; color: #f43f5e;">MISSION FAILED</h2>
                    <p style="font-size: 1.2rem; color: #fff; margin-bottom: 25px;">FINAL SCORE: <span id="final-score">0</span></p>
                    <button onclick="startGame()" class="btn">REBOOT</button>
                    <button onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type: 'GO_MENU'}))" class="btn" style="background: transparent; border: 1px solid #334155; margin-top: 10px;">HQ</button>
                </div>
            </div>
        </div>
        <script>
            const canvas = document.getElementById('game-canvas');
            const ctx = canvas.getContext('2d');
            let GAME_STATE = 'waiting', score = 0, currentBest = ${highScore}, obstacles = [], ball = { x: 0, y: 0, wall: 'left', moving: false }, gameSpeed = 5.0;
            const WALL_W = 20, BALL_R = 12, SPAWN_GAP = 180, OBS_W_PERCENT = 0.62;

            function init() {
                canvas.width = window.innerWidth;
                canvas.height = canvas.offsetHeight;
                ball.y = canvas.height * 0.45;
                ball.x = WALL_W + BALL_R;
                render();
                window.addEventListener('touchstart', () => { if (GAME_STATE === 'playing') switchWall(); });
            }

            function startGame() {
                score = 0; obstacles = []; gameSpeed = 5.0; ball.wall = 'left'; ball.x = WALL_W + BALL_R; ball.moving = false;
                document.getElementById('cur-score').innerText = '0';
                GAME_STATE = 'playing';
                document.getElementById('start-overlay').classList.add('hidden');
                document.getElementById('over-overlay').classList.add('hidden');
                loop();
            }

            function switchWall() {
                if (ball.moving) return;
                ball.moving = true;
                const targetX = ball.wall === 'left' ? canvas.width - WALL_W - BALL_R : WALL_W + BALL_R;
                function move() {
                    const step = ball.wall === 'left' ? 24 : -24;
                    ball.x += step;
                    if ((step > 0 && ball.x >= targetX) || (step < 0 && ball.x <= targetX)) {
                        ball.x = targetX; ball.wall = ball.wall === 'left' ? 'right' : 'left'; ball.moving = false;
                    } else if (GAME_STATE === 'playing') requestAnimationFrame(move);
                }
                move();
            }

            function loop() { if (GAME_STATE !== 'playing') return; update(); render(); requestAnimationFrame(loop); }

            function update() {
                if (obstacles.length === 0 || obstacles[obstacles.length-1].y < canvas.height - SPAWN_GAP) {
                    obstacles.push({ y: canvas.height, side: Math.random() > 0.5 ? 'left' : 'right', passed: false });
                }
                for (let i = obstacles.length - 1; i >= 0; i--) {
                    let o = obstacles[i]; o.y -= gameSpeed;
                    const obsWidth = canvas.width * OBS_W_PERCENT;
                    const isHittingY = (ball.y + BALL_R > o.y && ball.y - BALL_R < o.y + 20);
                    let isHittingX = (o.side === 'left') ? (ball.x - BALL_R < WALL_W + obsWidth) : (ball.x + BALL_R > canvas.width - WALL_W - obsWidth);
                    if (isHittingY && isHittingX) {
                        GAME_STATE = 'over';
                        window.ReactNativeWebView.postMessage(JSON.stringify({type: 'HAPTIC_ERROR'}));
                        if (score > currentBest) window.ReactNativeWebView.postMessage(JSON.stringify({type: 'NEW_HIGH_SCORE', score: score}));
                        document.getElementById('final-score').innerText = score;
                        document.getElementById('over-overlay').classList.remove('hidden');
                    }
                    if (!o.passed && o.y < ball.y) { o.passed = true; score++; document.getElementById('cur-score').innerText = score; if (score % 5 === 0) gameSpeed += 0.4; }
                    if (o.y < -50) obstacles.splice(i, 1);
                }
            }

            function render() {
                ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#334155'; ctx.fillRect(0, 0, WALL_W, canvas.height); ctx.fillRect(canvas.width - WALL_W, 0, WALL_W, canvas.height);
                ctx.fillStyle = '#9333ea'; const obsWidth = canvas.width * OBS_W_PERCENT;
                obstacles.forEach(o => { if (o.side === 'left') ctx.fillRect(WALL_W, o.y, obsWidth, 20); else ctx.fillRect(canvas.width - WALL_W - obsWidth, o.y, obsWidth, 20); });
                ctx.beginPath(); ctx.fillStyle = '#f6e05e'; ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2); ctx.fill();
            }
            init();
        </script>
    </body>
    </html>
  `;

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        onMessage={handleMessage}
        style={{ flex: 1, backgroundColor: '#0f172a' }}
        javaScriptEnabled={true}
        scrollEnabled={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  menuContent: { flex: 1, padding: 30, justifyContent: 'space-around' },
  header: { marginTop: 40 },
  brandTag: { color: '#63b3ed', fontSize: 12, letterSpacing: 4, fontWeight: 'bold' },
  logoText: { color: '#fff', fontSize: 60, fontWeight: '900', lineHeight: 55, marginTop: 10 },
  scoreContainer: { backgroundColor: '#1e293b', padding: 25, borderLeftWidth: 4, borderLeftColor: '#f6e05e' },
  scoreLabel: { color: '#64748b', fontSize: 10, letterSpacing: 2, marginBottom: 5 },
  scoreValue: { color: '#f6e05e', fontSize: 50, fontWeight: 'bold' },
  navGroup: { gap: 12 },
  btn: { backgroundColor: '#2563eb', padding: 20, borderRadius: 2, alignItems: 'center' },
  btnSecondary: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  btnText: { color: '#fff', fontSize: 14, fontWeight: 'bold', letterSpacing: 3 },
  versionTag: { color: '#334155', fontSize: 10, textAlign: 'center' },
  subView: { flex: 1, padding: 30, justifyContent: 'center' },
  subTitle: { color: '#63b3ed', fontSize: 24, fontWeight: '900', marginBottom: 20, letterSpacing: 2 },
  contentBox: { backgroundColor: '#1e293b', padding: 20, marginBottom: 40 },
  contentText: { color: '#94a3b8', fontSize: 16, lineHeight: 28, letterSpacing: 1 }
});
