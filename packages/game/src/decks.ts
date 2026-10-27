import { CARDS, card } from './cards';
import type { DeckList } from './types';

export const DECK_MIN = 20;
export const DECK_MAX = 30;
export const MAX_COPIES = 3;

const x = (id: string, n: number) => Array<string>(n).fill(id);

export const STARTER_DECKS: DeckList[] = [
  {
    id: 'techlead',
    name: 'Squad do Tech Lead',
    description: 'Três versões do Thy, Vitor chamando na DM e IAs para revisar. Controle e paciência.',
    cards: [
      'thy_revisor', 'thy_filosofo', 'thy_techlead', 'vitor', 'wisley', 'kelly', 'curiosa',
      ...x('estagiario', 2), ...x('copilot', 2), ...x('stackoverflow', 2), 'backend_noturno',
      ...x('chama_thy', 2), ...x('cafe', 2), ...x('code_review', 2), 'refatoracao', 'home_office',
      'impedimento', 'merge_conflict', 'ia_fez_cagada', 'minha_maquina',
    ],
  },
  {
    id: 'douglas',
    name: 'Força Bruta Douglas',
    description: 'Todas as formas do Douglas, Gato Gordo, Danilo do leite e Deploy na Sexta. Agressivo e arriscado.',
    cards: [
      'douglas_ataque', 'douglas_defensivo', 'douglas_problemas', 'douglas_calma', 'moises', 'danilo', 'paquito',
      ...x('po', 2), 'gerente', 'cliente', 'docker', ...x('qa', 2), ...x('backend_noturno', 2),
      'gato_gordo', 'leite', ...x('reuniao', 2), 'deploy_sexta', ...x('estagiario', 2),
      'prod_caiu', 'erro_404', 'mudanca_escopo',
    ],
  },
  {
    id: 'fofoca',
    name: 'Fofoca & Caos',
    description: 'Patrícia e Gama chocados, Curiosa Caótica e IAs alucinando. Ninguém sabe o que vem.',
    cards: [
      'patricia', 'gama', 'kelly', 'curiosa', 'paquito', 'wisley',
      ...x('claude_alucinando', 2), 'copilot', 'qa', ...x('sre', 2), ...x('docker', 2), 'po', 'estagiario',
      'hotfix', 'daily', 'code_review', 'cafe', 'reuniao', 'home_office', 'deploy_sexta',
      'ia_fez_cagada', 'impedimento', 'minha_maquina',
    ],
  },
];

/** Retorna lista de problemas; vazia = deck válido. */
export function validateDeck(cards: string[]): string[] {
  const errors: string[] = [];
  if (cards.length < DECK_MIN) errors.push(`O deck precisa de pelo menos ${DECK_MIN} cards (tem ${cards.length}).`);
  if (cards.length > DECK_MAX) errors.push(`O deck pode ter no máximo ${DECK_MAX} cards (tem ${cards.length}).`);
  const counts = new Map<string, number>();
  for (const id of cards) {
    if (!CARDS[id]) {
      errors.push(`Card desconhecido: ${id}`);
      continue;
    }
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  for (const [id, n] of counts) {
    const max = card(id).unique ? 1 : MAX_COPIES;
    if (n > max) errors.push(`"${card(id).name}": máximo ${max} cópia(s).`);
  }
  return errors;
}

export function deckById(id: string) {
  return STARTER_DECKS.find((d) => d.id === id);
}
