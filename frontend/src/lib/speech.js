import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

const native = Capacitor.isNativePlatform();

export async function stopSpeaking() {
  if (native) { try { await TextToSpeech.stop(); } catch {} }
  else window.speechSynthesis?.cancel();
}

export async function speak(text, lang = 'en-IN') {
  if (!text) return;
  await stopSpeaking();
  if (native) {
    await TextToSpeech.speak({ text, lang, rate: 0.95, pitch: 1, volume: 1 });
  } else {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }
}

export async function listenOnce(lang = 'en-IN') {
  if (native) {
    const perm = await SpeechRecognition.checkPermissions();
    if (perm.speechRecognition !== 'granted') {
      await SpeechRecognition.requestPermissions();
    }
    const res = await SpeechRecognition.start({
      language: lang, maxResults: 1, popup: false, partialResults: false,
    });
    return res.matches?.[0] || '';
  }
  return new Promise((resolve, reject) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return reject(new Error('Speech recognition not supported'));
    const r = new SR();
    r.lang = lang;
    r.interimResults = false;
    r.onresult = (e) => resolve(e.results[0][0].transcript);
    r.onerror = (e) => reject(new Error(e.error));
    r.onend = () => resolve('');
    r.start();
  });
}