/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./contexts/**/*.{js,ts,jsx,tsx}",
        "./hooks/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./styles/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    light: '#4da6ff',
                    DEFAULT: '#0066cc',
                    dark: '#004c99',
                },
                secondary: {
                    light: '#ff80bf',
                    DEFAULT: '#ff0080',
                    dark: '#b30059',
                },
                dark: {
                    bg: '#141414',
                    card: '#1f1f1f',
                    text: '#f5f5f5',
                    muted: '#a3a3a3',
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
    darkMode: 'class',
}
