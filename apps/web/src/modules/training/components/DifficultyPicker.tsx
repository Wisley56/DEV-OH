import type { BotLevel } from '@devoh/ai';
import { useProfile } from '../../profile';

const LEVELS: { id: BotLevel; icon: string; title: string; tag: string; desc: string }[] = [
  { id: 'normal', icon: '🤖', title: 'Com IA', tag: 'Normal', desc: 'O bot aceita a primeira sugestão do autocomplete.' },
  { id: 'hard', icon: '🧠', title: 'Sem IA', tag: 'Difícil', desc: 'O bot pensa cada jogada na raça, até o fim do turno.' },
];

/** Escolha da dificuldade do bot (fica salva no perfil). */
export function DifficultyPicker() {
  const level = useProfile((s) => s.botLevel);
  const setLevel = useProfile((s) => s.setBotLevel);
  return (
    <div className="field-label">
      Dificuldade contra o bot
      <div className="difficulty" role="radiogroup" aria-label="Dificuldade contra o bot">
        {LEVELS.map((l) => (
          <button
            key={l.id}
            role="radio"
            aria-checked={level === l.id}
            className={`diff-option ${level === l.id ? 'on' : ''} diff-${l.id}`}
            onClick={() => setLevel(l.id)}
          >
            <span className="diff-title">
              {l.icon} {l.title} <span className="diff-tag">{l.tag}</span>
            </span>
            <span className="diff-desc">{l.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
