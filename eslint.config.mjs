// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import only_warn from 'eslint-plugin-only-warn';
import eslintPluginSvelte from 'eslint-plugin-svelte';
import plugin_import from 'eslint-plugin-import-x';
import obsidianmd from 'eslint-plugin-obsidianmd';

export default tseslint.config(
	{
		ignores: ['npm/', 'node_modules/', 'main.js', '**/*.svelte', '**/*.d.ts'],
	},
	// Strip `import` and `@typescript-eslint` from obsidianmd recommended — we register both ourselves
	// and ESLint flat config disallows redefining a plugin with the same name across config objects.
	...obsidianmd.configs.recommended.map((c) => {
		if (!c.plugins) return c;
		const { import: _i, '@typescript-eslint': _ts, ...rest } = c.plugins;
		return { ...c, plugins: rest };
	}),
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
            '@typescript-eslint/no-base-to-string': 'off',
		},
	},
	{
		// Dataview API types are externally unresolvable — suppress unsafe-* rules for these files
		files: [
			'src/external/dataview/**/*.ts',
			'src/graph/builders/explicit/dataview_note.ts',
			'src/graph/builders/explicit/list_note.ts',
			'src/graph/builders/index.ts',
			'src/codeblocks/index.ts',
		],
		rules: {
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-redundant-type-constituents': 'off',
		},
	},
	{
		// `acronyms` REPLACES the plugin's default list rather than extending it,
		// so the defaults are repeated here with ISO/US appended. Day names are
		// proper nouns that the sentence-case check otherwise wants lowercased,
		// and `ignoreRegex` skips strings carrying a URL (it would "correct"
		// https://github.com/... to HTTPS://GitHub.com/...).
		files: ['src/**/*.ts'],
		rules: {
			'obsidianmd/ui/sentence-case': [
				'error',
				{
					acronyms: [
						'API', 'HTTP', 'HTTPS', 'URL', 'DNS', 'TCP', 'IP', 'SSH',
						'TLS', 'SSL', 'FTP', 'SFTP', 'SMTP', 'JSON', 'XML', 'HTML',
						'CSS', 'PDF', 'CSV', 'YAML', 'SQL', 'PNG', 'JPG', 'JPEG',
						'GIF', 'SVG', 'MFA', 'OAuth', 'JWT', 'LDAP', 'SAML', 'SDK',
						'IDE', 'CLI', 'GUI', 'CRUD', 'REST', 'SOAP', 'CPU', 'GPU',
						'RAM', 'SSD', 'USB', 'UI', 'OK', 'RSS', 'S3', 'ID', 'UUID',
						'GUID', 'SHA', 'MD5', 'ASCII', 'DOM', 'CDN', 'FAQ', 'AI',
						'ML', 'LLM',
						// Breadcrumbs additions
						'ISO', 'US',
					],
					ignoreWords: [
						'Monday', 'Mondays', 'Sunday', 'Sundays',
					],
					ignoreRegex: ['https?://'],
				},
			],
		},
	},
	{
		// `BreadcrumbsSettingsWithDirection` is a migration-only type describing an
		// old on-disk settings shape, so it necessarily references the deprecated
		// `BCEdgeAttributes`. `no-deprecated` is on obsidianmd's
		// `no-restricted-disable` list, so it can't be silenced inline.
		files: ['src/interfaces/settings.ts'],
		rules: {
			'@typescript-eslint/no-deprecated': 'off',
		},
	},
	{
		// This is the 1.12 maintenance line: `PluginSettingTab.display()` is
		// deprecated only *since 1.13.0*, in favour of `getSettingDefinitions`.
		// On Obsidian 1.12.x `display()` is the correct API, so the deprecation
		// warning does not apply to this branch. Do not port this block to main.
		files: ['src/settings/SettingsTab.ts'],
		rules: {
			'@typescript-eslint/no-deprecated': 'off',
		},
	},
	{
		// The logger is the one place console output is intentional; every call is
		// gated behind a user-configurable log level. `obsidianmd/*` rules are on
		// the `no-restricted-disable` list, so this must be scoped here.
		files: ['src/logger/index.ts'],
		rules: {
			'obsidianmd/rule-custom-message': 'off',
		},
	},
);