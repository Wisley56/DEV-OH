import { MAX_STRESS } from '@devoh/engine';

/** Um passo do tour: o elemento destacado (atributo data-tour) e o texto do balão. */
export interface TourStep {
  target: string;
  title: string;
  text: string;
}

/** Tour do primeiro duelo de treino. */
export const DUEL_TOUR: TourStep[] = [
  {
    target: 'hand',
    title: 'Sua mão',
    text: 'Estes são seus cards. Clique num card para ver o efeito e as ações — ou arraste um Profissional direto para uma zona do campo. Dá até para baixá-lo virado e blefar!',
  },
  {
    target: 'field',
    title: 'Seu campo',
    text: 'Em cima ficam as 3 zonas de Profissionais; embaixo, as de Tasks e Bugs, a zona de Campo e os Desligados (cemitério).',
  },
  {
    target: 'inspector',
    title: 'Painel do card',
    text: 'Mostra o card grande, o texto completo e os botões: invocar, ativar, atacar, usar a habilidade ⚡… Nada acontece sem você confirmar.',
  },
  {
    target: 'phase',
    title: 'Fases do turno',
    text: 'Na Fase Principal você invoca e ativa Tasks. Depois clique em ⚔ Batalha para atacar e em Encerrar turno para passar a vez.',
  },
  {
    target: 'hud',
    title: 'LP e Estresse',
    text: `Zere os 4000 LP do oponente para vencer. Tomar dano dá Estresse: +100 ATK por ponto, mas no ${MAX_STRESS} o seu Profissional de maior nível pede demissão e o Estresse zera!`,
  },
  {
    target: 'log',
    title: 'Histórico',
    text: 'Tudo o que acontece no duelo fica registrado aqui. Dá para rever este tour no botão "?". Bom jogo!',
  },
];
