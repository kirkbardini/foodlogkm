import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
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

  // Calcular médias diárias
  const weekMetrics = {
    totalCalories: weekTotals.kcal,
    avgCalories: weekTotals.kcal / 7,
    totalWater: weekTotals.water_ml,
    avgWater: weekTotals.water_ml / 7,
    goalWater: dailyGoal.water_ml * 7,
    bestDay: dailyData.reduce((best, day) => 
      Math.abs(day.kcal - dailyGoal.kcal) < Math.abs(best.kcal - dailyGoal.kcal) ? day : best
    ),
    worstDay: dailyData.reduce((worst, day) => 
      Math.abs(day.kcal - dailyGoal.kcal) > Math.abs(worst.kcal - dailyGoal.kcal) ? day : worst
    ),
    progressPercentages: {
      protein: dailyGoal.protein_g > 0 ? Math.round((weekTotals.protein_g / (dailyGoal.protein_g * 7)) * 100) : 0,
      carbs: dailyGoal.carbs_g > 0 ? Math.round((weekTotals.carbs_g / (dailyGoal.carbs_g * 7)) * 100) : 0,
      fat: dailyGoal.fat_g > 0 ? Math.round((weekTotals.fat_g / (dailyGoal.fat_g * 7)) * 100) : 0,
      kcal: Math.round((weekTotals.kcal / (dailyGoal.kcal * 7)) * 100),
      water: dailyGoal.water_ml > 0 ? Math.round((weekTotals.water_ml / (dailyGoal.water_ml * 7)) * 100) : 0
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

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Calories */}
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 mb-2">
              {formatNumber(weekTotals.kcal)}
            </div>
            <div className="text-sm text-gray-600 mb-3">Calorias Totais</div>
            <div className="text-xs text-gray-500">
              Média: {formatNumber(weekMetrics.avgCalories)}/dia
            </div>
          </div>
        </Card>

        {/* Best Day */}
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-2">
              {formatNumber(weekMetrics.bestDay.kcal)}
            </div>
            <div className="text-sm text-gray-600 mb-3">Melhor Dia</div>
            <div className="text-xs text-gray-500">
              {weekMetrics.bestDay.dayName} {weekMetrics.bestDay.dayNumber}
            </div>
          </div>
        </Card>

        {/* Worst Day */}
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 mb-2">
              {formatNumber(weekMetrics.worstDay.kcal)}
            </div>
            <div className="text-sm text-gray-600 mb-3">Pior Dia</div>
            <div className="text-xs text-gray-500">
              {weekMetrics.worstDay.dayName} {weekMetrics.worstDay.dayNumber}
            </div>
          </div>
        </Card>

        {/* Water */}
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-600 mb-2">
              {formatNumber(weekTotals.water_ml)}ml
            </div>
            <div className="text-sm text-gray-600 mb-3">Água Total</div>
            <ProgressBar
              value={weekTotals.water_ml}
              max={weekMetrics.goalWater}
              color="cyan"
            />
            <div className="text-xs text-gray-500 mt-1">
              Meta: {weekMetrics.goalWater}ml
            </div>
          </div>
        </Card>

        {/* Progress */}
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 mb-2">
              {weekMetrics.progressPercentages.kcal}%
            </div>
            <div className="text-sm text-gray-600 mb-3">Progresso</div>
            <div className="text-xs text-gray-500">
              Meta semanal
            </div>
          </div>
        </Card>
      </div>

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
                <Tooltip formatter={(value) => [`${value}g`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center space-x-4 mt-4">
            {macroData.map((macro) => (
              <div key={macro.name} className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: macro.color }}
                />
                <span className="text-sm text-gray-600">{macro.name}</span>
              </div>
            ))}
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
