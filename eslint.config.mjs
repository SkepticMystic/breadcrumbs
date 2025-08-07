// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import only_warn from 'eslint-plugin-only-warn';
import eslintPluginSvelte from 'eslint-plugin-svelte';
import plugin_import from 'eslint-plugin-import';

export default tseslint.config(
	{
		ignores: ['npm/', 'node_modules/', 'main.js', '**/*.svelte', '**/*.d.ts'],
	},
	...eslintPluginSvelte.configs['flat/recommended'],
	...eslintPluginSvelte.configs['flat/prettier'],
	{
		files: ['src/**/*.ts'],
		extends: [
			eslint.configs.recommended,
			...tseslint.configs.recommended,
			...tseslint.configs.recommendedTypeChecked,
			...tseslint.configs.stylisticTypeChecked,
		],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: true,
			},
		},
		plugins: {
			// @ts-ignore
			'only-warn': only_warn,
			import: plugin_import,
		},
		rules: {
			'@typescript-eslint/no-explicit-any': ['warn'],

			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
			],
			'@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'separate-type-imports' }],

			'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
			'import/order': [
				'error',
				{
					'newlines-between': 'never',
					alphabetize: { order: 'asc', orderImportKind: 'asc', caseInsensitive: true },
				},
			],

			'@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
			'@typescript-eslint/restrict-template-expressions': 'off',

			'@typescript-eslint/ban-ts-comment': 'off',
			'@typescript-eslint/no-empty-function': 'off',
			'@typescript-eslint/no-inferrable-types': 'off',
			'@typescript-eslint/require-await': 'off',
		},
	},
);