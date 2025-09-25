import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '../ui/Card';
import { CompactNutritionCard } from '../ui/CompactNutritionCard';
import { Button } from '../ui/Button';
import { formatNumber } from '../../lib/calculations';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { format, startOfWeek, endOfWeek, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WeeklyReportProps {
  weekStart: Date;
  onWeekChange: (newWeekStart: Date) => void;
}

export const WeeklyReport: React.FC<WeeklyReportProps> = ({ weekStart, onWeekChange }) => {
  const { currentUser, users, getEntriesForDateRange } = useAppStore();
  
  const currentUserData = users.find(u => u.id === currentUser);
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 }); // Segunda-feira
  
  const dailyGoal = currentUserData?.goals || {
    protein_g: 160,
    carbs_g: 220,
    fat_g: 60,
    kcal: 2400,
    water_ml: 3000
  };

  // Gerar dados dos 7 dias da semana
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const dateISO = format(date, 'yyyy-MM-dd');
    const entries = getEntriesForDateRange(currentUser, dateISO, dateISO);
    
    const totals = entries.reduce((sum, entry) => ({
      protein_g: sum.protein_g + entry.protein_g,
      carbs_g: sum.carbs_g + entry.carbs_g,
      fat_g: sum.fat_g + entry.fat_g,
      kcal: sum.kcal + entry.kcal,
      water_ml: sum.water_ml + (entry.foodId === 'agua' ? entry.qty : 0)
    }), { protein_g: 0, carbs_g: 0, fat_g: 0, kcal: 0, water_ml: 0 });
    
    return {
      date: dateISO,
      dayName: format(date, 'EEE', { locale: ptBR }),
      dayNumber: format(date, 'dd'),
      ...totals
    };
  });

  // Calcular totais da semana
  const weekTotals = dailyData.reduce((sum, day) => ({
    protein_g: sum.protein_g + day.protein_g,
    carbs_g: sum.carbs_g + day.carbs_g,
    fat_g: sum.fat_g + day.fat_g,
    kcal: sum.kcal + day.kcal,
    water_ml: sum.water_ml + day.water_ml
  }), { protein_g: 0, carbs_g: 0, fat_g: 0, kcal: 0, water_ml: 0 });

  // Calcular dias ativos (dias com dados)
  const activeDays = dailyData.filter(day => day.kcal > 0).length;
  const activeDaysCount = Math.max(activeDays, 1); // Pelo menos 1 dia para evitar divisão por zero

  // Calcular metas semanais baseadas em dias ativos e fator semanal
  const weeklyFactor = currentUserData?.weeklyGoalFactor || 1.0;
  const weeklyGoals = {
    protein_g: dailyGoal.protein_g * activeDaysCount * weeklyFactor,
    carbs_g: dailyGoal.carbs_g * activeDaysCount * weeklyFactor,
    fat_g: dailyGoal.fat_g * activeDaysCount * weeklyFactor,
    kcal: dailyGoal.kcal * activeDaysCount * weeklyFactor,
    water_ml: dailyGoal.water_ml * activeDaysCount * weeklyFactor
  };

  // Calcular médias diárias
  const weekMetrics = {
    totalCalories: weekTotals.kcal,
    avgCalories: weekTotals.kcal / activeDaysCount,
    totalWater: weekTotals.water_ml,
    avgWater: weekTotals.water_ml / activeDaysCount,
    goalWater: weeklyGoals.water_ml,
    activeDays: activeDays,
    bestDay: dailyData.reduce((best, day) => 
      Math.abs(day.kcal - dailyGoal.kcal) < Math.abs(best.kcal - dailyGoal.kcal) ? day : best
    ),
    worstDay: dailyData.reduce((worst, day) => 
      Math.abs(day.kcal - dailyGoal.kcal) > Math.abs(worst.kcal - dailyGoal.kcal) ? day : worst
    ),
    progressPercentages: {
      protein: weeklyGoals.protein_g > 0 ? Math.round((weekTotals.protein_g / weeklyGoals.protein_g) * 100) : 0,
      carbs: weeklyGoals.carbs_g > 0 ? Math.round((weekTotals.carbs_g / weeklyGoals.carbs_g) * 100) : 0,
      fat: weeklyGoals.fat_g > 0 ? Math.round((weekTotals.fat_g / weeklyGoals.fat_g) * 100) : 0,
      kcal: Math.round((weekTotals.kcal / weeklyGoals.kcal) * 100),
      water: weeklyGoals.water_ml > 0 ? Math.round((weekTotals.water_ml / weeklyGoals.water_ml) * 100) : 0
    }
  };

  const macroData = [
    { name: 'Proteínas', value: weekTotals.protein_g, color: '#3B82F6' },
    { name: 'Carboidratos', value: weekTotals.carbs_g, color: '#10B981' },
    { name: 'Gorduras', value: weekTotals.fat_g, color: '#F59E0B' }
  ];

  const handlePreviousWeek = () => {
    onWeekChange(subDays(weekStart, 7));
  };

  const handleNextWeek = () => {
    onWeekChange(addDays(weekStart, 7));
  };

  const handleCurrentWeek = () => {
    onWeekChange(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Relatório Semanal</h2>
        <p className="text-gray-600">
          {format(weekStart, 'dd/MM/yyyy', { locale: ptBR })} - {format(weekEnd, 'dd/MM/yyyy', { locale: ptBR })}
        </p>
      </div>

      {/* Week Navigation */}
      <div className="flex justify-center space-x-2">
        <Button onClick={handlePreviousWeek} variant="secondary" size="sm">
          ← Semana Anterior
        </Button>
        <Button onClick={handleCurrentWeek} variant="secondary" size="sm">
          Semana Atual
        </Button>
        <Button onClick={handleNextWeek} variant="secondary" size="sm">
          Próxima Semana →
        </Button>
      </div>

      {/* Main Metrics with Compact Nutrition Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Protein */}
        <CompactNutritionCard
          value={weekTotals.protein_g}
          max={weeklyGoals.protein_g}
          color="bg-blue-500"
          label="Proteínas"
          unit="g"
          icon="🥩"
        />

        {/* Carbs */}
        <CompactNutritionCard
          value={weekTotals.carbs_g}
          max={weeklyGoals.carbs_g}
          color="bg-green-500"
          label="Carboidratos"
          unit="g"
          icon="🍞"
        />

        {/* Fat */}
        <CompactNutritionCard
          value={weekTotals.fat_g}
          max={weeklyGoals.fat_g}
          color="bg-yellow-500"
          label="Gorduras"
          unit="g"
          icon="🥑"
        />

        {/* Calories */}
        <CompactNutritionCard
          value={weekTotals.kcal}
          max={weeklyGoals.kcal}
          color="bg-red-500"
          label="Calorias"
          unit="kcal"
          icon="🔥"
        />

        {/* Water */}
        <CompactNutritionCard
          value={weekTotals.water_ml}
          max={weeklyGoals.water_ml}
          color="bg-cyan-500"
          label="Água"
          unit="ml"
          icon="💧"
        />
      </div>

      {/* Week Summary */}
      <Card>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Resumo da Semana</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {weekMetrics.activeDays}
              </div>
              <div className="text-sm text-gray-600">Dias Ativos</div>
              <div className="text-xs text-gray-500">de 7 dias</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {Math.round(weekMetrics.avgCalories)}
              </div>
              <div className="text-sm text-gray-600">Média Calorias</div>
              <div className="text-xs text-gray-500">por dia ativo</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-600 mb-1">
                {Math.round(weekMetrics.avgWater)}ml
              </div>
              <div className="text-sm text-gray-600">Média Água</div>
              <div className="text-xs text-gray-500">por dia ativo</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Calories Line Chart */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Calorias Diárias</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="dayName" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => [`${value} kcal`, 'Calorias']}
                  labelFormatter={(label) => `Dia: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="kcal" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="goal" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Macro Distribution */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição de Macronutrientes</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={macroData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {macroData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => {
                    const total = macroData.reduce((sum, item) => sum + item.value, 0);
                    const percentage = total > 0 ? Math.round((value as number) / total * 100) : 0;
                    return [`${Math.round(value as number)}g (${percentage}%)`, '']}
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center space-x-4 mt-4">
            {macroData.map((macro) => {
              const total = macroData.reduce((sum, item) => sum + item.value, 0);
              const percentage = total > 0 ? Math.round(macro.value / total * 100) : 0;
              return (
                <div key={macro.name} className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: macro.color }}
                  />
                  <span className="text-sm text-gray-600">
                    {macro.name}: {Math.round(macro.value)}g ({percentage}%)
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Daily Summary */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo Diário</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          {dailyData.map((day) => (
            <div key={day.date} className="text-center">
              <div className="font-medium text-gray-900 mb-2">
                {day.dayName}
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {formatNumber(day.kcal)}
              </div>
              <div className="text-xs text-gray-500 mb-2">kcal</div>
              <div className="text-xs text-gray-600 space-y-1">
                <div>{formatNumber(day.protein_g)}p</div>
                <div>{formatNumber(day.carbs_g)}c</div>
                <div>{formatNumber(day.fat_g)}g</div>
                <div className="text-cyan-600">{formatNumber(day.water_ml)}ml</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Weekly Summary */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo Semanal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Macronutrientes</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Proteínas:</span>
                <span className="font-medium">
                  {formatNumber(weekTotals.protein_g)}g
                  <span className="text-sm text-gray-500 ml-1">
                    ({weekMetrics.progressPercentages.protein}%)
                  </span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Carboidratos:</span>
                <span className="font-medium">
                  {formatNumber(weekTotals.carbs_g)}g
                  <span className="text-sm text-gray-500 ml-1">
                    ({weekMetrics.progressPercentages.carbs}%)
                  </span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gorduras:</span>
                <span className="font-medium">
                  {formatNumber(weekTotals.fat_g)}g
                  <span className="text-sm text-gray-500 ml-1">
                    ({weekMetrics.progressPercentages.fat}%)
                  </span>
                </span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Outros</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Calorias:</span>
                <span className="font-medium">
                  {formatNumber(weekTotals.kcal)}
                  <span className="text-sm text-gray-500 ml-1">
                    ({weekMetrics.progressPercentages.kcal}%)
                  </span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Água:</span>
                <span className="font-medium">
                  {formatNumber(weekTotals.water_ml)}ml
                  <span className="text-sm text-gray-500 ml-1">
                    ({weekMetrics.progressPercentages.water}%)
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
