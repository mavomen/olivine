module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-empty': [2, 'never'],          // require a scope
    'subject-case': [0],                   // allow any case for the description
  },
};
