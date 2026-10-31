// Testes com `@vitest-environment node` (ex.: server.test.mjs) não têm DOM.
const dom = typeof window !== 'undefined';

// jsdom não tem matchMedia: responde "não bate" para qualquer media query.
if (dom && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// jsdom não implementa rolagem.
if (dom) Element.prototype.scrollTo ??= () => {};
