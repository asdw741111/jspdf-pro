/* eslint-disable no-undef */

module.exports = {
  root: true,
  env: {
    browser: true,
    node: false,
    es6: true
  },
  parserOptions: {
    ecmaVersion: 13,
    sourceType: "module",
    ecmaFeatures: {
      modules: true,
      experimentalObjectRestSpread: true
    }
  },
  globals: {},
  extends: "eslint:recommended",
  rules: {
    "arrow-body-style": [2, "as-needed"], // 箭头函数body风格，单行可以不用加上大括号
    "no-trailing-spaces": 2, // 行尾不能添加空格
    "no-whitespace-before-property": 2, // 属性前边不能加入空格，例如：a .b
    "no-unreachable": 1, // return后边还有代码则警告，应当避免有无用代码
    "comma-dangle": 0, // json、数组最后允许添加逗号，不需要兼容ie8以下
    "quote-props": [1, "as-needed"], // json属性建议不加引号，除非必要，例如带横杠
    "func-names": 0, // 函数不用必须定义函数名
    indent: [2, 2, { SwitchCase: 1 }], // 必须使用两个空格缩进
    "prefer-const": 2, // 必须优先使用const定义变量，如果需要修改可以定义为let
    "eol-last": [2, "always"], // 非空文件最后需要有一个空行
    "import/no-unresolved": 0,
    "import/extensions": 0,
    "max-len": [2, 250], // 一行最大字符数 150
    "no-unused-expressions": [0, {
      allowShortCircuit: true,
      allowTernary: true
    }],
    "no-console": 2, // 禁止console 必须使用的地方禁用该规则，例如打印打包时间
    "no-debugger": 2, // 禁止debugger，只允许临时调试
    "no-extend-native": 0,
    "no-param-reassign": 0,
    "no-restricted-syntax": 0,
    "no-eval": 1,
    "no-continue": 1,
    "no-const-assign": 2, // 不允许const变量重新赋值
    "spaced-comment": 1, // 建议注释内容和//之间需要加空格
    "no-mixed-operators": 0,
    "no-plusplus": 0,
    "no-unused-vars": [1, { vars: "all", args: "none", ignoreRestSiblings: false }], // 建议去掉无效变量，参数变量未使用的可以保留
    "no-underscore-dangle": 0,
    "space-before-function-paren": [2, "always"], // 函数括号前边需要加空格，包含function函数、构造函数、简写函数（不包含箭头函数）
    "arrow-parens": 1, // 箭头函数建议对参数加括号
    "arrow-spacing": 2, // 箭头函数箭头前后必须加空格
    "dot-location": [2, "property"], // 对象读取属性的时候，不在同一行，需要让点跟随属性 例如 user\n.name
    "prefer-arrow-callback": 1, // 回调函数建议使用箭头函数，例如 foo(function (a) { return a }) 改为 foo((a) => a)
    semi: [2, "never"], // 不允许使用分号，除了for
    "new-parens": 2, // new对象的时候必须加括号，例如 new Person 需要改为 new Person()
    "no-multi-spaces": 1, // 建议不用多个空格，例如 a  === b，需要改为a === b
    "no-multiple-empty-lines": [2, { max: 2 }], // 不允许超过两行的空行
    "no-tabs": 2, // 禁用所有tab，统一用空格
    "no-shadow": 1, // TODO 暂时警告 禁止变量声明覆盖外层作用域的变量，例如arr.map((o) => o.find(o => o.name === 'zhangsan'))，两层循环都用到了o这个变量
    "space-infix-ops": 2, // 操作符前后加空格，包含=、+、三目运算、结构赋值等，例如 a + b
    "import/no-extraneous-dependencies": 0,
    "import/prefer-default-export": 0
  }
}
