/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /*
          La charte MAbeautyplus, septembre 2026. L'aqua structure, le rose
          décide, l'ardoise écrit.

          Les valeurs commentées sont les **jetons de la charte**, repris au
          hexadécimal près. Les crans intermédiaires, que la charte ne nomme
          pas mais qu'une échelle Tailwind réclame, sont interpolés en Lab
          entre deux jetons voisins : aucune teinte n'est inventée à côté de
          la palette, elles sont toutes sur sa rampe.
        */
        marine: {
          50: '#F4FBFB',  /* wash        */ 100: '#EAF7F7', /* wash-2      */
          150: '#E4F2F2', /* rail        */ 200: '#D3EFEF',
          250: '#A8DEDE', /* filet-aqua  */ 300: '#ABE2E1',
          400: '#7FD4D4', /* aqua-clair  */ 500: '#3BBFBF', /* aqua        */
          600: '#2AA5A5', /* aqua-profond — aplats seulement, 3,0:1 */
          700: '#1F7F7F', /* aqua-texte — l'aqua qui écrit, 4,8:1   */
          800: '#175A5C', /* profond-bas */ 900: '#0F4344', /* aqua-encre  */
          950: '#152B2C', /* encre       */
        },
        rose: {
          50: '#FEF3F8',  /* rose-wash   */ 100: '#FBE8F1',
          200: '#F6D3E4', /* filet-rose  */ 300: '#F6A5C5',
          400: '#F173A7', 500: '#E8318A', /* rose — l'action */
          600: '#C42872', /* rose-texte  */ 700: '#A4105C',
          800: '#8B004B', 900: '#75003C', 950: '#4A0026',
        },
        ardoise: {
          50: '#FAFDFD', 100: '#F4FBFB', /* wash */ 200: '#E6EFEF', /* filet */
          300: '#C0CCCC', 400: '#9BABAB', /* gris-doux */ 500: '#7C9091', /* gris */
          600: '#5E7475', 700: '#41595A', /* texte */ 800: '#2A4142',
          900: '#152B2C', /* encre */ 950: '#0B1819',
        },
        /*
          L'application a été écrite avec les palettes par défaut de Tailwind
          (green, purple, pink, gray). Plutôt que de retoucher trente écrans,
          on redéfinit ces noms : green devient le teal, purple et pink le
          magenta, gray l'ardoise. Un bg-green-600 existant est désormais teal.
        */
        green:  { 50: '#F4FBFB', 100: '#EAF7F7', 150: '#E4F2F2', 200: '#D3EFEF', 250: '#A8DEDE', 300: '#ABE2E1', 400: '#7FD4D4', 500: '#3BBFBF', 600: '#2AA5A5', 700: '#1F7F7F', 800: '#175A5C', 900: '#0F4344' },
        purple: { 50: '#FEF3F8', 100: '#FBE8F1', 200: '#F6D3E4', 300: '#F6A5C5', 400: '#F173A7', 500: '#E8318A', 600: '#C42872', 700: '#A4105C', 800: '#8B004B', 900: '#75003C' },
        pink:   { 50: '#FEF3F8', 100: '#FBE8F1', 200: '#F6D3E4', 300: '#F6A5C5', 400: '#F173A7', 500: '#E8318A', 600: '#C42872', 700: '#A4105C', 800: '#8B004B', 900: '#75003C' },
        gray: {
          50: '#FAFDFD', 100: '#F4FBFB', /* wash */ 200: '#E6EFEF', /* filet */
          300: '#C0CCCC', 400: '#9BABAB', /* gris-doux */ 500: '#7C9091', /* gris */
          600: '#5E7475', 700: '#41595A', /* texte */ 800: '#2A4142',
          900: '#152B2C', /* encre */ 950: '#0B1819',
        },
        /* Les autres teintes décoratives se rabattent sur les deux couleurs de la marque. */
        blue:    { 50: '#F4FBFB', 100: '#EAF7F7', 150: '#E4F2F2', 200: '#D3EFEF', 250: '#A8DEDE', 300: '#ABE2E1', 400: '#7FD4D4', 500: '#3BBFBF', 600: '#2AA5A5', 700: '#1F7F7F', 800: '#175A5C', 900: '#0F4344' },
        indigo:  { 50: '#F4FBFB', 100: '#EAF7F7', 150: '#E4F2F2', 200: '#D3EFEF', 250: '#A8DEDE', 300: '#ABE2E1', 400: '#7FD4D4', 500: '#3BBFBF', 600: '#2AA5A5', 700: '#1F7F7F', 800: '#175A5C', 900: '#0F4344' },
        cyan:    { 50: '#F4FBFB', 100: '#EAF7F7', 150: '#E4F2F2', 200: '#D3EFEF', 250: '#A8DEDE', 300: '#ABE2E1', 400: '#7FD4D4', 500: '#3BBFBF', 600: '#2AA5A5', 700: '#1F7F7F', 800: '#175A5C', 900: '#0F4344' },
        emerald: { 50: '#F4FBFB', 100: '#EAF7F7', 150: '#E4F2F2', 200: '#D3EFEF', 250: '#A8DEDE', 300: '#ABE2E1', 400: '#7FD4D4', 500: '#3BBFBF', 600: '#2AA5A5', 700: '#1F7F7F', 800: '#175A5C', 900: '#0F4344' },
        /* Plus de jaune : il se rabat sur le teal pâle. */
        yellow:  { 50: '#F4FBFB', 100: '#EAF7F7', 150: '#E4F2F2', 200: '#D3EFEF', 250: '#A8DEDE', 300: '#ABE2E1', 400: '#7FD4D4', 500: '#3BBFBF', 600: '#2AA5A5', 700: '#1F7F7F', 800: '#175A5C', 900: '#0F4344' },
        /* Le rouge des erreurs : teintes douces, encre = `erreur` #C0392B de la charte. */
        red:     { 50: '#FDF4F3', 100: '#FAE0DB', 200: '#F2B7AC', 300: '#E58F7E', 400: '#D46654', 500: '#C0392B', 600: '#C0392B', 700: '#9A362B', 800: '#7C332B', 900: '#5D312C' },
        orange:  { 50: '#FEF3F8', 100: '#FBE8F1', 200: '#F6D3E4', 300: '#F6A5C5', 400: '#F173A7', 500: '#E8318A', 600: '#C42872', 700: '#A4105C', 800: '#8B004B', 900: '#75003C' },
        violet:  { 50: '#FEF3F8', 100: '#FBE8F1', 200: '#F6D3E4', 300: '#F6A5C5', 400: '#F173A7', 500: '#E8318A', 600: '#C42872', 700: '#A4105C', 800: '#8B004B', 900: '#75003C' },
        /*
          Les jetons de la charte sous leur vrai nom, pour tout ce qu'on écrit
          désormais : `bg-mab-rail`, `text-mab-aqua-texte`, `border-mab-filet`…
          Les alias ci-dessus restent pour l'existant, avec les mêmes valeurs.
        */
        mab: {
          blanc: '#ffffff',
          wash: '#f4fbfb', 'wash-2': '#eaf7f7', 'wash-halo': '#e7f7f7',
          'rose-wash': '#fef3f8', 'violet-wash': '#f2eefa',
          rail: '#e4f2f2', filet: '#e6efef',
          'filet-aqua': '#a8dede', 'filet-violet': '#cfc0e8', 'filet-rose': '#f6d3e4',
          aqua: '#3bbfbf', 'aqua-profond': '#2aa5a5', 'aqua-texte': '#1f7f7f',
          'aqua-encre': '#0f4344', 'aqua-clair': '#7fd4d4',
          rose: '#e8318a', 'rose-texte': '#c42872',
          violet: '#8e6fc6', 'violet-texte': '#7a5cb5',
          encre: '#152b2c', texte: '#41595a', gris: '#7c9091', 'gris-doux': '#9babab',
          'profond-haut': '#0f4344', 'profond-bas': '#175a5c',
          'profond-texte': '#cfeded', 'profond-doux': '#9fdcdc', 'profond-source': '#7fa8a8',
          'terrain-1-fond': '#e7f7f7', 'terrain-1-filet': '#b0e0e0', 'terrain-1-texte': '#1f7f7f',
          'terrain-2-fond': '#edf3f9', 'terrain-2-filet': '#c6daea', 'terrain-2-texte': '#3d6e93',
          'terrain-3-fond': '#f2eefa', 'terrain-3-filet': '#cfc0e8', 'terrain-3-texte': '#6b52a0',
          'terrain-4-fond': '#f9edf6', 'terrain-4-filet': '#e5c5dd', 'terrain-4-texte': '#8e3c80',
          'terrain-5-fond': '#fef0f6', 'terrain-5-filet': '#f6cfe2', 'terrain-5-texte': '#c42872',
          succes: '#1f8a5f', erreur: '#c0392b',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'Segoe UI', '-apple-system', 'BlinkMacSystemFont', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      /*
        Les rayons canoniques de la charte. `2xl` porte la carte (18px, le
        rayon web et application — le 20px est celui des présentations, on ne
        mélange pas les deux) ; les autres classes de l'app s'alignent sur
        l'échelle : visuel 12, champ 14, encadré 22.
      */
      borderRadius: {
        lg: '12px',   /* radius-visuel   */
        xl: '14px',   /* radius-champ    */
        '2xl': '18px',/* radius-carte    */
        '3xl': '22px',/* radius-encadre  */
      },
      /* Les quatre ombres du système, toutes décalées vers le haut. */
      boxShadow: {
        carte: '0 6px 16px -10px rgba(21,43,44,.28)',
        flottante: '0 16px 36px -24px rgba(21,43,44,.5)',
        cta: '0 10px 26px -10px rgba(232,49,138,.5)',
        profonde: '0 14px 30px -14px rgba(0,0,0,.7)',
      },
      /* Les trois dégradés de la marque : il n'y en a pas d'autres. */
      backgroundImage: {
        'degrade-marque': 'linear-gradient(90deg, #3bbfbf 0%, #8e6fc6 55%, #e8318a 100%)',
        'degrade-profond': 'linear-gradient(158deg, #0f4344 0%, #175a5c 100%)',
        'halo-haut': 'radial-gradient(1350px 620px at 50% -250px, #e7f7f7 0%, rgba(231,247,247,0) 70%)',
      },
      maxWidth: { texte: '680px', formulaire: '720px' },
    },
  },
  plugins: [],
};
