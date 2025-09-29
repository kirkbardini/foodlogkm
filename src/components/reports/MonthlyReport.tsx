import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '../ui/Card';
import { CompactNutritionCard } from '../ui/CompactNutritionCard';
import { Button } from '../ui/Button';
import { formatNumber } from '../../lib/calculations';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthlyReportProps {
  monthStart: Date;
  onMonthChange: (newMonthStart: Date) => void;
}

export const MonthlyReport: React.FC<MonthlyReportProps> = ({ monthStart, onMonthChange }) => {
  const { currentUser, users, getEntriesForDateRange } = useAppStore();
  
  const currentUserData = users.find(u => u.id === currentUser);
  const monthEnd = endOfMonth(monthStart);
  
  const dailyGoal = currentUserData?.goals || {
    protein_g: 160,
    carbs_g: 220,
    fat_g: 60,
    kcal: 2400,
    water_ml: 3000
  };

  // Gerar dados de todos os dias do mês
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const dailyData = monthDays.map(date => {
    const dateISO = format(date, 'yyyy-MM-dd');
    const entries = getEntriesForDateRange(currentUser, dateISO, dateISO);
    
    const totals = entries.reduce((sum, entry) => ({
      protein_g: sum.protein_g + entry.protein_g,
      carbs_g: sum.carbs_g + entry.carbs_g,
      fat_g: sum.fat_g + entry.fat_g,
      kcal: Math.round(sum.kcal + entry.kcal),
      water_ml: sum.water_ml + (entry.foodId === 'agua' ? entry.qty : 0)
    }), { protein_g: 0, carbs_g: 0, fat_g: 0, kcal: 0, water_ml: 0 });
    
    return {
      date: dateISO,
      dayName: format(date, 'EEE', { locale: ptBR }),
      dayNumber: format(date, 'dd'),
      ...totals
    };
  });

  // Calcular totais do mês
  const monthTotals = dailyData.reduce((sum, day) => ({
    protein_g: sum.protein_g + day.protein_g,
    carbs_g: sum.carbs_g + day.carbs_g,
    fat_g: sum.fat_g + day.fat_g,
    kcal: sum.kcal + day.kcal,
    water_ml: sum.water_ml + day.water_ml
  }), { protein_g: 0, carbs_g: 0, fat_g: 0, kcal: 0, water_ml: 0 });

  // Calcular dias ativos (dias com dados)
  const activeDays = dailyData.filter(day => day.kcal > 0).length;
  const activeDaysCount = Math.max(activeDays, 1); // Pelo menos 1 dia para evitar divisão por zero

  // Calcular média mensal considerando apenas dias ativos
  const monthlyAverage = Math.round(monthTotals.kcal / activeDaysCount);

  // Calcular metas mensais baseadas em dias ativos e fator mensal
  const monthlyFactor = currentUserData?.monthlyGoalFactor || 1.0;
  const monthlyGoals = {
    protein_g: Math.round(dailyGoal.protein_g * activeDaysCount * monthlyFactor),
    carbs_g: Math.round(dailyGoal.carbs_g * activeDaysCount * monthlyFactor),
    fat_g: Math.round(dailyGoal.fat_g * activeDaysCount * monthlyFactor),
    kcal: Math.round(dailyGoal.kcal * activeDaysCount * monthlyFactor),
    water_ml: Math.round(dailyGoal.water_ml * activeDaysCount * monthlyFactor)
  };

  // Calcular médias diárias
  const monthMetrics = {
    totalCalories: monthTotals.kcal,
    avgCalories: monthTotals.kcal / activeDaysCount,
    totalWater: monthTotals.water_ml,
    avgWater: monthTotals.water_ml / activeDaysCount,
    goalWater: monthlyGoals.water_ml,
    activeDays: activeDays,
    bestDay: dailyData.reduce((best, day) => 
      Math.abs(day.kcal - dailyGoal.kcal) < Math.abs(best.kcal - dailyGoal.kcal) ? day : best
    ),
    worstDay: dailyData.reduce((worst, day) => 
      Math.abs(day.kcal - dailyGoal.kcal) > Math.abs(worst.kcal - dailyGoal.kcal) ? day : worst
    ),
    progressPercentages: {
      protein: monthlyGoals.protein_g > 0 ? Math.round((monthTotals.protein_g / monthlyGoals.protein_g) * 100) : 0,
      carbs: monthlyGoals.carbs_g > 0 ? Math.round((monthTotals.carbs_g / monthlyGoals.carbs_g) * 100) : 0,
      fat: monthlyGoals.fat_g > 0 ? Math.round((monthTotals.fat_g / monthlyGoals.fat_g) * 100) : 0,
      kcal: Math.round((monthTotals.kcal / monthlyGoals.kcal) * 100),
      water: monthlyGoals.water_ml > 0 ? Math.round((monthTotals.water_ml / monthlyGoals.water_ml) * 100) : 0
    }
  };

  const macroData = [
    { name: 'Proteínas', value: monthTotals.protein_g, color: '#3B82F6' },
    { name: 'Carboidratos', value: monthTotals.carbs_g, color: '#10B981' },
    { name: 'Gorduras', value: monthTotals.fat_g, color: '#F59E0B' }
  ];

  const handlePreviousMonth = () => {
    onMonthChange(subMonths(monthStart, 1));
  };

  const handleNextMonth = () => {
    onMonthChange(addMonths(monthStart, 1));
  };

  const handleCurrentMonth = () => {
    onMonthChange(startOfMonth(new Date()));
  };

  // Agrupar dados por semana para o gráfico
  const weeklyData = [];
  const weeklyFactor = currentUserData?.weeklyGoalFactor || 1.0;
  const weeklyGoal = Math.round(dailyGoal.kcal * weeklyFactor * 7); // Meta semanal = kcal_goal * weeklyGoalFactor * 7
  for (let i = 0; i < dailyData.length; i += 7) {
    const weekDays = dailyData.slice(i, i + 7);
    const weekTotals = weekDays.reduce((sum, day) => ({
      protein_g: sum.protein_g + day.protein_g,
      carbs_g: sum.carbs_g + day.carbs_g,
      fat_g: sum.fat_g + day.fat_g,
      kcal: Math.round(sum.kcal + day.kcal),
      water_ml: sum.water_ml + day.water_ml
    }), { protein_g: 0, carbs_g: 0, fat_g: 0, kcal: 0, water_ml: 0 });
    
    weeklyData.push({
      week: `Semana ${Math.floor(i / 7) + 1}`,
      goal: weeklyGoal,
      average: monthlyAverage, // Média mensal por semana
      ...weekTotals
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Relatório Mensal</h2>
        <p className="text-gray-600">
          {format(monthStart, 'MMMM yyyy', { locale: ptBR })}
        </p>
      </div>

      {/* Month Navigation */}
      <div className="flex justify-center space-x-2">
        <Button onClick={handlePreviousMonth} variant="secondary" size="sm">
          ← Mês Anterior
        </Button>
        <Button onClick={handleCurrentMonth} variant="secondary" size="sm">
          Mês Atual
        </Button>
        <Button onClick={handleNextMonth} variant="secondary" size="sm">
          Próximo Mês →
        </Button>
      </div>

      {/* Main Metrics with Compact Nutrition Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Protein */}
        <CompactNutritionCard
          value={monthTotals.protein_g}
          max={monthlyGoals.protein_g}
          color="bg-blue-500"
          label="Proteínas"
          unit="g"
          icon="🥩"
        />

        {/* Carbs */}
        <CompactNutritionCard
          value={monthTotals.carbs_g}
          max={monthlyGoals.carbs_g}
          color="bg-green-500"
          label="Carboidratos"
          unit="g"
          icon="🍞"
        />

        {/* Fat */}
        <CompactNutritionCard
          value={monthTotals.fat_g}
          max={monthlyGoals.fat_g}
          color="bg-yellow-500"
          label="Gorduras"
          unit="g"
          icon="🥑"
        />

        {/* Calories */}
        <CompactNutritionCard
          value={monthTotals.kcal}
          max={monthlyGoals.kcal}
          color="bg-red-500"
          label="Calorias"
          unit="kcal"
          icon="🔥"
        />

        {/* Water */}
        <CompactNutritionCard
          value={monthTotals.water_ml}
          max={monthlyGoals.water_ml}
          color="bg-cyan-500"
          label="Água"
          unit="ml"
          icon="💧"
        />
      </div>

      {/* Month Summary */}
      <Card>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Resumo do Mês</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {monthMetrics.activeDays}
              </div>
              <div className="text-sm text-gray-600">Dias Ativos</div>
              <div className="text-xs text-gray-500">de {monthDays.length} dias</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {Math.round(monthMetrics.avgCalories)}
              </div>
              <div className="text-sm text-gray-600">Média Calorias</div>
              <div className="text-xs text-gray-500">por dia ativo</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-600 mb-1">
                {Math.round(monthMetrics.avgWater)}ml
              </div>
              <div className="text-sm text-gray-600">Média Água</div>
              <div className="text-xs text-gray-500">por dia ativo</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Calories Line Chart */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Calorias por Semana</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="week" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'kcal') return [`${value} kcal`, 'Calorias Consumidas'];
                    if (name === 'goal') return [`${value} kcal`, 'Meta Semanal'];
                    if (name === 'average') return [`${value} kcal`, 'Média Mensal'];
                    return [`${value} kcal`, name];
                  }}
                  labelFormatter={(label) => `Semana: ${label}`}
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
                <Line 
                  type="monotone" 
                  dataKey="average" 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  strokeDasharray="3 3"
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

      {/* Monthly Summary */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo Mensal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Macronutrientes</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Proteínas:</span>
                <span className="font-medium">
                  {formatNumber(monthTotals.protein_g)}g
                  <span className="text-sm text-gray-500 ml-1">
                    ({monthMetrics.progressPercentages.protein}%)
                  </span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Carboidratos:</span>
                <span className="font-medium">
                  {formatNumber(monthTotals.carbs_g)}g
                  <span className="text-sm text-gray-500 ml-1">
                    ({monthMetrics.progressPercentages.carbs}%)
                  </span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gorduras:</span>
                <span className="font-medium">
                  {formatNumber(monthTotals.fat_g)}g
                  <span className="text-sm text-gray-500 ml-1">
                    ({monthMetrics.progressPercentages.fat}%)
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
                  {formatNumber(monthTotals.kcal)}
                  <span className="text-sm text-gray-500 ml-1">
                    ({monthMetrics.progressPercentages.kcal}%)
                  </span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Água:</span>
                <span className="font-medium">
                  {formatNumber(monthTotals.water_ml)}ml
                  <span className="text-sm text-gray-500 ml-1">
                    ({monthMetrics.progressPercentages.water}%)
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
