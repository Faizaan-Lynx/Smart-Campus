const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || '')
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '');

export default BACKEND_URL;