import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { speak, stopSpeaking, listenOnce } from '../lib/speech';

const SELECTOR =
  'button, a, input, select, textarea, [role="button"], [role="link"], [aria-label], img[alt], h1, h2, h3';

const isVisible = (el) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth;
};

function getLabel(el) {
  const tag = el.tagName.toLowerCase();
  const itype = (el.getAttribute('type') || '').toLowerCase();
  const isField = tag === 'input' || tag === 'textarea' || tag === 'select';

  let base = el.getAttribute('aria-label') || el.getAttribute('alt') || '';
  if (!base && isField) base = el.labels?.[0]?.innerText?.trim() || el.placeholder || '';
  if (!base) base = el.innerText?.trim().replace(/\s+/g, ' ').slice(0, 150) || '';
  if (!base) return '';

  const parts = [base];
  if (tag === 'input' && itype === 'checkbox') parts.push(el.checked ? 'checkbox, checked' : 'checkbox, not checked');
  else if (tag === 'input' && itype === 'date') parts.push('date field');
  else if (tag === 'select') parts.push('dropdown');
  else if (isField) parts.push('text field');
  else if (tag === 'button' || el.getAttribute('role') === 'button') parts.push('button');
  else if (tag === 'a') parts.push('link');

  if (isField && itype !== 'checkbox' && el.value) parts.push(`value ${el.value}`);
  const expanded = el.getAttribute('aria-expanded');
  if (expanded) parts.push(expanded === 'true' ? 'expanded' : 'collapsed');
  if (el.disabled) parts.push('disabled');
  return parts.join(', ');
}

const PATIENT_COMMANDS = [
  { keys: ['my appointment', 'appointments', 'अपॉइंटमेंट'], route: '/my-appointments', say: 'Opening your appointments' },
  { keys: ['prescription', 'प्रिस्क्रिप्शन', 'पर्ची'], route: '/my-prescriptions', say: 'Opening your prescriptions' },
  { keys: ['queue', 'कतार'], route: '/live-queue', say: 'Opening live queue' },
  { keys: ['reminder', 'रिमाइंडर'], route: '/reminders', say: 'Opening reminders' },
  { keys: ['profile', 'प्रोफाइल'], route: '/profile', say: 'Opening your profile' },
  { keys: ['ai chat', 'chat', 'चैट'], route: '/ai-chat', say: 'Opening AI chat' },
  { keys: ['book', 'doctor', 'डॉक्टर', 'डाॅक्टर'], route: '/doctors', say: 'Opening doctor list' },
  { keys: ['home', 'होम'], route: '/home', say: 'Opening home' },
];

const DOCTOR_COMMANDS = [
  { keys: ['appointment', 'अपॉइंटमेंट'], route: '/doctor-appointments', say: 'Opening appointments' },
  { keys: ['prescription', 'प्रिस्क्रिप्शन'], route: '/doctor-prescriptions', say: 'Opening prescriptions' },
  { keys: ['queue', 'कतार'], route: '/doctor-live-queue', say: 'Opening live queue' },
  { keys: ['review', 'रिव्यू'], route: '/doctor-reviews', say: 'Opening reviews' },
  { keys: ['profile', 'प्रोफाइल'], route: '/doctor-profile', say: 'Opening your profile' },
  { keys: ['dashboard', 'home', 'होम'], route: '/doctor-dashboard', say: 'Opening dashboard' },
];

function getCommands() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.role === 'doctor' ? DOCTOR_COMMANDS : PATIENT_COMMANDS;
  } catch {
    return PATIENT_COMMANDS;
  }
}

// Works with React-controlled inputs
function setNativeValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

const isoDate = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('en-CA');
};

