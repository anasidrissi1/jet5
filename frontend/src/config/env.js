const sanitizeUrl = (value) => (value ? value.replace(/\/+$/, '') : '');

const ensureLeadingSlash = (value) => {
  if (!value) {
    return '';
  }
  return `/${value.replace(/^\/+/, '').replace(/\/+$/, '')}`;
};

const DEFAULT_PORT = import.meta.env.VITE_API_PORT ?? '8000';
const DEFAULT_ORIGIN = import.meta.env.VITE_FALLBACK_ORIGIN ?? `http://localhost:${DEFAULT_PORT}`;

const isLocalNetwork = () => {
  if (typeof window === 'undefined') return true;
  const { hostname } = window.location;
  return hostname === 'localhost' || hostname === '127.0.0.1' || /^(10|172\.(1[6-9]|2\d|3[01])|192\.168)\./.test(hostname);
};

const deriveOriginFromWindow = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_ORIGIN;
  }

  const { protocol, hostname } = window.location;
  const normalizedProtocol = protocol && protocol.startsWith('http') ? protocol : 'https:';

  if (isLocalNetwork()) {
    return `${normalizedProtocol}//${hostname}:${DEFAULT_PORT}`;
  }
  
  // Production: même protocole et hostname, sans port
  return `${normalizedProtocol}//${hostname}`;
};

export const getBackendOrigin = () => {
  // En production (domaine réel), toujours dériver de window.location
  if (!isLocalNetwork()) {
    return sanitizeUrl(deriveOriginFromWindow());
  }
  const explicitOrigin = sanitizeUrl(import.meta.env.VITE_BACKEND_ORIGIN);
  if (explicitOrigin) {
    return explicitOrigin;
  }
  return sanitizeUrl(deriveOriginFromWindow());
};

export const getApiBaseUrl = () => {
  // En production (domaine réel), construire depuis window.location
  if (!isLocalNetwork()) {
    const apiPath = ensureLeadingSlash(import.meta.env.VITE_API_BASE_PATH || 'api');
    return sanitizeUrl(`${getBackendOrigin()}${apiPath}`);
  }
  const explicitApi = sanitizeUrl(import.meta.env.VITE_API_URL);
  if (explicitApi) {
    return explicitApi;
  }

  const apiPath = ensureLeadingSlash(import.meta.env.VITE_API_BASE_PATH || 'api');
  return sanitizeUrl(`${getBackendOrigin()}${apiPath}`);
};

export const getMediaBaseUrl = () => {
  if (!isLocalNetwork()) {
    return sanitizeUrl(`${getBackendOrigin()}${ensureLeadingSlash(import.meta.env.VITE_MEDIA_BASE_PATH || '')}`) || getBackendOrigin();
  }
  const explicitMedia = sanitizeUrl(import.meta.env.VITE_MEDIA_URL);
  if (explicitMedia) {
    return explicitMedia;
  }
  return sanitizeUrl(`${getBackendOrigin()}${ensureLeadingSlash(import.meta.env.VITE_MEDIA_BASE_PATH || '')}`) || getBackendOrigin();
};

export const buildMediaUrl = (path) => {
  if (!path) {
    return '';
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const base = getMediaBaseUrl();
  if (!base) {
    return path;
  }
  if (path.startsWith('/')) {
    return `${base}${path}`;
  }
  return `${base}/${path}`;
};
