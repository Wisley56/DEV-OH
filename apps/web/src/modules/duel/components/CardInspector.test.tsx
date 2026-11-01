import { createGame, getView, type Action } from '@devoh/engine';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DuelBoard } from './DuelBoard';

const filler = Array.from({ length: 20 }, (_, i) => (i % 2 ? 'backend_noturno' : 'qa'));

/** Meu turno 3, com o Copilot (habilidade "Autocompletar") pronto no campo. */
function viewWithCopilot() {
  const s = createGame({
    players: [
      { name: 'Ana', deck: filler },
      { name: 'Bia', deck: filler },
    ],
    seed: 1,
    first: 0,
  });
  s.turn = 3;
  s.active = 0;
  s.players[0].pros[0] = {
    card: { iid: 'cop', cardId: 'copilot', owner: 0 },
    position: 'atk',
    atkMod: 0,
    defMod: 0,
    tempAtk: 0,
    summonedTurn: 1,
    attackedTurn: -5,
    changedPosTurn: -5,
    ignitionTurn: -5,
    lockedUntilTurn: -5,
    faceDown: false,
    oncePerTurn: {},
  };
  return getView(s, 0);
}

afterEach(cleanup);

describe('habilidade de Profissional', () => {
  it('mostra o texto e só usa depois de confirmar', () => {
    const send = vi.fn<(a: Action) => null>(() => null);
    const { container } = render(<DuelBoard controller={{ view: viewWithCopilot(), send, exit: () => {} }} />);

    expect(container.querySelector('.badge-ability')).not.toBeNull();
    fireEvent.click(container.querySelector('[data-slot-iid="cop"] button')!);
    fireEvent.click(screen.getByRole('button', { name: 'Autocompletar' }));

    // Ainda não jogou: mostra o que a habilidade faz.
    expect(send).not.toHaveBeenCalled();
    const panel = screen.getByRole('dialog', { name: 'Habilidade Autocompletar' });
    expect(panel.textContent).toContain('+600 ATK');
    expect(panel.textContent).toContain('Alvo: um Profissional seu');

    // Cancelar volta para as ações normais.
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    // Confirmar segue para a escolha do alvo e, ao clicar no alvo, envia a jogada.
    fireEvent.click(screen.getByRole('button', { name: 'Autocompletar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Usar habilidade' }));
    expect(screen.getByText(/Escolha um Profissional seu/)).toBeTruthy();
    fireEvent.click(container.querySelector('[data-slot-iid="cop"] button')!);
    expect(send).toHaveBeenCalledWith({ type: 'ignition', iid: 'cop', target: 'cop' });
  });
});
