import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: ["_ref-agent-auth/**", ".t3-sdk-audit/**"],
  },
  ...nextVitals,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
