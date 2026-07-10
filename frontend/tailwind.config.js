/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // We can map Tailwind color aliases to our index.css CSS variables
        "bg-primary": "var(--bg-primary)",
        "bg-secondary": "var(--bg-secondary)",
        "surface": "var(--surface)",
        "surface-border": "var(--surface-border)",
        "surface-hover": "var(--surface-hover)",
        "primary": "var(--primary)",
        "secondary": "var(--secondary)",
        "accent": "var(--accent)",
      }
    },
  },
  plugins: [],
}
