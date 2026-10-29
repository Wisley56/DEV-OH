/** URL do servidor de duelos. Em dev, o mesmo host na porta 3001. */
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || `${location.protocol}//${location.hostname}:3001`;
