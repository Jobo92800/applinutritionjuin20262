// Système de calcul des moyennes nutritionnelles personnalisées
// Basé sur les tableaux fournis avec les codes GEN, AGE, DEP, MET

export interface NutritionProfile {
  gender: 'homme' | 'femme';
  age: '18-30' | '31-50' | '51+';
  activityLevel: 'faible' | 'moderee' | 'elevee';
  metabolism: 'normal' | 'ralentissement';
}

export interface NutritionTargets {
  calories: { min: number; max: number };
  protein: { min: number; max: number };
  fat: { min: number; max: number };
  carbs: { min: number; max: number };
  percentages: {
    protein: number;
    fat: number;
    carbs: number;
  };
}

// Données nutritionnelles basées sur les tableaux fournis
const NUTRITION_DATA: Record<string, NutritionTargets> = {
  // FEMMES 18-30 ans
  'F-18-30-faible-normal': {
    calories: { min: 1500, max: 1700 },
    protein: { min: 95, max: 105 },
    fat: { min: 50, max: 55 },
    carbs: { min: 170, max: 190 },
    percentages: { protein: 25, fat: 30, carbs: 45 }
  },
  'F-18-30-faible-ralentissement': {
    calories: { min: 1350, max: 1550 },
    protein: { min: 100, max: 115 },
    fat: { min: 45, max: 50 },
    carbs: { min: 135, max: 155 },
    percentages: { protein: 30, fat: 30, carbs: 40 }
  },
  'F-18-30-moderee-normal': {
    calories: { min: 1650, max: 1850 },
    protein: { min: 100, max: 115 },
    fat: { min: 55, max: 60 },
    carbs: { min: 185, max: 210 },
    percentages: { protein: 25, fat: 30, carbs: 45 }
  },
  'F-18-30-moderee-ralentissement': {
    calories: { min: 1500, max: 1700 },
    protein: { min: 110, max: 125 },
    fat: { min: 50, max: 55 },
    carbs: { min: 150, max: 170 },
    percentages: { protein: 30, fat: 30, carbs: 40 }
  },
  'F-18-30-elevee-normal': {
    calories: { min: 1850, max: 2050 },
    protein: { min: 115, max: 125 },
    fat: { min: 60, max: 70 },
    carbs: { min: 205, max: 230 },
    percentages: { protein: 25, fat: 30, carbs: 45 }
  },
  'F-18-30-elevee-ralentissement': {
    calories: { min: 1700, max: 1900 },
    protein: { min: 125, max: 140 },
    fat: { min: 55, max: 65 },
    carbs: { min: 170, max: 190 },
    percentages: { protein: 30, fat: 30, carbs: 40 }
  },

  // FEMMES 31-50 ans
  'F-31-50-faible-normal': {
    calories: { min: 1400, max: 1600 },
    protein: { min: 85, max: 100 },
    fat: { min: 45, max: 55 },
    carbs: { min: 160, max: 180 },
    percentages: { protein: 25, fat: 30, carbs: 45 }
  },
  'F-31-50-faible-ralentissement': {
    calories: { min: 1250, max: 1450 },
    protein: { min: 95, max: 110 },
    fat: { min: 40, max: 50 },
    carbs: { min: 125, max: 145 },
    percentages: { protein: 30, fat: 30, carbs: 40 }
  },
  'F-31-50-moderee-normal': {
    calories: { min: 1550, max: 1750 },
    protein: { min: 95, max: 110 },
    fat: { min: 50, max: 60 },
    carbs: { min: 175, max: 200 },
    percentages: { protein: 25, fat: 30, carbs: 45 }
  },
  'F-31-50-moderee-ralentissement': {
    calories: { min: 1400, max: 1600 },
    protein: { min: 105, max: 120 },
    fat: { min: 45, max: 55 },
    carbs: { min: 140, max: 160 },
    percentages: { protein: 30, fat: 30, carbs: 40 }
  },
  'F-31-50-elevee-normal': {
    calories: { min: 1750, max: 1950 },
    protein: { min: 110, max: 120 },
    fat: { min: 55, max: 65 },
    carbs: { min: 195, max: 220 },
    percentages: { protein: 25, fat: 30, carbs: 45 }
  },
  'F-31-50-elevee-ralentissement': {
    calories: { min: 1600, max: 1800 },
    protein: { min: 120, max: 135 },
    fat: { min: 50, max: 60 },
    carbs: { min: 160, max: 180 },
    percentages: { protein: 30, fat: 30, carbs: 40 }
  },

  // FEMMES 51+ ans
  'F-51+-faible-normal': {
    calories: { min: 1300, max: 1500 },
    protein: { min: 80, max: 95 },
    fat: { min: 40, max: 50 },
    carbs: { min: 145, max: 170 },
    percentages: { protein: 25, fat: 30, carbs: 45 }
  },
  'F-51+-faible-ralentissement': {
    calories: { min: 1150, max: 1350 },
    protein: { min: 85, max: 100 },
    fat: { min: 40, max: 45 },
    carbs: { min: 115, max: 135 },
    percentages: { protein: 30, fat: 30, carbs: 40 }
  },
  'F-51+-moderee-normal': {
    calories: { min: 1450, max: 1650 },
    protein: { min: 90, max: 105 },
    fat: { min: 45, max: 55 },
    carbs: { min: 165, max: 185 },
    percentages: { protein: 25, fat: 30, carbs: 45 }
  },
  'F-51+-moderee-ralentissement': {
    calories: { min: 1300, max: 1500 },
    protein: { min: 95, max: 110 },
    fat: { min: 40, max: 50 },
    carbs: { min: 130, max: 150 },
    percentages: { protein: 30, fat: 30, carbs: 40 }
  },
  'F-51+-elevee-normal': {
    calories: { min: 1650, max: 1850 },
    protein: { min: 100, max: 115 },
    fat: { min: 55, max: 60 },
    carbs: { min: 185, max: 210 },
    percentages: { protein: 25, fat: 30, carbs: 45 }
  },
  'F-51+-elevee-ralentissement': {
    calories: { min: 1500, max: 1700 },
    protein: { min: 110, max: 125 },
    fat: { min: 50, max: 55 },
    carbs: { min: 150, max: 170 },
    percentages: { protein: 30, fat: 30, carbs: 40 }
  },

  // HOMMES 18-30 ans
  'M-18-30-faible-normal': {
    calories: { min: 1900, max: 2100 },
    protein: { min: 120, max: 130 },
    fat: { min: 65, max: 70 },
    carbs: { min: 215, max: 235 },
    percentages: { protein: 25, fat: 30, carbs: 45 }
  },
  'M-18-30-faible-ralentissement': {
    calories: { min: 1750, max: 1950 },
    protein: { min: 130, max: 145 },
    fat: { min: 55, max: 65 },
    carbs: { min: 175, max: 195 },
    percentages: { protein: 30, fat: 30, carbs: 40 }
  },
  'M-18-30-moderee-normal': {
    calories: { min: 2050, max: 2250 },
    protein: { min: 130, max: 140 },
    fat: { min: 70, max: 75 },
    carbs: { min: 230, max: 255 },
    percentages: { protein: 25, fat: 30, carbs: 45 }
  },
  'M-18-30-moderee-ralentissement': {
    calories: { min: 1900, max: 2100 },
    protein: { min: 140, max: 160 },
    fat: { min: 65, max: 70 },
    carbs: { min: 190, max: 210 },
    percentages: { protein: 30, fat: 30, carbs: 40 }
  },
  'M-18-30-elevee-normal': {
    calories: { min: 2250, max: 2450 },
    protein: { min: 140, max: 155 },
    fat: { min: 75, max: 80 },
    carbs: { min: 255, max: 275 },
    percentages: { protein: 25, fat: 30, carbs: 45 }
  },
  'M-18-30-elevee-ralentissement': {
    calories: { min: 2100, max: 2300 },
    protein: { min: 155, max: 170 },
    fat: { min: 70, max: 75 },
    carbs: { min: 210, max: 230 },
    percentages: { protein: 30, fat: 30, carbs: 40 }
  },

  // HOMMES 31-50 ans
  'M-31-50-faible-normal': {
    calories: { min: 1800, max: 2000 },
    protein: { min: 110, max: 125 },
    fat: { min: 60, max: 65 },
    carbs: { min: 200, max: 225 },
    percentages: { protein: 25, fat: 30, carbs: 45 }
  },
  'M-31-50-faible-ralentissement': {
    calories: { min: 1650, max: 1850 },
    protein: { min: 125, max: 140 },
    fat: { min: 55, max: 60 },
    carbs: { min: 165, max: 185 },
    percentages: { protein: 30, fat: 30, carbs: 40 }
  },
  'M-31-50-moderee-normal': {
    calories: { min: 1950, max: 2150 },
    protein: { min: 120, max: 135 },
    fat: { min: 65, max: 70 },
    carbs: { min: 220, max: 240 },
    percentages: { protein: 25, fat: 30, carbs: 45 }
  },
  'M-31-50-moderee-ralentissement': {
    calories: { min: 1800, max: 2000 },
    protein: { min: 135, max: 150 },
    fat: { min: 60, max: 65 },
    carbs: { min: 180, max: 200 },
    percentages: { protein: 30, fat: 30, carbs: 40 }
  },
  'M-31-50-elevee-normal': {
    calories: { min: 2150, max: 2350 },
    protein: { min: 130, max: 145 },
    fat: { min: 70, max: 80 },
    carbs: { min: 245, max: 265 },
    percentages: { protein: 25, fat: 30, carbs: 45 }
  },
  'M-31-50-elevee-ralentissement': {
    calories: { min: 2000, max: 2200 },
    protein: { min: 150, max: 165 },
    fat: { min: 65, max: 75 },
    carbs: { min: 200, max: 220 },
    percentages: { protein: 30, fat: 30, carbs: 40 }
  },

  // HOMMES 51+ ans
  'M-51+-faible-normal': {
    calories: { min: 1700, max: 1900 },
    protein: { min: 105, max: 120 },
    fat: { min: 55, max: 65 },
    carbs: { min: 190, max: 215 },
    percentages: { protein: 25, fat: 30, carbs: 45 }
  },
  'M-51+-faible-ralentissement': {
    calories: { min: 1550, max: 1750 },
    protein: { min: 115, max: 130 },
    fat: { min: 50, max: 60 },
    carbs: { min: 155, max: 175 },
    percentages: { protein: 30, fat: 30, carbs: 40 }
  },
  'M-51+-moderee-normal': {
    calories: { min: 1850, max: 2050 },
    protein: { min: 115, max: 125 },
    fat: { min: 60, max: 70 },
    carbs: { min: 210, max: 230 },
    percentages: { protein: 25, fat: 30, carbs: 45 }
  },
  'M-51+-moderee-ralentissement': {
    calories: { min: 1700, max: 1900 },
    protein: { min: 125, max: 140 },
    fat: { min: 55, max: 65 },
    carbs: { min: 170, max: 190 },
    percentages: { protein: 30, fat: 30, carbs: 40 }
  },
  'M-51+-elevee-normal': {
    calories: { min: 2050, max: 2250 },
    protein: { min: 130, max: 140 },
    fat: { min: 65, max: 75 },
    carbs: { min: 230, max: 255 },
    percentages: { protein: 25, fat: 30, carbs: 45 }
  },
  'M-51+-elevee-ralentissement': {
    calories: { min: 1900, max: 2100 },
    protein: { min: 140, max: 160 },
    fat: { min: 65, max: 70 },
    carbs: { min: 190, max: 210 },
    percentages: { protein: 30, fat: 30, carbs: 40 }
  }
};

