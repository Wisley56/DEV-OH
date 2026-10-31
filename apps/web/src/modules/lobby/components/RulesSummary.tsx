import { MAX_STRESS, START_LP } from '@devoh/engine';

const RULES = [
  { title: `${START_LP} LP`, text: 'Pontos de Sprint. Zere os do oponente ou deixe o backlog (deck) dele acabar.' },
  { title: 'Uma invocação por turno', text: 'Nível 5–6 sacrifica 1 Profissional; nível 7+ sacrifica 2.' },
  {
    title: 'Virado',
    text: 'Baixe o Profissional virado em Defesa. No turno seguinte, a Invocação-Virar o põe em Ataque. Atacado virado, ele é revelado e o efeito FLIP resolve.',
  },
  {
    title: 'Tasks e Bugs',
    text: 'Tasks (verdes) são ativadas da mão. Bugs (rosa) ficam virados e disparam sozinhos quando a condição acontece.',
  },
  {
    title: `Estresse 0–${MAX_STRESS}`,
    text: `Cada ponto dá +100 ATK; tomar dano de batalha dá +1. No ${MAX_STRESS}, o seu Profissional de maior nível pede demissão.`,
  },
  { title: 'Primeiro turno', text: 'Não tem batalha. Profissionais podem atacar no turno em que entram.' },
];

/** Resumo das regras na tela inicial, em cartões numerados. */
export function RulesSummary() {
  return (
    <section className="rules" aria-labelledby="rules-title">
      <h2 id="rules-title">Como jogar</h2>
      <ol className="rules-grid">
        {RULES.map((r, i) => (
          <li key={r.title}>
            <span className="mono rules-n">{String(i + 1).padStart(2, '0')}</span>
            <b>{r.title}</b>
            <span>{r.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
