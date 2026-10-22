import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import next from 'eslint-config-next/core-web-vitals';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/coverage/**',
      '**/next-env.d.ts',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...next.map((config) => ({ ...config, files: ['apps/web/**/*.{ts,tsx,js,mjs}'] })),
  {
    files: ['apps/web/**/*.{ts,tsx,js,mjs}'],
    settings: { next: { rootDir: 'apps/web/' } },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  prettier,
);
