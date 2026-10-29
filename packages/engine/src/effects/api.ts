/**
 * API para quem escreve cards: tudo que um efeito pode consultar ou fazer.
 * O conteúdo (content/) importa só daqui e de core/types — nunca de rules/ direto.
 */
export { findPro, findSpell, hasFaceUp, isNegated, isOnce, markOnce, other, proOnField, prosOf, setCardsOf } from '../core/board';
export { card, nameOf, proLabel } from '../core/catalog';
export { log, pname } from '../core/log';
export { rand, randInt } from '../core/rng';
export { damage, heal } from '../rules/life';
export { getAtk, getDef } from '../rules/stats';
export { addStress } from '../rules/stress';
export { bounceToHand, destroyPro, destroySpell, draw, flipFaceUp, negatePro, searchDeck, setFaceDown, setPosition } from '../rules/zones';
export { defineCard, type AttackInfo, type CardEffects, type CardModule, type EffectCtx, type FlipCause, type StatCtx } from './types';
