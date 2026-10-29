// O engine roda no navegador e no Node; ambos têm structuredClone, mas a lib ES não declara.
declare function structuredClone<T>(value: T): T;
