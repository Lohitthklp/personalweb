const js = require('@eslint/js');
const globals = require('globals');

const sharedRules = {
    ...js.configs.recommended.rules,
    eqeqeq: ['error', 'always'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-var': 'error',
    'prefer-const': ['error', { destructuring: 'all' }]
};

module.exports = [
    {
        ignores: ['node_modules/**', '.vercel/**', 'coverage/**', 'scripts/**', 'data/**']
    },
    {
        files: ['script.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: globals.browser
        },
        rules: sharedRules
    },
    {
        files: ['api/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                ...globals.node
            }
        },
        rules: sharedRules
    }
];
