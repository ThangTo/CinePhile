/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primaryColor: "#ffd875",
        hoverPrimaryColor: "#fde68a",
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
      },
    },
  },
  plugins: [],
};
