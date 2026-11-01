import type { BotLevel } from '@devoh/ai';
import { Bot, Cpu, type LucideIcon } from 'lucide-react';
import { useProfile } from '../../profile';

const LEVELS: { id: BotLevel; Icon: LucideIcon; title: string; tag: string; desc: string }[] = [
  { id: 'normal', Icon: Bot, title: 'Com IA', tag: 'Normal', desc: 'O bot aceita a primeira sugestão do autocomplete.' },
  { id: 'hard', Icon: Cpu, title: 'Sem IA', tag: 'Difícil', desc: 'O bot pensa cada jogada na raça, até o fim do turno.' },
];

/** Escolha da dificuldade do bot (fica salva no perfil). */
export function DifficultyPicker() {
  const level = useProfile((s) => s.botLevel);
  const setLevel = useProfile((s) => s.setBotLevel);
  return (
    <div className="difficulty" role="radiogroup" aria-label="Dificuldade contra o bot">
      {LEVELS.map(({ id, Icon, title, tag, desc }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={level === id}
          className={`diff-option ${level === id ? 'on' : ''} diff-${id}`}
          onClick={() => setLevel(id)}
        >
          <span className="diff-title">
            <Icon size={18} strokeWidth={1.75} className="diff-icon" aria-hidden />
            {title}
          </span>
          <span className="diff-tag">{tag}</span>
          <span className="diff-desc">{desc}</span>
        </button>
      ))}
    </div>
  );
}
