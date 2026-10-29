import base from '@devoh/eslint-config/base';
import boundaries from '@devoh/eslint-config/boundaries';
import react from '@devoh/eslint-config/react';

export default [...base, ...react.map((c) => ({ ...c, files: ['apps/web/**/*.{ts,tsx}'] })), ...boundaries];
