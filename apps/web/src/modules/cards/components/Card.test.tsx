import { cardFrame, fullTypeLine, installCustomCards, isFlip, setCode, subtypeLabel, type CardDef } from '@devoh/engine';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CardFace, CardFull, CardMini } from './Card';

afterEach(() => {
  cleanup();
  installCustomCards([]);
});

describe('faces do card', () => {
  it('CardFace desenha um rascunho que não está no catálogo', () => {
    const draft: CardDef = {
      id: 'x_rascunho',
      name: 'Rascunho da Silva',
      kind: 'pro',
      rarity: 'super',
      typeLine: 'Humano / PO',
      attribute: 'FOGO',
      level: 4,
      atk: 1700,
      def: 1200,
      text: 'Prioriza tudo como urgente.',
      flavor: '"É só um botãozinho."',
      art: 'blob:preview',
    };
    const info = {
      frame: cardFrame(draft, undefined),
      flip: isFlip(draft, undefined),
      subtype: subtypeLabel(draft, undefined),
      typeLine: fullTypeLine(draft, undefined),
      code: 'DVOH-X??',
    };
    const { container } = render(<CardFace card={draft} info={info} />);
    expect(screen.getByText('Rascunho da Silva')).toBeTruthy();
    expect(screen.getByText('[Humano / PO / Normal]')).toBeTruthy();
    expect(screen.getByText('DVOH-X??')).toBeTruthy();
    expect(container.querySelector('.card-full.frame-normal.rarity-super')).toBeTruthy();
    expect(container.querySelector('img')?.getAttribute('src')).toBe('blob:preview');
  });

  it('id desconhecido vira "Carta nova" e se atualiza quando o catálogo chega', () => {
    render(
      <>
        <CardFull cardId="x_chegando" />
        <CardMini cardId="x_chegando" />
      </>,
    );
    expect(screen.getAllByText('Carta nova')).toHaveLength(2);

    act(() => {
      installCustomCards([
        {
          serial: 1,
          artVersion: 2,
          status: 'published',
          input: {
            id: 'x_chegando',
            name: 'Chegou Agora',
            kind: 'task',
            rarity: 'comum',
            speed: 'quick',
            effects: [{ when: 'activate', do: [{ do: 'draw', amount: 1 }] }],
          },
        },
      ]);
    });
    expect(screen.queryByText('Carta nova')).toBeNull();
    expect(screen.getAllByText('Chegou Agora')).toHaveLength(2);
    expect(screen.getByText(setCode('x_chegando'))).toBeTruthy();
  });
});
