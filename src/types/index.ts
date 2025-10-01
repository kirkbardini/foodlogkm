export type UserId = 'kirk' | 'manu';

export type QtyUnit = 'g' | 'ml' | 'Kg' | 'L';
export type MealType = 'cafe-da-manha' | 'almoco' | 'lanche' | 'jantar' | 'outros';

export interface FoodItem {
  id: string;
  name: string;
  category: string;
  per: number;              // por 100g ou 100ml
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  kcal: number;
  density_g_per_ml?: number; // para conversão ml <-> g
  updatedAt?: number;        // timestamp da última atualização
  createdAt?: number;         // timestamp da criação
}

export interface Entry {
  id: string;
  userId: UserId;
  dateISO: string;          // '2025-09-22'
  foodId: string;
  qty: number;              // em Kg ou L conforme unit
  unit: QtyUnit;            // 'Kg' | 'L'
  mealType: MealType;       // Tipo de refeição
  note?: string;
  // valores calculados e "congelados" no momento do lançamento (para histórico imutável)
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  kcal: number;
  water_ml: number;
  updatedAt?: number;       // timestamp da última atualização
  createdAt?: number;        // timestamp da criação
}

export interface UserPrefs {
  id: UserId;
  name: string;
  goals: {
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    kcal: number;
    water_ml: number;
  };
  dailyGoalFactor?: number; // Fator multiplicador para metas diárias
  weeklyGoalFactor?: number; // Fator multiplicador para metas semanais
  monthlyGoalFactor?: number; // Fator multiplicador para metas mensais
  minimumRequirements?: {
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    kcal: number;
  };
}

export interface AppSettings {
  theme: 'light' | 'dark';
  language: 'pt' | 'en';
  defaultUnit: QtyUnit;
}

export interface NutritionTotals {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  kcal: number;
  water_ml: number;
}

export interface CalorieExpenditure {
  id: string;
  userId: UserId;
  dateISO: string;        // '2025-01-15'
  calories_burned: number;
  source: 'garmin' | 'manual';
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppStateBackup {
  foods: FoodItem[];
  entries: Entry[];
  calorieExpenditure: CalorieExpenditure[];
  users: UserPrefs[];
  settings: AppSettings;
  version: string;
  timestamp: string;
}
