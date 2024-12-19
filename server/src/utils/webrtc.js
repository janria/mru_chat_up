// Get ICE servers configuration
const getIceServers = async () => {
  // You can integrate with a TURN server provider or use your own TURN servers
  return [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302'
      ]
    },
    // Add your TURN servers here
    {
      urls: process.env.TURN_SERVER_URL,
      username: process.env.TURN_SERVER_USERNAME,
      credential: process.env.TURN_SERVER_CREDENTIAL
    }
  ].filter(server => server.urls); // Remove any undefined servers
};

// Generate unique session ID
const generateSessionId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Parse SDP for bandwidth restrictions
const parseSdp = (sdp) => {
  const lines = sdp.split('\n');
  return lines.map(line => {
    // Add bandwidth restriction for video
    if (line.startsWith('m=video')) {
      return [
        line,
        'b=AS:2000' // 2 Mbps
      ].join('\n');
    }
    // Add bandwidth restriction for audio
    if (line.startsWith('m=audio')) {
      return [
        line,
        'b=AS:64' // 64 kbps
      ].join('\n');
    }
    return line;
  }).join('\n');
};

// Calculate connection quality score
const calculateQualityScore = (stats) => {
  try {
    const {
      packetsLost,
      packetsReceived,
      bytesReceived,
      timestamp,
      jitter,
      roundTripTime
    } = stats;

    // Calculate packet loss percentage
    const packetLoss = packetsReceived > 0 
      ? (packetsLost / (packetsLost + packetsReceived)) * 100 
      : 0;

    // Calculate bitrate
    const bitrate = bytesReceived * 8 / (timestamp / 1000); // bps

    // Score different metrics (0-100)
    const packetLossScore = Math.max(0, 100 - (packetLoss * 5));
    const bitrateScore = Math.min(100, (bitrate / 1000000) * 20); // Normalized to 5Mbps
    const jitterScore = Math.max(0, 100 - (jitter * 10));
    const rttScore = Math.max(0, 100 - (roundTripTime * 2));

    // Calculate weighted average
    const totalScore = (
      packetLossScore * 0.4 +
      bitrateScore * 0.3 +
      jitterScore * 0.15 +
      rttScore * 0.15
    );

    // Map score to quality level
    if (totalScore >= 80) return 'excellent';
    if (totalScore >= 60) return 'good';
    if (totalScore >= 40) return 'fair';
    return 'poor';

  } catch (error) {
    console.error('Error calculating quality score:', error);
    return 'unknown';
  }
};

// Get optimal video constraints based on connection quality
const getVideoConstraints = (quality) => {
  switch (quality) {
    case 'excellent':
      return {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 }
      };
    case 'good':
      return {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      };
    case 'fair':
      return {
        width: { ideal: 854 },
        height: { ideal: 480 },
        frameRate: { ideal: 24 }
      };
    case 'poor':
      return {
        width: { ideal: 640 },
        height: { ideal: 360 },
        frameRate: { ideal: 20 }
      };
    default:
      return {
        width: { ideal: 854 },
        height: { ideal: 480 },
        frameRate: { ideal: 24 }
      };
  }
};

// Get optimal audio constraints based on connection quality
const getAudioConstraints = (quality) => {
  switch (quality) {
    case 'excellent':
    case 'good':
      return {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        sampleSize: 16
      };
    default:
      return {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100,
        sampleSize: 16
      };
  }
};

// Handle WebRTC errors
const handleWebRTCError = (error) => {
  let errorType = 'unknown';
  let message = 'An unknown error occurred';

  if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
    errorType = 'device-not-found';
    message = 'Required media device not found';
  } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
    errorType = 'permission-denied';
    message = 'Permission to access media devices was denied';
  } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
    errorType = 'hardware-error';
    message = 'Could not access media device';
  } else if (error.name === 'OverconstrainedError') {
    errorType = 'overconstrained';
    message = 'Media device cannot satisfy constraints';
  } else if (error.name === 'TypeError') {
    errorType = 'type-error';
    message = 'Invalid constraints or parameters';
  }

  return {
    type: errorType,
    message,
    originalError: error
  };
};

// Generate room code
const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Parse connection stats
const parseConnectionStats = (stats) => {
  const result = {
    audio: {
      bitrate: 0,
      packetLoss: 0,
      latency: 0
    },
    video: {
      bitrate: 0,
      packetLoss: 0,
      latency: 0,
      fps: 0,
      resolution: ''
    }
  };

  stats.forEach(stat => {
    if (stat.type === 'inbound-rtp') {
      const mediaType = stat.mediaType || stat.kind;
      if (mediaType === 'audio' || mediaType === 'video') {
        result[mediaType].bitrate = stat.bitrate;
        result[mediaType].packetLoss = stat.packetsLost;
        result[mediaType].latency = stat.jitter;

        if (mediaType === 'video') {
          result.video.fps = stat.framesPerSecond;
          result.video.resolution = `${stat.frameWidth}x${stat.frameHeight}`;
        }
      }
    }
  });

  return result;
};

module.exports = {
  getIceServers,
  generateSessionId,
  parseSdp,
  calculateQualityScore,
  getVideoConstraints,
  getAudioConstraints,
  handleWebRTCError,
  generateRoomCode,
  parseConnectionStats
};
