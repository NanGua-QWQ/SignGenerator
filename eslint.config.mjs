import {
    defineConfig,
    globalIgnores
} from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import importPlugin from "eslint-plugin-import";

/**
 * 合并了 sign-generator（基于 eslint-config-next）与 SignGenerator-old 的 ESLint 配置。
 *
 * 规则冲突时以 SignGenerator-old (eslint.config.js) 为准。
 * 风格来源（SignGenerator-old）：
 *  - .prettierrc.json: semi=false, singleQuote=true, jsxSingleQuote=false,
 *    tabWidth=2, printWidth=100, trailingComma=all, bracketSpacing=true,
 *    arrowParens=avoid, endOfLine=lf
 *  - tsconfig.json: strict / noUnusedLocals / noUnusedParameters / verbatimModuleSyntax
 *  - React 19 + jsx-runtime，路径别名 @/* -> ./src/*
 *  - 类型导入统一使用 `import type`
 *  - 自定义 Hook 必须用 useCallback/useMemo 包裹稳定引用
 */

const eslintConfig = defineConfig([
    // ----- Next.js 基础（提供 @next/eslint-plugin-next、jsx-a11y 等本仓库特有规则） -----
    ...nextVitals,
    ...nextTs,

    // ----- SignGenerator-old 基础 -----
    js.configs.recommended,
    ...tseslint.configs.recommended,

    // 合并忽略项（去重）
    globalIgnores([
        // 来自 eslint-config-next 默认忽略
        ".next/**",
        "out/**",
        "build/**",
        "next-env.d.ts",
        // 来自 SignGenerator-old
        "dist",
        "node_modules",
        "public",
        "*.cjs",
        "*.mjs",
        "pnpm-lock.yaml"
    ]),

    {
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            parserOptions: {
                ecmaFeatures: { jsx: true }
            },
            globals: {
                window: "readonly",
                document: "readonly",
                localStorage: "readonly",
                globalThis: "readonly",
                console: "readonly",
                Date: "readonly",
                Math: "readonly",
                JSON: "readonly",
                URL: "readonly",
                URLSearchParams: "readonly",
                Object: "readonly",
                Array: "readonly",
                Boolean: "readonly",
                String: "readonly",
                Number: "readonly",
                Error: "readonly"
            }
        },
        settings: {
            react: { version: "detect" }
        },
        plugins: {
            react,
            "react-hooks": reactHooks,
            import: importPlugin
        },
        rules: {
            ...react.configs.recommended.rules,
            ...reactHooks.configs.recommended.rules,

            // ===== TypeScript（对齐 tsconfig strict 系列） =====
            "@typescript-eslint/no-unused-vars": [
                "error",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
            ],
            "@typescript-eslint/consistent-type-imports": [
                "error",
                { prefer: "type-imports", fixStyle: "inline-type-imports" }
            ],
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/explicit-function-return-type": [
                "warn",
                { allowExpressions: true, allowConciseArrowFunctionExpressionsStartingWithVoid: true }
            ],
            "@typescript-eslint/ban-ts-comment": "warn",
            "@typescript-eslint/no-non-null-assertion": "warn",
            "@typescript-eslint/no-unused-expressions": [
                "error",
                { allowShortCircuit: true, allowTernary: true }
            ],

            // ===== React =====
            "react/react-in-jsx-scope": "off", // jsx-runtime
            "react/jsx-uses-react": "off",
            "react/jsx-uses-vars": "error",
            "react/jsx-filename-extension": ["error", { extensions: [".tsx"] }],
            "react/prop-types": "off", // 类型由 TS 保证
            "react/display-name": "off",
            "react/no-unknown-property": "off",
            "react/self-closing-comp": "error", // 无子节点必须自闭合
            "react/jsx-boolean-value": ["error", "never"], // 布尔属性不写 ={true}
            "react/jsx-curly-brace-presence": ["error", { props: "never", children: "never" }],

            // 自定义 Hook 规则
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",

            // ===== import / 排序 =====
            "import/no-unresolved": "off", // 交给 TS + vite 别名解析
            "import/named": "off",
            "import/order": [
                "warn",
                {
                    groups: [
                        "builtin",
                        "external",
                        "internal",
                        ["parent", "sibling", "index"],
                        "type"
                    ],
                    pathGroups: [
                        { pattern: "@/**", group: "internal", position: "after" },
                        { pattern: "react", group: "external", position: "before" }
                    ],
                    pathGroupsExcludedImportTypes: ["react"],
                    "newlines-between": "always",
                    alphabetize: { order: "asc", caseInsensitive: true }
                }
            ],
            "import/no-duplicates": "error",

            // ===== 通用代码风格 =====
            "no-console": "off",
            eqeqeq: ["error", "always", { null: "ignore" }],
            curly: ["error", "all"],
            "prefer-const": "error",
            "no-var": "error",
            "object-shorthand": "error",
            "dot-notation": "error",
            "no-trailing-spaces": "error",
            "no-multiple-empty-lines": ["error", { max: 1, maxBOF: 0, maxEOF: 0 }],

            // ===== 格式化规则（替代 Prettier，依据 .prettierrc.json） =====
            // 分号：不使用
            semi: ["error", "never"],
            // 单引号
            quotes: ["error", "single", { avoidEscape: true }],
            // JSX 属性使用双引号
            "jsx-quotes": ["error", "prefer-double"],
            // 缩进 2 空格
            indent: ["error", 2, { SwitchCase: 1 }],
            // 最大行宽 100
            "max-len": [
                "error",
                {
                    code: 100,
                    tabWidth: 2,
                    ignoreUrls: true,
                    ignoreStrings: true,
                    ignoreTemplateLiterals: true,
                    ignoreRegExpLiterals: true
                }
            ],
            // 尾逗号：全部
            "comma-dangle": [
                "error",
                {
                    arrays: "always-multiline",
                    objects: "always-multiline",
                    imports: "always-multiline",
                    exports: "always-multiline",
                    functions: "always-multiline"
                }
            ],
            // 对象/数组括号内侧保留空格
            "object-curly-spacing": ["error", "always"],
            "array-bracket-spacing": ["error", "never"],
            // 箭头函数参数：单参数省略括号
            "arrow-parens": ["error", "as-needed", { requireForBlockBody: true }],
            // 仓库文件在 Windows 工作区中使用 CRLF
            "linebreak-style": ["error", "windows"],
            // 文件末尾保留单个换行
            "eol-last": ["error", "always"],
            // 圆括号内无空格
            "space-in-parens": ["error", "never"],
            // 关键字前后空格（覆盖 next 配置中以 warn 设定的等价规则）
            "keyword-spacing": ["error", { before: true, after: true }],
            // 函数名与括号间无空格
            "space-before-function-paren": [
                "error",
                { anonymous: "always", named: "never", asyncArrow: "always" }
            ],
            // 逗号前无空格、后有空格
            "comma-spacing": ["error", { before: false, after: true }],
            // 运算符周围空格
            "space-infix-ops": "error",
            // 语句块首尾不换行
            "padded-blocks": ["error", "never"]
        }
    },

    {
        files: ["**/*.ts"],
        rules: {
            "react/prop-types": "off"
        }
    },

    // 非源码文件
    {
        files: ["**/*.{js,cjs,mjs}"],
        languageOptions: { sourceType: "module" }
    }
]);

export default eslintConfig;