export function calculateNutritionTargets(profile: NutritionProfile): NutritionTargets {
  // Convertir le genre en code
  const genderCode = profile.gender === 'homme' ? 'M' : 'F';
  
  // Créer la clé pour rechercher dans les données
  const key = `${genderCode}-${profile.age}-${profile.activityLevel}-${profile.metabolism}`;
  
  // Récupérer les données nutritionnelles
  const targets = NUTRITION_DATA[key];
  
  if (!targets) {
    console.warn(`Aucune donnée trouvée pour le profil: ${key}`);
    // Retourner des valeurs par défaut
    return {
      calories: { min: 1500, max: 2000 },
      protein: { min: 80, max: 120 },
      fat: { min: 50, max: 70 },
      carbs: { min: 150, max: 200 },
      percentages: { protein: 25, fat: 30, carbs: 45 }
    };
  }
  
  return targets;
}

export function getNutritionRecommendations(profile: NutritionProfile) {
  const targets = calculateNutritionTargets(profile);
  
  return {
    dailyTargets: {
      calories: Math.round((targets.calories.min + targets.calories.max) / 2),
      protein: Math.round((targets.protein.min + targets.protein.max) / 2),
      fat: Math.round((targets.fat.min + targets.fat.max) / 2),
      carbs: Math.round((targets.carbs.min + targets.carbs.max) / 2)
    },
    ranges: targets,
    percentages: targets.percentages
  };
}