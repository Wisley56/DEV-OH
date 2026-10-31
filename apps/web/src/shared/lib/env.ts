/**
 * O servidor de duelos fica na mesma origem do site: em produção o `server.mjs` repassa
 * /api e /socket.io; em dev, o proxy do Vite. Por isso as chamadas usam caminhos relativos.
 */
export const API_BASE = '/api';
