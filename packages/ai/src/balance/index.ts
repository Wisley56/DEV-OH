/**
 * Balanceamento: simulações bot × bot com os decks iniciais e com decks gerados,
 * para achar cards que pedem buff ou nerf. Usado pelo `npm run balance` e pelo painel admin do web.
 */
export {
  createBalanceRun,
  DEFAULT_CONFIG,
  REPORT_VERSION,
  runBalance,
  verdictTally,
  type BalanceConfig,
  type BalanceMode,
  type BalanceReport,
  type BalanceRun,
  type CardStat,
} from './simulate';
export { generateDeck, focusRotation, seededRng, GENERATED_DECK_SIZE } from './deckGen';
export { budgetAudit, type BudgetIssue } from './budget';
export { MIN_GAMES_FOR_VERDICT, pct, rate, verdictOf, wilson, type Tally, type Verdict } from './stats';
export { budgetToMarkdown, reportsToMarkdown, reportToMarkdown } from './markdown';
