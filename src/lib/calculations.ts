import { FoodItem, Entry, NutritionTotals, QtyUnit } from '../types';

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const formatNumber = (num: number, decimals: number = 1): string => {
  return num.toFixed(decimals);
};

export const formatDateBR = (dateISO: string): string => {
  const [year, month, day] = dateISO.split('-');
  return `${day}/${month}/${year}`;
};

export const isValidISODate = (dateString: string): boolean => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime()) && date.toISOString().split('T')[0] === dateString;
};

export const calculateNutrition = (food: FoodItem, qty: number, unit: QtyUnit): NutritionTotals => {
  // Validações de segurança
  if (!food || !qty || qty <= 0 || !food.per || food.per <= 0) {
    return { protein_g: 0, carbs_g: 0, fat_g: 0, kcal: 0, water_ml: 0 };
  }

  // Garantir que os valores nutricionais existem
  const protein_g = food.protein_g || 0;
  const carbs_g = food.carbs_g || 0;
  const fat_g = food.fat_g || 0;
  const kcal = food.kcal || 0;

  let factor: number;
  
  if (unit === 'g' || unit === 'ml') {
    // Quantidade já está em gramas ou ml
    factor = qty / food.per;
  } else {
    // Converter de Kg/L para g/ml
    const qtyInGrams = unit === 'Kg' ? qty * 1000 : qty * 1000;
    factor = qtyInGrams / food.per;
  }
  
  // Se for ml e o alimento tem densidade, converter para gramas
  if (unit === 'ml' && food.density_g_per_ml && food.density_g_per_ml > 0) {
    factor = (qty * food.density_g_per_ml) / food.per;
  }
  
  // Verificar se o factor é válido
  if (isNaN(factor) || !isFinite(factor)) {
    return { protein_g: 0, carbs_g: 0, fat_g: 0, kcal: 0, water_ml: 0 };
  }
  
  return {
    protein_g: Math.round((protein_g * factor) * 100) / 100,
    carbs_g: Math.round((carbs_g * factor) * 100) / 100,
    fat_g: Math.round((fat_g * factor) * 100) / 100,
    kcal: Math.round((kcal * factor) * 100) / 100,
    water_ml: unit === 'ml' ? qty : 0
  };
};

export const calculateTotals = (entries: Entry[]): NutritionTotals => {
  return entries.reduce((totals, entry) => ({
    protein_g: totals.protein_g + entry.protein_g,
    carbs_g: totals.carbs_g + entry.carbs_g,
    fat_g: totals.fat_g + entry.fat_g,
    kcal: totals.kcal + entry.kcal,
    water_ml: totals.water_ml + (entry.foodId === 'agua' ? entry.qty : 0)
  }), { protein_g: 0, carbs_g: 0, fat_g: 0, kcal: 0, water_ml: 0 });
};

export const calculateDailyAverages = (entries: Entry[], startDate: string, endDate: string): NutritionTotals => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  
  const totals = calculateTotals(entries);
  
  return {
    protein_g: Math.round((totals.protein_g / days) * 100) / 100,
    carbs_g: Math.round((totals.carbs_g / days) * 100) / 100,
    fat_g: Math.round((totals.fat_g / days) * 100) / 100,
    kcal: Math.round((totals.kcal / days) * 100) / 100,
    water_ml: Math.round((totals.water_ml / days) * 100) / 100
  };
};
