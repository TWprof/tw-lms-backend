module.exports = {
  extends: ["airbnb-base", "prettier"],
  plugins: ["import"],
  rules: {
    "no-console": 0,
    "import/newline-after-import": "off",
    "no-unused-vars": 0,
    "max-len": ["error", { code: 80 }],
    "linebreak-style": "off",
    "no-underscore-dangle": 0,
    "consistent-return": 0,
    "comma-dangle": 0,
    "no-tabs": 0,
    "class-methods-use-this": 0,
    "no-param-reassign": 0,
    "prettier/prettier": ["error"],
    quotes: ["error", "single"],
    semi: ["error", "always"],
    indent: ["error", 2],
    "no-multi-spaces": ["error"],
    "no-await-in-loop": 0,
  },
  env: {
    browser: true,
    node: true,
    es6: true,
    mocha: true,
  },
};