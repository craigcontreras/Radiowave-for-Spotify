/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{svelte,html,js}",
  ],
  theme: {
    extend: {
      colors: {
        "theme-color": "var(--theme-color)",
      }
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["business"],
    darkTheme: "business"
  }
}