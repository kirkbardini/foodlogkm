import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '../ui/Card';
import { CompactNutritionCard } from '../ui/CompactNutritionCard';
import { Button } from '../ui/Button';
import { formatNumber } from '../../lib/calculations';
import { useExportReport } from '../../hooks/useExportReport';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, LabelList } from 'recharts';
import { format, startOfWeek, endOfWeek, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WeeklyReportProps {
  weekStart: Date;
  onWeekChange: (newWeekStart: Date) => void;
}

export const WeeklyReport: React.FC<WeeklyReportProps> = ({ weekStart, onWeekChange }) => {
  const { currentUser, users, getEntriesForDateRange, getCalorieBalanceForDateRange } = useAppStore();
  const { exportToPDF } = useExportReport();
  
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
    const calorieBalance = getCalorieBalanceForDateRange(currentUser, dateISO, dateISO);
    
    const totals = entries.reduce((sum, entry) => ({
      protein_g: sum.protein_g + entry.protein_g,
      carbs_g: sum.carbs_g + entry.carbs_g,
      fat_g: sum.fat_g + entry.fat_g,
      kcal: Math.round(sum.kcal + entry.kcal),
      water_ml: sum.water_ml + (entry.foodId === 'agua' ? entry.qty : 0)
    }), { protein_g: 0, carbs_g: 0, fat_g: 0, kcal: 0, water_ml: 0 });
    
    const weeklyFactor = currentUserData?.weeklyGoalFactor || 1.0;
    const adjustedDailyGoal = Math.round(dailyGoal.kcal * weeklyFactor);
    
    return {
      date: dateISO,
      dayName: format(date, 'EEE', { locale: ptBR }),
      dayNumber: format(date, 'dd'),
      goal: adjustedDailyGoal,
      ...totals,
      calorieIntake: calorieBalance.intake,
      calorieExpenditure: calorieBalance.expenditure,
      calorieBalance: calorieBalance.balance
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

  // Calcular média semanal considerando apenas dias ativos
  const weeklyAverage = Math.round(weekTotals.kcal / activeDaysCount);

  // Adicionar média aos dados diários
  const dailyDataWithAverage = dailyData.map(day => ({
    ...day,
    average: weeklyAverage
  }));

  // Calcular metas semanais baseadas em dias ativos e fator semanal
  const weeklyFactor = currentUserData?.weeklyGoalFactor || 1.0;
  const weeklyGoals = {
    protein_g: Math.round(dailyGoal.protein_g * activeDaysCount),
    carbs_g: Math.round(dailyGoal.carbs_g * activeDaysCount),
    fat_g: Math.round(dailyGoal.fat_g * activeDaysCount * weeklyFactor),
    kcal: Math.round(dailyGoal.kcal * activeDaysCount * weeklyFactor),
    water_ml: Math.round(dailyGoal.water_ml * activeDaysCount)
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

  // Fallback para dados mínimos se não estiverem definidos
  const fallbackMinimums = {
    kirk: { protein_g: 125, carbs_g: 160, fat_g: 40, kcal: 1500 },
    manu: { protein_g: 96, carbs_g: 120, fat_g: 25, kcal: 1100 }
  };
  
  const minimumRequirements = currentUserData?.minimumRequirements || fallbackMinimums[currentUser as 'kirk' | 'manu'] || fallbackMinimums.kirk;

  // Dados para o gráfico de macronutrientes semanais
  const macroChartData = [
    {
      macro: 'Proteínas',
      consumed: Math.round(weekTotals.protein_g),
      goal: Math.round(weeklyGoals.protein_g),
      minimum: Math.round(minimumRequirements.protein_g * activeDaysCount),
      // Cor dinâmica baseada na performance
      consumedColor: weekTotals.protein_g < (minimumRequirements.protein_g * activeDaysCount)
        ? '#EF4444' // Vermelho se abaixo do mínimo
        : weekTotals.protein_g <= weeklyGoals.protein_g * 1.05 
          ? '#10B981' // Verde se entre mínimo e 105% da meta
          : weekTotals.protein_g <= weeklyGoals.protein_g * 1.10
            ? '#F59E0B' // Amarelo se entre 105% e 110% da meta
            : '#EF4444', // Vermelho se acima de 110% da meta
      // Label dinâmico para o topo da barra
      statusLabel: weekTotals.protein_g < (minimumRequirements.protein_g * activeDaysCount)
        ? '🔴 Abaixo' // Vermelho se abaixo do mínimo
        : weekTotals.protein_g <= weeklyGoals.protein_g * 1.05 
          ? '🟢 Meta' // Verde se entre mínimo e 105% da meta
          : weekTotals.protein_g <= weeklyGoals.protein_g * 1.10
            ? '🟡 Acima' // Amarelo se entre 105% e 110% da meta
            : '🔴 Excesso' // Vermelho se acima de 110% da meta
    },
    {
      macro: 'Carboidratos',
      consumed: Math.round(weekTotals.carbs_g),
      goal: Math.round(weeklyGoals.carbs_g),
      minimum: Math.round(minimumRequirements.carbs_g * activeDaysCount),
      // Cor dinâmica baseada na performance
      consumedColor: weekTotals.carbs_g < (minimumRequirements.carbs_g * activeDaysCount)
        ? '#EF4444' // Vermelho se abaixo do mínimo
        : weekTotals.carbs_g <= weeklyGoals.carbs_g * 1.05 
          ? '#10B981' // Verde se entre mínimo e 105% da meta
          : weekTotals.carbs_g <= weeklyGoals.carbs_g * 1.10
            ? '#F59E0B' // Amarelo se entre 105% e 110% da meta
            : '#EF4444', // Vermelho se acima de 110% da meta
      // Label dinâmico para o topo da barra
      statusLabel: weekTotals.carbs_g < (minimumRequirements.carbs_g * activeDaysCount)
        ? '🔴 Abaixo' // Vermelho se abaixo do mínimo
        : weekTotals.carbs_g <= weeklyGoals.carbs_g * 1.05 
          ? '🟢 Meta' // Verde se entre mínimo e 105% da meta
          : weekTotals.carbs_g <= weeklyGoals.carbs_g * 1.10
            ? '🟡 Acima' // Amarelo se entre 105% e 110% da meta
            : '🔴 Excesso' // Vermelho se acima de 110% da meta
    },
    {
      macro: 'Gorduras',
      consumed: Math.round(weekTotals.fat_g),
      goal: Math.round(weeklyGoals.fat_g),
      minimum: Math.round(minimumRequirements.fat_g * activeDaysCount),
      // Cor dinâmica baseada na performance
      consumedColor: weekTotals.fat_g < (minimumRequirements.fat_g * activeDaysCount)
        ? '#EF4444' // Vermelho se abaixo do mínimo
        : weekTotals.fat_g <= weeklyGoals.fat_g * 1.15 
          ? '#10B981' // Verde se entre mínimo e 115% da meta
          : weekTotals.fat_g <= weeklyGoals.fat_g * 1.25
            ? '#F59E0B' // Amarelo se entre 115% e 125% da meta
            : '#EF4444', // Vermelho se acima de 125% da meta
      // Label dinâmico para o topo da barra
      statusLabel: weekTotals.fat_g < (minimumRequirements.fat_g * activeDaysCount)
        ? '🔴 Abaixo' // Vermelho se abaixo do mínimo
        : weekTotals.fat_g <= weeklyGoals.fat_g * 1.15   
          ? '🟢 Meta' // Verde se entre mínimo e 115% da meta
          : weekTotals.fat_g <= weeklyGoals.fat_g * 1.25
            ? '🟡 Acima' // Amarelo se entre 115% e 125% da meta
            : '🔴 Excesso' // Vermelho se acima de 125% da meta
    }
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

  const handleExportPDF = async () => {
    try {
      const weekRange = `${format(weekStart, 'dd/MM/yyyy', { locale: ptBR })} - ${format(weekEnd, 'dd/MM/yyyy', { locale: ptBR })}`;
      await exportToPDF('weekly-report-content', {
        filename: `relatorio-semanal-${format(weekStart, 'yyyy-MM-dd')}`,
        title: 'Relatório Semanal',
        subtitle: weekRange
      });
    } catch (error) {
      console.error('Erro ao exportar relatório semanal:', error);
      alert('Erro ao exportar relatório. Tente novamente.');
    }
  };


  return (
    <div className="space-y-6" id="weekly-report-content">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Relatório Semanal</h2>
        <p className="text-gray-600">
          {format(weekStart, 'dd/MM/yyyy', { locale: ptBR })} - {format(weekEnd, 'dd/MM/yyyy', { locale: ptBR })}
        </p>
      </div>

      {/* Week Navigation and Export */}
      <div className="flex justify-center items-center space-x-4">
        <div className="flex space-x-2">
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
        <Button 
          onClick={handleExportPDF} 
          variant="primary" 
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          📄 Exportar PDF
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
        {/* Macronutrients Chart */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Macronutrientes</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={macroChartData}
                margin={{ top: 40, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="macro" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  domain={[0, 'dataMax + 20']}
                  tickFormatter={(value) => (Math.round(value / 100) * 100).toString()}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'consumed') return [`${value}g`, 'Consumido'];
                    if (name === 'goal') return [`${value}g`, 'Meta'];
                    if (name === 'minimum') return [`${value}g`, 'Mínimo Recomendado'];
                    return [`${value}g`, name];
                  }}
                />
                {/* Barra de fundo para o mínimo (primeira - acinzentada) */}
                <Bar 
                  dataKey="minimum" 
                  fill="#E5E7EB" 
                  name="minimum"
                  radius={[2, 2, 2, 2]}
                  stroke="#9CA3AF"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />
                {/* Barra da meta (segunda - dark gray dashed) */}
                <Bar 
                  dataKey="goal" 
                  fill="#374151" 
                  name="goal"
                  radius={[2, 2, 2, 2]}
                  stroke="#374151"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                {/* Barra do consumo (terceira - cor dinâmica) */}
                <Bar 
                  dataKey="consumed" 
                  name="consumed"
                  radius={[2, 2, 2, 2]}
                  strokeWidth={1}
                >
                  {macroChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.consumedColor} stroke={entry.consumedColor} />
                  ))}
                  <LabelList 
                    dataKey="statusLabel" 
                    position="top" 
                    style={{ 
                      fontSize: '11px', 
                      fontWeight: 'bold',
                      fill: '#374151'
                    }}
                    formatter={(value: string) => value}
                    offset={5}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Legenda personalizada */}
          <div className="flex justify-center space-x-6 mt-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-3 bg-gray-300 rounded border border-gray-400" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, #9CA3AF 2px, #9CA3AF 4px)' }}></div>
              <span className="text-gray-600">Mínimo</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-3 bg-gray-600 rounded border border-gray-600" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, #374151 2px, #374151 4px)' }}></div>
              <span className="text-gray-600">Meta</span>
            </div>
          </div>
          {/* Legenda de cores dinâmicas */}
          <div className="flex justify-center space-x-4 mt-2 text-xs text-gray-500">
            <span>🔴 Abaixo</span>
            <span>🟢 Ideal</span>
            <span>🟡 Atenção</span>
            <span>🔴 Excesso</span>
          </div>
        </Card>
        {/* Daily Calories Line Chart */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Calorias Diárias</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyDataWithAverage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="dayName" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => (Math.round(value / 100) * 100).toString()}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'kcal') return [`${value} kcal`, 'Calorias Consumidas'];
                    if (name === 'goal') return [`${value} kcal`, 'Meta Diária'];
                    if (name === 'average') return [`${value} kcal`, 'Média Semanal'];
                    return [`${value} kcal`, name];
                  }}
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

      {/* Weekly Calorie Balance Chart */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Saldo Calórico Semanal</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={dailyData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="dayName" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                domain={[0, 'dataMax + 200']}
                tickFormatter={(value) => (Math.round(value / 100) * 100).toString()}
              />
              <Tooltip 
                formatter={(value, name) => {
                  const intValue = Math.round(value as number);
                  if (name === 'calorieIntake') return [`${intValue} kcal`, 'Ingestão'];
                  if (name === 'calorieExpenditure') return [`${intValue} kcal`, 'Consumo'];
                  if (name === 'calorieBalance') return [`${intValue} kcal`, 'Saldo'];
                  return [`${intValue} kcal`, name];
                }}
              />
              <Bar 
                dataKey="calorieIntake" 
                fill="#10B981" 
                name="calorieIntake"
                radius={[2, 2, 0, 0]}
              />
              <Bar 
                dataKey="calorieExpenditure" 
                fill="#F59E0B" 
                name="calorieExpenditure"
                radius={[2, 2, 0, 0]}
              />
              <Bar 
                dataKey="calorieBalance" 
                fill="#3B82F6" 
                name="calorieBalance"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Weekly Calorie Balance Summary */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium text-green-800">Total Ingestão</span>
            </div>
            <div className="text-lg font-semibold text-green-900">
              {Math.round(dailyData.reduce((sum, day) => sum + day.calorieIntake, 0))} kcal
            </div>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-sm font-medium text-orange-800">Total Consumo</span>
            </div>
            <div className="text-lg font-semibold text-orange-900">
              {Math.round(dailyData.reduce((sum, day) => sum + day.calorieExpenditure, 0))} kcal
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm font-medium text-blue-800">Saldo Semanal</span>
            </div>
            <div className="text-lg font-semibold text-blue-900">
              {Math.round(dailyData.reduce((sum, day) => sum + day.calorieBalance, 0))} kcal
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
