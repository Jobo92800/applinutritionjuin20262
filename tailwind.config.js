/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /*
          Charte MAbeautyplus, la même que l'application thérapeute (V2) :
          le teal porte l'interface, le magenta reste réservé aux gestes qui
          engagent, le gris tire vers le vert-de-gris du teal.
        */
        marine: {
          50: '#F4FBFB', 100: '#EAF7F7', 200: '#D3EFEF', 300: '#A9E0E0',
          400: '#6FCDCD', 500: '#3BBFBF', 600: '#2AA5A5', 700: '#1F8484',
          800: '#166363', 900: '#0F4344', 950: '#0A2E2F',
        },
        rose: {
          50: '#FEF1F7', 100: '#FDE3EF', 200: '#FBC7DF', 300: '#F79BC6',
          400: '#F160A4', 500: '#E8318A', 600: '#CE1E73', 700: '#AB135D',
          800: '#8B124D', 900: '#741343', 950: '#470723',
        },
        ardoise: {
          50: '#FAFDFD', 100: '#F4FBFB', 200: '#E6EFEF', 300: '#CAD6D6',
          400: '#9BABAB', 500: '#7C9091', 600: '#5E7273', 700: '#41595A',
          800: '#2A4142', 900: '#152B2C', 950: '#0B1819',
        },
        /*
          L'application a été écrite avec les palettes par défaut de Tailwind
          (green, purple, pink, gray). Plutôt que de retoucher trente écrans,
          on redéfinit ces noms : green devient le teal, purple et pink le
          magenta, gray l'ardoise. Un bg-green-600 existant est désormais teal.
        */
        green: {
          50: '#F4FBFB', 100: '#EAF7F7', 200: '#D3EFEF', 300: '#A9E0E0',
          400: '#6FCDCD', 500: '#3BBFBF', 600: '#2AA5A5', 700: '#1F8484',
          800: '#166363', 900: '#0F4344', 950: '#0A2E2F',
        },
        purple: {
          50: '#FEF1F7', 100: '#FDE3EF', 200: '#FBC7DF', 300: '#F79BC6',
          400: '#F160A4', 500: '#E8318A', 600: '#CE1E73', 700: '#AB135D',
          800: '#8B124D', 900: '#741343', 950: '#470723',
        },
        pink: {
          50: '#FEF1F7', 100: '#FDE3EF', 200: '#FBC7DF', 300: '#F79BC6',
          400: '#F160A4', 500: '#E8318A', 600: '#CE1E73', 700: '#AB135D',
          800: '#8B124D', 900: '#741343', 950: '#470723',
        },
        gray: {
          50: '#FAFDFD', 100: '#F4FBFB', 200: '#E6EFEF', 300: '#CAD6D6',
          400: '#9BABAB', 500: '#7C9091', 600: '#5E7273', 700: '#41595A',
          800: '#2A4142', 900: '#152B2C', 950: '#0B1819',
        },
        /* Les autres teintes décoratives se rabattent sur les deux couleurs de la marque. */
        blue:    { 50: '#F4FBFB', 100: '#EAF7F7', 200: '#D3EFEF', 300: '#A9E0E0', 400: '#6FCDCD', 500: '#3BBFBF', 600: '#2AA5A5', 700: '#1F8484', 800: '#166363', 900: '#0F4344' },
        indigo:  { 50: '#F4FBFB', 100: '#EAF7F7', 200: '#D3EFEF', 300: '#A9E0E0', 400: '#6FCDCD', 500: '#3BBFBF', 600: '#2AA5A5', 700: '#1F8484', 800: '#166363', 900: '#0F4344' },
        cyan:    { 50: '#F4FBFB', 100: '#EAF7F7', 200: '#D3EFEF', 300: '#A9E0E0', 400: '#6FCDCD', 500: '#3BBFBF', 600: '#2AA5A5', 700: '#1F8484', 800: '#166363', 900: '#0F4344' },
        emerald: { 50: '#F4FBFB', 100: '#EAF7F7', 200: '#D3EFEF', 300: '#A9E0E0', 400: '#6FCDCD', 500: '#3BBFBF', 600: '#2AA5A5', 700: '#1F8484', 800: '#166363', 900: '#0F4344' },
        /* Plus de jaune : il se rabat sur le teal pâle. */
        yellow:  { 50: '#F4FBFB', 100: '#EAF7F7', 200: '#D3EFEF', 300: '#A9E0E0', 400: '#6FCDCD', 500: '#3BBFBF', 600: '#2AA5A5', 700: '#1F8484', 800: '#166363', 900: '#0F4344' },
        /* Le rouge des erreurs et des suppressions, adouci vers le rosé. */
        red:     { 50: '#FDF3F4', 100: '#FBE5E8', 200: '#F6CBD1', 300: '#EEA4AE', 400: '#E47686', 500: '#D9556A', 600: '#C43F55', 700: '#A33146', 800: '#872A3C', 900: '#712636' },
        orange:  { 50: '#FEF1F7', 100: '#FDE3EF', 200: '#FBC7DF', 300: '#F79BC6', 400: '#F160A4', 500: '#E8318A', 600: '#CE1E73', 700: '#AB135D', 800: '#8B124D', 900: '#741343' },
        violet:  { 50: '#FEF1F7', 100: '#FDE3EF', 200: '#FBC7DF', 300: '#F79BC6', 400: '#F160A4', 500: '#E8318A', 600: '#CE1E73', 700: '#AB135D', 800: '#8B124D', 900: '#741343' },
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
      },
      /* Coins généreux : ce que l'app appelle lg/xl/2xl s'arrondit un cran de plus. */
      borderRadius: {
        lg: '0.75rem', xl: '1rem', '2xl': '1.25rem', '3xl': '1.75rem',
      },
      boxShadow: {
        carte: '0 1px 2px rgba(21,43,44,.04), 0 10px 30px -22px rgba(21,43,44,.32)',
      },
    },
  },
  plugins: [],
};
