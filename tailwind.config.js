/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#567ac7",
        "primary-dark": "#405b94",
        "background-light": "#f6f7f8",
        "background-dark": "#14171e",
        "surface-light": "#ffffff",
        "surface-dark": "#1a2235",
      },
      fontFamily: {
        display: ["Inter", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        full: "9999px",
      },
      boxShadow: {
        soft: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
        card: "0 10px 30px -5px rgba(0, 0, 0, 0.08)",
        glow: "0 4px 20px -2px rgba(86, 122, 199, 0.25)",
      },
    },
  },
  plugins: [],
}
