// npm_config_local_prefix is set by npm to the package root (rubahrumah/)
// This works around Turbopack spawning PostCSS subprocess with wrong cwd
const base =
  process.env.npm_config_local_prefix ||
  process.env.INIT_CWD ||
  process.cwd();

const config = {
  plugins: {
    "@tailwindcss/postcss": { base },
  },
};

export default config;
