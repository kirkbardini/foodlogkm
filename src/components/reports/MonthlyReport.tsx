import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '../ui/Card';
import { CompactNutritionCard } from '../ui/CompactNutritionCard';
import { Button } from '../ui/Button';
import { formatNumber } from '../../lib/calculations';
import { useExportReport } from '../../hooks/useExportReport';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, LabelList } from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthlyReportProps {
  monthStart: Date;
  onMonthChange: (newMonthStart: Date) => void;
}

export const MonthlyReport: React.FC<MonthlyReportProps> = ({ monthStart, onMonthChange }) => {
  const { currentUser, users, getEntriesForDateRange, getCalorieBalanceForDateRange } = useAppStore();
  const { exportToPDF } = useExportReport();
  
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
    const calorieBalance = getCalorieBalanceForDateRange(currentUser, dateISO, dateISO);
    
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
      ...totals,
      calorieIntake: calorieBalance.intake,
      calorieExpenditure: calorieBalance.expenditure,
      calorieBalance: calorieBalance.balance
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
    protein_g: Math.round(dailyGoal.protein_g * activeDaysCount),
    carbs_g: Math.round(dailyGoal.carbs_g * activeDaysCount),
    fat_g: Math.round(dailyGoal.fat_g * activeDaysCount * monthlyFactor),
    kcal: Math.round(dailyGoal.kcal * activeDaysCount * monthlyFactor),
    water_ml: Math.round(dailyGoal.water_ml * activeDaysCount)
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

  // Fallback para dados mínimos se não estiverem definidos
  const fallbackMinimums = {
    kirk: { protein_g: 125, carbs_g: 160, fat_g: 40, kcal: 1500 },
    manu: { protein_g: 96, carbs_g: 120, fat_g: 25, kcal: 1100 }
  };
  
  const minimumRequirements = currentUserData?.minimumRequirements || fallbackMinimums[currentUser as 'kirk' | 'manu'] || fallbackMinimums.kirk;

  // Dados para o gráfico de macronutrientes mensais
  const macroChartData = [
    {
      macro: 'Proteínas',
      consumed: Math.round(monthTotals.protein_g),
      goal: Math.round(monthlyGoals.protein_g),
      minimum: Math.round(minimumRequirements.protein_g * activeDaysCount),
      // Cor dinâmica baseada na performance
      consumedColor: monthTotals.protein_g < (minimumRequirements.protein_g * activeDaysCount)
        ? '#EF4444' // Vermelho se abaixo do mínimo
        : monthTotals.protein_g <= monthlyGoals.protein_g * 1.05 
          ? '#10B981' // Verde se entre mínimo e 105% da meta
          : monthTotals.protein_g <= monthlyGoals.protein_g * 1.10
            ? '#F59E0B' // Amarelo se entre 105% e 110% da meta
            : '#EF4444', // Vermelho se acima de 110% da meta
      // Label dinâmico para o topo da barra
      statusLabel: monthTotals.protein_g < (minimumRequirements.protein_g * activeDaysCount)
        ? '🔴 Abaixo' // Vermelho se abaixo do mínimo
        : monthTotals.protein_g <= monthlyGoals.protein_g * 1.05 
          ? '🟢 Meta' // Verde se entre mínimo e 105% da meta
          : monthTotals.protein_g <= monthlyGoals.protein_g * 1.10
            ? '🟡 Acima' // Amarelo se entre 105% e 110% da meta
            : '🔴 Excesso' // Vermelho se acima de 110% da meta
    },
    {
      macro: 'Carboidratos',
      consumed: Math.round(monthTotals.carbs_g),
      goal: Math.round(monthlyGoals.carbs_g),
      minimum: Math.round(minimumRequirements.carbs_g * activeDaysCount),
      // Cor dinâmica baseada na performance
      consumedColor: monthTotals.carbs_g < (minimumRequirements.carbs_g * activeDaysCount)
        ? '#EF4444' // Vermelho se abaixo do mínimo
        : monthTotals.carbs_g <= monthlyGoals.carbs_g * 1.05 
          ? '#10B981' // Verde se entre mínimo e 105% da meta
          : monthTotals.carbs_g <= monthlyGoals.carbs_g * 1.10
            ? '#F59E0B' // Amarelo se entre 105% e 110% da meta
            : '#EF4444', // Vermelho se acima de 110% da meta
      // Label dinâmico para o topo da barra
      statusLabel: monthTotals.carbs_g < (minimumRequirements.carbs_g * activeDaysCount)
        ? '🔴 Abaixo' // Vermelho se abaixo do mínimo
        : monthTotals.carbs_g <= monthlyGoals.carbs_g * 1.05 
          ? '🟢 Meta' // Verde se entre mínimo e 105% da meta
          : monthTotals.carbs_g <= monthlyGoals.carbs_g * 1.10
            ? '🟡 Acima' // Amarelo se entre 105% e 110% da meta
            : '🔴 Excesso' // Vermelho se acima de 110% da meta
    },
    {
      macro: 'Gorduras',
      consumed: Math.round(monthTotals.fat_g),
      goal: Math.round(monthlyGoals.fat_g),
      minimum: Math.round(minimumRequirements.fat_g * activeDaysCount),
      // Cor dinâmica baseada na performance
      consumedColor: monthTotals.fat_g < (minimumRequirements.fat_g * activeDaysCount)
        ? '#EF4444' // Vermelho se abaixo do mínimo
        : monthTotals.fat_g <= monthlyGoals.fat_g * 1.15 
          ? '#10B981' // Verde se entre mínimo e 115% da meta
          : monthTotals.fat_g <= monthlyGoals.fat_g * 1.40
            ? '#F59E0B' // Amarelo se entre 115% e 140% da meta
            : '#EF4444', // Vermelho se acima de 140% da meta
      // Label dinâmico para o topo da barra
      statusLabel: monthTotals.fat_g < (minimumRequirements.fat_g * activeDaysCount)
        ? '🔴 Abaixo' // Vermelho se abaixo do mínimo
        : monthTotals.fat_g <= monthlyGoals.fat_g * 1.15 
          ? '🟢 Meta' // Verde se entre mínimo e 115% da meta
          : monthTotals.fat_g <= monthlyGoals.fat_g * 1.40
            ? '🟡 Acima' // Amarelo se entre 115% e 140% da meta
            : '🔴 Excesso' // Vermelho se acima de 140% da meta
    }
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

  const handleExportPDF = async () => {
    try {
      const monthName = format(monthStart, 'MMMM yyyy', { locale: ptBR });
      await exportToPDF('monthly-report-content', {
        filename: `relatorio-mensal-${format(monthStart, 'yyyy-MM')}`,
        title: 'Relatório Mensal',
        subtitle: monthName
      });
    } catch (error) {
      console.error('Erro ao exportar relatório mensal:', error);
      alert('Erro ao exportar relatório. Tente novamente.');
    }
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
    <div className="space-y-6" id="monthly-report-content">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Relatório Mensal</h2>
        <p className="text-gray-600">
          {format(monthStart, 'MMMM yyyy', { locale: ptBR })}
        </p>
      </div>

      {/* Month Navigation and Export */}
      <div className="flex justify-center items-center space-x-4">
        <div className="flex space-x-2">
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
          value={monthTotals.protein_g}
          max={monthlyGoals.protein_g}
          minimum={minimumRequirements.protein_g * activeDaysCount}
          label="Proteínas"
          unit="g"
          icon="🥩"
        />

        {/* Carbs */}
        <CompactNutritionCard
          value={monthTotals.carbs_g}
          max={monthlyGoals.carbs_g}
          minimum={minimumRequirements.carbs_g * activeDaysCount}
          label="Carboidratos"
          unit="g"
          icon="🍞"
        />

        {/* Fat */}
        <CompactNutritionCard
          value={monthTotals.fat_g}
          max={monthlyGoals.fat_g}
          minimum={minimumRequirements.fat_g * activeDaysCount}
          label="Gorduras"
          unit="g"
          icon="🥑"
        />

        {/* Calories */}
        <CompactNutritionCard
          value={monthTotals.kcal}
          max={monthlyGoals.kcal}
          minimum={minimumRequirements.kcal * activeDaysCount}
          label="Calorias"
          unit="kcal"
          icon="🔥"
        />

        {/* Water */}
        <CompactNutritionCard
          value={monthTotals.water_ml}
          max={monthlyGoals.water_ml}
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

      {/* Monthly Calorie Balance Chart */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Saldo Calórico Mensal</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={dailyData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="dayNumber" 
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
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
                labelFormatter={(value, payload) => {
                  if (payload && payload[0]) {
                    const dayData = payload[0].payload;
                    return `Dia ${dayData.dayNumber} (${dayData.dayName})`;
                  }
                  return `Dia ${value}`;
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
        
        {/* Monthly Calorie Balance Summary */}
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
              <span className="text-sm font-medium text-blue-800">Saldo Mensal</span>
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
