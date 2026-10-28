import { validateDeck, type BotLevel } from '@devoh/game';
import { motion } from 'framer-motion';
import { useState } from 'react';
import type { Screen } from '../App';
import { CardFull } from '../components/Card';
import { allDecks, currentDeck, getBotLevel, getName, getSession, setBotLevel, setDeckId, setName } from '../storage';

const HERO = ['douglas_ataque', 'thy_revisor', 'patricia'];

const LEVELS: { id: BotLevel; icon: string; title: string; tag: string; desc: string }[] = [
  { id: 'normal', icon: '🤖', title: 'Com IA', tag: 'Normal', desc: 'O bot aceita a primeira sugestão do autocomplete.' },
  { id: 'hard', icon: '🧠', title: 'Sem IA', tag: 'Difícil', desc: 'O bot pensa cada jogada na raça, até o fim do turno.' },
];

export function Home({ go }: { go: (s: Screen) => void }) {
  const invite = new URLSearchParams(location.search).get('sala')?.toUpperCase() ?? '';
  const [name, setNameState] = useState(getName());
  const [deckId, setDeck] = useState(currentDeck().id);
  const [code, setCode] = useState(invite);
  const [level, setLevel] = useState<BotLevel>(getBotLevel());
  const decks = allDecks();
  const deck = decks.find((d) => d.id === deckId) ?? decks[0];
  const deckErrors = validateDeck(deck.cards);
  const nick = name.trim() || 'Dev Anônimo';
  const resume = getSession();

  const ready = () => {
    setName(name.trim());
    setDeckId(deck.id);
    return deckErrors.length === 0;
  };

  return (
    <div className="home">
      <header className="hero">
        <div className="hero-cards" aria-hidden>
          {HERO.map((id, i) => (
            <motion.div
              key={id}
              className="hero-card"
              initial={{ y: 60, opacity: 0, rotate: 0 }}
              animate={{ y: i === 1 ? -14 : 0, opacity: 1, rotate: (i - 1) * 12 }}
              transition={{ delay: 0.15 * i, type: 'spring', stiffness: 120 }}
            >
              <CardFull cardId={id} />
            </motion.div>
          ))}
        </div>
        <h1 className="logo">
          DEV<span>-</span>OH!
        </h1>
        <p className="tagline">A Era dos Devs que Agem — duelo de cards da squad</p>
      </header>

      <section className="panel lobby">
        {invite && <p className="invite">Você foi convidado para a sala <b>{invite}</b>. Escolha apelido e deck e clique em Entrar.</p>}
        {resume && !invite && (
          <button className="btn invite" onClick={() => go({ name: 'online', intent: { kind: 'join', code: resume.code, name: nick, deck: deck.cards } })}>
            ↩ Voltar para o duelo na sala <b>{resume.code}</b>
          </button>
        )}
        <label className="field-label">
          Seu apelido
          <input value={name} maxLength={20} placeholder="Ex.: Wisley" onChange={(e) => setNameState(e.target.value)} />
        </label>
        <label className="field-label">
          Deck
          <select value={deck.id} onChange={(e) => setDeck(e.target.value)}>
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.cards.length})
              </option>
            ))}
          </select>
        </label>
        <p className="deck-desc">{deck.description}</p>
        {deckErrors.length > 0 && <p className="warn">{deckErrors[0]}</p>}

        <div className="field-label">
          Dificuldade contra o bot
          <div className="difficulty" role="radiogroup" aria-label="Dificuldade contra o bot">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                role="radio"
                aria-checked={level === l.id}
                className={`diff-option ${level === l.id ? 'on' : ''} diff-${l.id}`}
                onClick={() => {
                  setLevel(l.id);
                  setBotLevel(l.id);
                }}
              >
                <span className="diff-title">
                  {l.icon} {l.title} <span className="diff-tag">{l.tag}</span>
                </span>
                <span className="diff-desc">{l.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="lobby-actions">
          <button className="btn btn-primary btn-lg" onClick={() => ready() && go({ name: 'bot', deck: deck.cards, playerName: nick, level })}>
            🤖 Treinar contra o Bot
          </button>
          <button className="btn btn-lg" onClick={() => ready() && go({ name: 'online', intent: { kind: 'create', name: nick, deck: deck.cards } })}>
            🌐 Criar sala online
          </button>
          <div className="join">
            <input value={code} maxLength={5} placeholder="CÓDIGO" onChange={(e) => setCode(e.target.value.toUpperCase())} />
            <button
              className="btn"
              disabled={code.length < 4}
              onClick={() => ready() && go({ name: 'online', intent: { kind: 'join', code, name: nick, deck: deck.cards } })}
            >
              Entrar
            </button>
          </div>
        </div>

        <div className="lobby-links">
          <button className="btn btn-ghost" onClick={() => go({ name: 'collection' })}>
            📖 Coleção de cards
          </button>
          <button className="btn btn-ghost" onClick={() => go({ name: 'decks' })}>
            🛠 Montar deck
          </button>
        </div>
      </section>

      <section className="panel rules">
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
            <b>Estresse</b> (0–10): cada ponto dá +100 ATK aos seus Profissionais (Modo Desespero). Tomar dano de batalha dá +1. No 10, o
            seu Profissional de maior nível pede demissão.
          </li>
          <li>Não tem batalha no primeiro turno. Profissionais podem atacar no turno em que entram.</li>
        </ul>
      </section>
    </div>
  );
}
