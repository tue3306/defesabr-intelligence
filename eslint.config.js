import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'

// -----------------------------------------------------------------------------
// LINT — a rede que faltava.
//
// O projeto quebrou em PRODUÇÃO com "regions is not defined": a remoção de um
// módulo tirou a declaração da variável e deixou o nome no array de
// dependências de um `useMemo`. O Vite não reclama de identificador
// indefinido — ele só empacota — então o erro atravessou build, deploy e só
// apareceu quando o componente montou, já com o nome minificado no stack.
//
// `no-undef` custa uma dependência de desenvolvimento e pega essa classe
// inteira: identificador que não existe, import removido, estado renomeado.
// Roda com `npm run lint`, e o build de produção o executa antes de compilar.
// -----------------------------------------------------------------------------
export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'server/node_modules/**', 'server/data/**'],
  },

  // ── Interface (navegador) ──
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      ...js.configs.recommended.rules,

      // O QUE IMPORTA AQUI.
      'no-undef': 'error',

      // Hooks: a ordem de chamada e as dependências. `exhaustive-deps` fica em
      // aviso porque há casos legítimos de omitir dependência (efeitos que
      // devem rodar uma vez só), e o código já os marca com disable.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // JSX usa componentes que o parser não vê como "usados". Sem isto, cada
      // import de componente vira um falso positivo e o ruído esconde o sinal.
      'no-unused-vars': ['warn', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],

      // Ruído sem consequência num projeto que não usa `console` em produção.
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },

  // ── Servidor (Node) ──
  {
    files: ['server/**/*.js', 'scripts/**/*.mjs', '*.config.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-undef': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
]
