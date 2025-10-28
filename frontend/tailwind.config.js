/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Noto Sans",
          "Liberation Sans",
          "Arial",
          "sans-serif",
          "Apple Color Emoji",
          "Segoe UI Emoji",
          "Segoe UI Symbol",
          "Noto Color Emoji",
        ],
      },
      colors: {
        bgColor: "#191b24",
        bgColor2: "#282B3A",
        bgColor3: "#ffffff10",
        primaryColor: "#ffd875",
        hoverPrimaryColor: "#fde68a",
        hoverLinkColor: "#22d3ee",
        primaryColorButtonText: "#191B24",

        borderColor: "#ffffff10",
        account: {
          bg: {
            primary: "#121212",
            secondary: "#1e1e1e",
            tertiary: "#2a2a2a",
          },
          text: {
            primary: "#e0e0e0",
            secondary: "#a0a0a0",
          },
          accent: "#f3bf1a",
          border: "#333333",
        },
      },
      animation: {
        spin: "spin 1s linear infinite",
        "modal-slide-in": "modalSlideIn 0.3s ease-out",
        fadeIn: "fadeIn 0.2s ease-out",
        "pop-up": "popUp 0.4s ease forwards",
        slideDown: "slideDown 0.3s ease-out",
      },
      keyframes: {
        spin: {
          to: { transform: "rotate(360deg)" },
        },
        modalSlideIn: {
          from: {
            opacity: "0",
            transform: "translateY(-20px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        fadeIn: {
          from: {
            opacity: "0",
            transform: "scale(0.95) translateY(-10px)",
          },
          to: {
            opacity: "1",
            transform: "scale(1) translateY(0)",
          },
        },
        popUp: {
          "0%": {
            transform: "scale(0.5)",
            opacity: "0",
          },
          "60%": {
            transform: "scale(1.005)",
            opacity: "1",
          },
          "100%": {
            transform: "scale(1)",
          },
        },
        slideDown: {
          "0%": {
            opacity: "0",
            transform: "translateY(-20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
      },
    },
  },
  plugins: [],
};
