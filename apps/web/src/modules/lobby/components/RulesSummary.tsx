import { MAX_STRESS } from '@devoh/engine';
import { Panel } from '../../../shared/ui';

/** Resumo das regras na tela inicial. */
export function RulesSummary() {
  return (
    <Panel className="rules">
      <h2>Como jogar</h2>
      <ul>
        <li>
          <b>4000 LP</b> (Pontos de Sprint). Zere os do oponente ou deixe o backlog (deck) dele acabar.
        </li>
        <li>Uma invocação por turno. Nível 5–6 sacrifica 1 Profissional; nível 7+ sacrifica 2.</li>
        <li>
          <b>Tasks</b> (verdes) são ativadas da mão. <b>Bugs</b> (rosa) ficam virados e disparam sozinhos quando a condição acontece.
        </li>
        <li>
          <b>Estresse</b> (0–{MAX_STRESS}): cada ponto dá +100 ATK aos seus Profissionais (Modo Desespero). Tomar dano de batalha dá +1. No{' '}
          {MAX_STRESS}, o seu Profissional de maior nível pede demissão e o Estresse zera.
        </li>
        <li>Não tem batalha no primeiro turno. Profissionais podem atacar no turno em que entram.</li>
      </ul>
    </Panel>
  );
}
