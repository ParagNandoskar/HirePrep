const parseTimeout = (value, defaultValue = 10000) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
};

const VIDEO_SERVICE_MODE = (process.env.VIDEO_SERVICE_MODE || 'local').toLowerCase();

const NLP_SERVICE_URL =
  process.env.NLP_SERVICE_URL ||
  process.env.RESUME_SERVICE_URL ||
  process.env.PYTHON_NLP_SERVICE_URL ||
  'http://localhost:5001';

const AUDIO_SERVICE_URL =
  process.env.AUDIO_SERVICE_URL ||
  process.env.PYTHON_AUDIO_SERVICE_URL ||
  'http://localhost:8001';

const VIDEO_LOCAL_SERVICE_URL =
  process.env.VIDEO_SERVICE_URL ||
  process.env.VIDEO_LOCAL_SERVICE_URL ||
  process.env.PYTHON_VIDEO_SERVICE_URL ||
  'http://localhost:8002';

const VIDEO_CLOUD_SERVICE_URL =
  process.env.VIDEO_CLOUD_SERVICE_URL ||
  process.env.VIDEO_SERVICE_URL ||
  VIDEO_LOCAL_SERVICE_URL;

const VIDEO_SERVICE_URL =
  VIDEO_SERVICE_MODE === 'cloud' ? VIDEO_CLOUD_SERVICE_URL : VIDEO_LOCAL_SERVICE_URL;

const MICROSERVICE_TIMEOUT_MS = parseTimeout(process.env.MICROSERVICE_TIMEOUT_MS, 10000);
const MICROSERVICE_RETRY_COUNT = parseTimeout(process.env.MICROSERVICE_RETRY_COUNT, 1);

const withServiceTimeout = (timeoutMs = MICROSERVICE_TIMEOUT_MS) => ({
  timeout: timeoutMs,
  headers: { 'Content-Type': 'application/json' }
});

const SERVICES = {
  NLP: NLP_SERVICE_URL,
  AUDIO: AUDIO_SERVICE_URL,
  VIDEO: VIDEO_SERVICE_URL
};

module.exports = {
  SERVICES,
  RESUME_SERVICE_URL: NLP_SERVICE_URL,
  NLP_SERVICE_URL,
  AUDIO_SERVICE_URL,
  VIDEO_SERVICE_URL,
  VIDEO_SERVICE_MODE,
  MICROSERVICE_TIMEOUT_MS,
  MICROSERVICE_RETRY_COUNT,
  withServiceTimeout,
  withMicroserviceTimeout: withServiceTimeout
};
