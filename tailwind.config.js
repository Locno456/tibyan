/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tibyan: {
          // True brand kit - from tokens.css
          turquoise300: "#19D6C4",
          turquoise500: "#0A8F94",
          teal900: "#05495A",
          blue600: "#14529E",
          blue900: "#0F2A5C",
          gold100: "#FFF0B8",
          gold500: "#E0B450",
          ink: "#0A2A33",
          violet: "#7B4FD6",
          // Legacy mapping for compatibility
          blue: "#14529E", // was #2563EB - now true blue trust
          blueDark: "#0F2A5C",
          blueLight: "#C9DFE1",
          blueSoft: "#EEF6F6",
          turquoise: "#0A8F94", // was #06B6D4 - now true turquoise islam
          turquoiseDeep: "#05495A",
          turquoiseLight: "#19D6C4",
          purple: "#7B4FD6", // was #7C3AED - now true violet AI
          purpleDeep: "#6D28D9",
          purpleLight: "#DDD6FE",
          bg: "#EEF6F6", // was #F8FAFF - now true light bg
          bgLight: "#FFFFFF",
          navy: "#0A2A33",
        }
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '24px',
        '3xl': '28px',
      },
      boxShadow: {
        'soft': '0 8px 28px rgba(10,143,148,0.07)',
        'glow-blue': '0 0 0 1px rgba(20,82,158,0.05), 0 8px 24px rgba(20,82,158,0.12)',
        'glow-purple': '0 0 0 1px rgba(123,79,214,0.05), 0 8px 24px rgba(123,79,214,0.12)',
      }
    },
  },
  plugins: [],
}
