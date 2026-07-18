import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  useCallStateHooks,
  useCall,
} from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import { supabase } from '../lib/supabase';

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;
const TOKEN_ENDPOINT =
  'https://xfuzwuraowhaxqnfolzg.supabase.co/functions/v1/generate-stream-token';

// ---------------------------------------------------------------------------
// Provider-agnostic token fetch.
// To swap providers later (Agora/Daily), only this function needs to change —
// it should still resolve to { token, userId } so the rest of the component
// stays untouched.
// ---------------------------------------------------------------------------
async function fetchStreamToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No active session. Please log in again.');
  }

  const res = await fetch(TOKEN_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch video token.');
  }

  return res.json(); // { token, userId }
}

function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

// ---------------------------------------------------------------------------
// CallRoom — rendered once inside StreamCall context, has access to call state
// ---------------------------------------------------------------------------
function CallRoom({ onLeave }) {
  const call = useCall();
  const {
    useMicrophoneState,
    useCameraState,
    useSpeakerState,
    useCallCallingState,
    useParticipants,
  } = useCallStateHooks();

  const { microphone, isMute: isMicMuted } = useMicrophoneState();
  const { camera, isMute: isCameraOff } = useCameraState();
  const speakerState = useSpeakerState ? useSpeakerState() : {};
  const { speaker } = speakerState;
  const callingState = useCallCallingState();
  const participants = useParticipants();

  const [elapsed, setElapsed] = useState(0);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    navigator.mediaDevices
      ?.enumerateDevices()
      .then((all) => setAudioOutputDevices(all.filter((d) => d.kind === 'audiooutput')))
      .catch(() => setAudioOutputDevices([]));
  }, []);

  const toggleMic = () => microphone.toggle();
  const toggleCamera = () => camera.toggle();
  const flipCamera = () => camera.flip();

  const selectSpeaker = (deviceId) => {
    speaker?.select(deviceId);
    setShowDeviceMenu(false);
  };

  const handleEndCall = async () => {
    try {
      await call.leave();
    } finally {
      onLeave();
    }
  };

  const localParticipant = participants.find((p) => p.isLocalParticipant);
  const remoteParticipants = participants.filter((p) => !p.isLocalParticipant);

  return (
    <div className="fixed inset-0 bg-green-50 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-br from-teal-500 via-cyan-500 to-emerald-400">
        <span className="font-semibold tracking-tight text-white">Video Consultation</span>
        <span className="font-normal text-white/90">{formatDuration(elapsed)}</span>
      </div>

      {/* Video grid */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        {remoteParticipants.length > 0 ? (
          remoteParticipants.map((p) => (
            <video
              key={p.sessionId}
              ref={(el) => {
                if (el && p.videoStream) el.srcObject = p.videoStream;
              }}
              autoPlay
              playsInline
              className="max-h-full max-w-full"
            />
          ))
        ) : (
          <p className="font-medium text-white/70">
            {callingState === 'joined'
              ? 'Waiting for the other participant to join…'
              : 'Connecting…'}
          </p>
        )}

        {/* Local video preview */}
        {localParticipant && (
          <video
            ref={(el) => {
              if (el && localParticipant.videoStream) el.srcObject = localParticipant.videoStream;
            }}
            autoPlay
            playsInline
            muted
            className="absolute bottom-4 right-4 w-32 h-44 rounded-xl object-cover border-2 border-emerald-400"
          />
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 py-5 bg-green-50 relative flex-wrap">
        <button
          onClick={toggleMic}
          className={`px-4 py-3 rounded-full font-medium transition-colors ${
            isMicMuted
              ? 'bg-gray-300 hover:bg-gray-200'
              : 'bg-emerald-700 hover:bg-emerald-500 text-white'
          }`}
        >
          {isMicMuted ? 'Unmute' : 'Mute'}
        </button>

        <button
          onClick={toggleCamera}
          className={`px-4 py-3 rounded-full font-medium transition-colors ${
            isCameraOff
              ? 'bg-gray-300 hover:bg-gray-200'
              : 'bg-emerald-700 hover:bg-emerald-500 text-white'
          }`}
        >
          {isCameraOff ? 'Start Video' : 'Stop Video'}
        </button>

        <button
          onClick={flipCamera}
          className="px-4 py-3 rounded-full font-medium bg-emerald-700 hover:bg-emerald-500 text-white transition-colors"
        >
          Switch Camera
        </button>

        <div className="relative">
          <button
            onClick={() => setShowDeviceMenu((s) => !s)}
            className="px-4 py-3 rounded-full font-medium bg-emerald-700 hover:bg-emerald-500 text-white transition-colors"
          >
            Speaker
          </button>
          {showDeviceMenu && (
            <div className="absolute bottom-full mb-2 right-0 bg-white rounded-lg shadow-lg py-2 min-w-48 z-10">
              {audioOutputDevices.length === 0 && (
                <p className="px-4 py-2 font-normal text-sm text-gray-500">No devices found</p>
              )}
              {audioOutputDevices.map((d) => (
                <button
                  key={d.deviceId}
                  onClick={() => selectSpeaker(d.deviceId)}
                  className="w-full text-left px-4 py-2 font-normal text-sm hover:bg-green-50"
                >
                  {d.label || 'Speaker'}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleEndCall}
          className="px-5 py-3 rounded-full font-bold tracking-tight bg-red-600 hover:bg-red-500 text-white transition-colors"
        >
          End Call
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VideoCall — top-level page component, handles connecting/joining/errors
// ---------------------------------------------------------------------------
export default function VideoCall() {
  const navigate = useNavigate();
  const location = useLocation();
  const appointment = location.state?.appointment;

  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [error, setError] = useState(null);
  const clientRef = useRef(null);

  useEffect(() => {
    if (!appointment) {
      setError('No appointment selected. Please join from your appointments list.');
      return;
    }

    let cancelled = false;

    async function setup() {
      try {
        const { token, userId } = await fetchStreamToken();
        if (cancelled) return;

        const videoClient = new StreamVideoClient({
          apiKey: STREAM_API_KEY,
          user: { id: userId },
          token,
        });

        // Using the appointment ID as the call ID scopes the room to this
        // doctor+patient pair. Both sides reach this same call ID because
        // they're both navigating here with the same appointment record.
        const videoCall = videoClient.call('default', appointment.id);
        await videoCall.join({ create: true });

        if (cancelled) {
          await videoCall.leave();
          videoClient.disconnectUser();
          return;
        }

        clientRef.current = videoClient;
        setClient(videoClient);
        setCall(videoCall);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to join video call.');
      }
    }

    setup();

    return () => {
      cancelled = true;
      clientRef.current?.disconnectUser();
    };
  }, [appointment]);

  const handleLeave = useCallback(() => {
    clientRef.current?.disconnectUser();
    navigate('/appointments');
  }, [navigate]);

  if (error) {
    return (
      <div className="fixed inset-0 bg-green-50 flex flex-col items-center justify-center gap-4 z-50 px-6 text-center">
        <p className="font-semibold tracking-tight text-lg">{error}</p>
        <button
          onClick={() => navigate('/appointments')}
          className="px-5 py-3 rounded-full font-bold tracking-tight bg-emerald-700 hover:bg-emerald-500 text-white transition-colors"
        >
          Back to Appointments
        </button>
      </div>
    );
  }

  if (!client || !call) {
    return (
      <div className="fixed inset-0 bg-green-50 flex items-center justify-center z-50">
        <p className="font-medium">Connecting to your video consultation…</p>
      </div>
    );
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <CallRoom onLeave={handleLeave} />
      </StreamCall>
    </StreamVideo>
  );
}