function parseTime(t) {
  const m = t.match(/(\d{1,2})(?:\s*[:.]\s*|\s+)?(\d{2})?\s*(a\.?m\.?|p\.?m\.?)?/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] || '00';
  const ap = m[3]?.toLowerCase();
  if (ap?.startsWith('p') && h < 12) h += 12;
  if (ap?.startsWith('a') && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${min}`;
}

function findByWords(text) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const list = [...document.querySelectorAll('button, a, [role="button"]')]
    .filter((el) => !el.closest('[data-voice-ignore]') && isVisible(el))
    .map((el) => ({ el, label: getLabel(el).toLowerCase() }));
  return (
    list.find((x) => x.label.includes(text))?.el ||
    list.find((x) => words.every((w) => x.label.includes(w)))?.el ||
    null
  );
}

export default function VoiceAssistant() {
  const navigate = useNavigate();
  const [on, setOn] = useState(false);
  const [listening, setListening] = useState(false);
  const [lang, setLang] = useState('en-IN');
  const last = useRef('');
  const touchedAt = useRef(0);
  const armed = useRef({ el: null, at: 0 });
  const bypass = useRef(false);

  const press = (el) => {
    bypass.current = true;
    el.click();
    bypass.current = false;
  };

  // Mouse hover / keyboard focus reading (touch is handled by the click logic below)
  const readTarget = useCallback((e) => {
    if (Date.now() - touchedAt.current < 800) return;
    const el = e.target.closest?.(SELECTOR);
    if (!el || el.closest('[data-voice-ignore]')) return;
    const text = getLabel(el);
    if (!text || text === last.current) return;
    last.current = text;
    speak(text, lang);
  }, [lang]);

  useEffect(() => {
    if (!on) return;
    document.addEventListener('mouseover', readTarget);
    document.addEventListener('focusin', readTarget);
    return () => {
      document.removeEventListener('mouseover', readTarget);
      document.removeEventListener('focusin', readTarget);
    };
  }, [on, readTarget]);

  // Touch: first tap reads, second tap on the same item activates
  useEffect(() => {
    if (!on) return;
    const onTouch = () => { touchedAt.current = Date.now(); };
    const onClick = (e) => {
      if (bypass.current) return;
      if (Date.now() - touchedAt.current > 800) return; // mouse/keyboard: normal click
      const el = e.target.closest?.(SELECTOR);
      if (!el || el.closest('[data-voice-ignore]')) return;
      const text = getLabel(el);
      if (!text) return;
      const a = armed.current;
      if (a.el === el && Date.now() - a.at < 5000) {
        armed.current = { el: null, at: 0 };
        return; // second tap: let it through
      }
      e.preventDefault();
      e.stopPropagation();
      armed.current = { el, at: Date.now() };
      last.current = text;
      const actionable = el.matches('button, a, [role="button"], [role="link"], input[type="checkbox"]');
      speak(actionable ? `${text}. Double tap to activate.` : text, lang);
    };
    document.addEventListener('touchstart', onTouch, { passive: true, capture: true });
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('touchstart', onTouch, true);
      document.removeEventListener('click', onClick, true);
    };
  }, [on, lang]);

  // Announce popups, success messages and errors automatically
  useEffect(() => {
    if (!on) return;
    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          const el = n.matches?.('[data-voice-announce]') ? n : n.querySelector?.('[data-voice-announce]');
          const msg = el?.getAttribute('data-voice-announce');
          if (msg) speak(msg, lang);
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [on, lang]);

  const readScreen = () => {
    const parts = [...document.querySelectorAll('h1, h2, h3, button, [data-voice-card]')]
      .filter((el) => !el.closest('[data-voice-ignore]') && isVisible(el))
      .filter((el) => el.matches('[data-voice-card]') || !el.closest('[data-voice-card]'))
      .slice(0, 20)
      .map(getLabel)
      .filter(Boolean);
    speak('On this screen: ' + parts.join('. '), lang);
  };

  const handleCommand = (raw) => {
    const t = (raw || '').toLowerCase().trim();
    if (!t) return speak("Sorry, I didn't hear anything. Tap the microphone and try again.", lang);

    if (t.includes('stop') || t.includes('रुको')) return stopSpeaking();
    if (t.includes('read') || t.includes('पढ़')) return readScreen();
    if (t.includes('back') || t.includes('वापस')) { speak('Going back', lang); return navigate(-1); }

    // Policy screen
    if (t.includes('agree') || t.includes('consent') || t.includes('सहमत')) {
      const box = document.querySelector('input[type="checkbox"]');
      if (box) {
        if (!box.checked) press(box);
        return speak('Consent given. Now say accept to continue.', lang);
      }
    }
    if (t.includes('accept') || t.includes('स्वीकार')) {
      const btn = [...document.querySelectorAll('button')].find((b) => /accept/i.test(b.innerText));
      if (btn) {
        if (btn.disabled) return speak('Please say I agree first.', lang);
        press(btn);
        return speak('Accepted', lang);
      }
    }

    // Booking popup: confirm
    const confirmBtn = document.querySelector('[data-voice="confirm"]');
    if (confirmBtn && /confirm|submit|send request|request appointment|पक्का/.test(t)) {
      if (confirmBtn.disabled) return speak('Please choose a date and a time slot first.', lang);
      return press(confirmBtn);
    }

    // Booking popup: date
    const dateInput = document.querySelector('input[type="date"]');
    if (dateInput && /today|tomorrow|आज|कल/.test(t)) {
      const tomorrow = /tomorrow|कल/.test(t);
      setNativeValue(dateInput, isoDate(tomorrow ? 1 : 0));
      speak(`Date set to ${tomorrow ? 'tomorrow' : 'today'}. Checking available slots.`, lang);
      setTimeout(() => {
        const n = [...document.querySelectorAll('[data-voice="slot"]')].filter((b) => !b.disabled).length;
        speak(n ? `${n} slots available. Say first slot, or say a time.` : 'No slots available on that day. Try another day.', lang);
      }, 1800);
      return;
    }

    // Booking popup: slot
    const slots = [...document.querySelectorAll('[data-voice="slot"]')];
    if (slots.length && /slot|time|first|earliest|स्लॉट/.test(t)) {
      let btn = null;
      if (/first|earliest/.test(t)) btn = slots.find((b) => !b.disabled);
      else {
        const want = parseTime(t);
        btn = want ? slots.find((b) => b.dataset.time === want) : null;
        if (want && !btn) return speak(`There is no slot at ${want}.`, lang);
        if (btn?.disabled) return speak('That slot is not available. Try another time.', lang);
      }
      if (btn) {
        press(btn);
        return speak(`Selected ${btn.dataset.time}. Say confirm to book.`, lang);
      }
    }

    // "Book Dr Luffy"
    const bookBtns = [...document.querySelectorAll('[aria-label^="Book appointment with"]')];
    if (bookBtns.length && /\bbook\b/.test(t)) {
      const words = t
        .replace(/\b(book|appointment|with|for|dr|doctor|please|a|an|the)\b/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2);
      if (words.length) {
        const hit = bookBtns.find((b) => words.some((w) => b.getAttribute('aria-label').toLowerCase().includes(w)));
        if (hit) return press(hit);
        return speak("I couldn't find that doctor on this screen.", lang);
      }
    }

    // Navigation
    const cmd = getCommands().find((c) => c.keys.some((k) => t.includes(k)));
    if (cmd) { speak(cmd.say, lang); return navigate(cmd.route); }

    // "click close", "press cancel", etc.
    const phrase = t.replace(/\b(click|press|tap|select|open|choose|the|button)\b/g, '').replace(/\s+/g, ' ').trim();
    const target = findByWords(phrase);
    if (target) return press(target);

    speak(`I heard ${raw}, but I don't know that command.`, lang);
  };

  const startListening = async () => {
    try {
      await stopSpeaking();
      setListening(true);
      const text = await listenOnce(lang);
      setListening(false);
      handleCommand(text);
    } catch {
      setListening(false);
      speak('Microphone problem. Please check permission.', lang);
    }
  };

  const toggleMode = () => {
    const next = !on;
    setOn(next);
    if (next) speak('Voice mode on. Tap the microphone button and speak a command. Say read screen to hear this page. On touch, tap once to hear, tap twice to activate.', lang);
    else stopSpeaking();
  };

  return (
    <div data-voice-ignore style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
      <select aria-label="Voice language" value={lang} onChange={(e) => setLang(e.target.value)}>
        <option value="en-IN">English</option>
        <option value="hi-IN">हिन्दी</option>
        <option value="mr-IN">मराठी</option>
      </select>
      <button onClick={toggleMode} aria-pressed={on}
        aria-label={on ? 'Turn voice mode off' : 'Turn voice mode on'}
        style={{ padding: '12px 18px', borderRadius: 999, background: on ? '#047857' : '#334155', color: '#fff', fontWeight: 700 }}>
        {on ? '🔊 Voice ON' : '🔇 Voice OFF'}
      </button>
      {on && (
        <button onClick={startListening} aria-label="Speak a command"
          style={{ width: 72, height: 72, borderRadius: '50%', fontSize: 30, color: '#fff',
                   background: listening ? '#dc2626' : '#0ea5e9' }}>
          🎤
        </button>
      )}
    </div>
  );
}