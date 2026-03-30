const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

const rawApiUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').trim();
const defaultDevApiOrigin = 'http://localhost:5000';

const normalizeApiOrigin = (value) => {
  if (!value) {
    return '';
  }

  if (typeof window !== 'undefined' && window.location?.protocol === 'https:' && value.startsWith('http://')) {
    const host = value.slice('http://'.length).split('/')[0] || '';
    const isLocalHost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
    if (!isLocalHost) {
      return `https://${value.slice('http://'.length)}`;
    }
  }

  return value;
};

const apiOrigin = normalizeApiOrigin(rawApiUrl || (import.meta.env.DEV ? defaultDevApiOrigin : ''));
const normalizedApiOrigin = apiOrigin ? trimTrailingSlash(apiOrigin) : '';

const withApiSuffix = (baseUrl) => {
  if (!baseUrl) {
    return '';
  }

  return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
};

const API_BASE_URL = withApiSuffix(normalizedApiOrigin);

const joinUrl = (base, path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
};

export const API_ORIGIN = normalizedApiOrigin;
export const API_URL = normalizedApiOrigin;
export const API_BASE_PATH_URL = API_BASE_URL;

export const requireApiBaseUrl = () => {
  if (!API_BASE_URL) {
    throw new Error('Missing VITE_API_URL (or VITE_API_BASE_URL) in production environment');
  }

  return API_BASE_URL;
};

export const buildApiUrl = (path) => joinUrl(requireApiBaseUrl(), path);
