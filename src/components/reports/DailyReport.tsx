import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { CompactNutritionCard } from '../ui/CompactNutritionCard';
import { MealDistributionChart } from './MealDistributionChart';
import { format, addDays, subDays, isToday, isYesterday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';

interface DailyReportProps {
  date: string;
  onDateChange?: (newDate: string) => void;
}

export const DailyReport: React.FC<DailyReportProps> = ({ date, onDateChange }) => {
  const { currentUser, users, getEntriesForDate, getCalorieExpenditureForDate, getDailyCalorieBalance } = useAppStore();
  
  const currentUserData = users.find(u => u.id === currentUser);
  const entries = getEntriesForDate(currentUser, date);
  const calorieExpenditure = getCalorieExpenditureForDate(currentUser, date);
  const calorieBalance = getDailyCalorieBalance(currentUser, date);
  
  const dailyGoal = currentUserData?.goals || {
    protein_g: 160,
    carbs_g: 220,
    fat_g: 60,
    kcal: 2400,
    water_ml: 3000
  };

  const dayTotals = entries.reduce((totals, entry) => ({
    protein_g: totals.protein_g + entry.protein_g,
    carbs_g: totals.carbs_g + entry.carbs_g,
    fat_g: totals.fat_g + entry.fat_g,
    kcal: totals.kcal + entry.kcal,
    water_ml: totals.water_ml + (entry.foodId === 'agua' ? entry.qty : 0)
  }), { protein_g: 0, carbs_g: 0, fat_g: 0, kcal: 0, water_ml: 0 });

  const formatDateBR = (dateISO: string) => {
    const [year, month, day] = dateISO.split('-');
    return `${day}/${month}/${year}`;
  };

  // Funções de navegação de data
  const handlePreviousDay = () => {
    if (onDateChange) {
      const currentDate = new Date(date + 'T00:00:00');
      const previousDate = subDays(currentDate, 1);
      const newDate = format(previousDate, 'yyyy-MM-dd');
      onDateChange(newDate);
    }
  };

  const handleNextDay = () => {
    if (onDateChange) {
      const currentDate = new Date(date + 'T00:00:00');
      const nextDate = addDays(currentDate, 1);
      const newDate = format(nextDate, 'yyyy-MM-dd');
      onDateChange(newDate);
    }
  };

  const handleToday = () => {
    if (onDateChange) {
      const today = format(new Date(), 'yyyy-MM-dd');
      onDateChange(today);
    }
  };

  // Verificar se é hoje, ontem ou amanhã
  const currentDate = new Date(date + 'T00:00:00');
  const isCurrentToday = isToday(currentDate);
  const isCurrentYesterday = isYesterday(currentDate);
  const isCurrentTomorrow = isTomorrow(currentDate);

  // Formatação da data com dia da semana
  const formatDateWithWeekday = (dateISO: string) => {
    const date = new Date(dateISO + 'T00:00:00');
    const dayName = format(date, 'EEEE', { locale: ptBR });
    const dayNumber = format(date, 'dd');
    const month = format(date, 'MMM', { locale: ptBR });
    const year = format(date, 'yyyy');
    
    return {
      dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
      dayNumber,
      month,
      year,
      fullDate: formatDateBR(dateISO)
    };
  };

  const dateInfo = formatDateWithWeekday(date);

  // Fallback para dados mínimos se não estiverem definidos
  const fallbackMinimums = {
    kirk: { protein_g: 125, carbs_g: 160, fat_g: 40, kcal: 1500 },
    manu: { protein_g: 96, carbs_g: 120, fat_g: 25, kcal: 1100 }
  };
  
  const minimumRequirements = currentUserData?.minimumRequirements || fallbackMinimums[currentUser as 'kirk' | 'manu'] || fallbackMinimums.kirk;

  // Dados para o gráfico de macronutrientes
  const macroChartData = [
    {
      macro: 'Proteínas',
      consumed: Math.round(dayTotals.protein_g),
      goal: Math.round(dailyGoal.protein_g),
      minimum: minimumRequirements.protein_g,
      // Cor dinâmica baseada na performance
      consumedColor: dayTotals.protein_g < minimumRequirements.protein_g 
        ? '#EF4444' // Vermelho se abaixo do mínimo
        : dayTotals.protein_g <= dailyGoal.protein_g * 1.05 
          ? '#10B981' // Verde se entre mínimo e 105% da meta
          : dayTotals.protein_g <= dailyGoal.protein_g * 1.10
            ? '#F59E0B' // Amarelo se entre 105% e 110% da meta
            : '#EF4444', // Vermelho se acima de 110% da meta
      // Label dinâmico para o topo da barra
      statusLabel: dayTotals.protein_g < minimumRequirements.protein_g 
        ? '🔴 Abaixo' // Vermelho se abaixo do mínimo
        : dayTotals.protein_g <= dailyGoal.protein_g * 1.05 
          ? '🟢 Meta' // Verde se entre mínimo e 105% da meta
          : dayTotals.protein_g <= dailyGoal.protein_g * 1.10
            ? '🟡 Acima' // Amarelo se entre 105% e 110% da meta
            : '🔴 Excesso' // Vermelho se acima de 110% da meta
    },
    {
      macro: 'Carboidratos',
      consumed: Math.round(dayTotals.carbs_g),
      goal: Math.round(dailyGoal.carbs_g),
      minimum: minimumRequirements.carbs_g,
      // Cor dinâmica baseada na performance
      consumedColor: dayTotals.carbs_g < minimumRequirements.carbs_g 
        ? '#EF4444' // Vermelho se abaixo do mínimo
        : dayTotals.carbs_g <= dailyGoal.carbs_g * 1.05 
          ? '#10B981' // Verde se entre mínimo e 105% da meta
          : dayTotals.carbs_g <= dailyGoal.carbs_g * 1.10
            ? '#F59E0B' // Amarelo se entre 105% e 110% da meta
            : '#EF4444', // Vermelho se acima de 110% da meta
      // Label dinâmico para o topo da barra
      statusLabel: dayTotals.carbs_g < minimumRequirements.carbs_g 
        ? '🔴 Abaixo' // Vermelho se abaixo do mínimo
        : dayTotals.carbs_g <= dailyGoal.carbs_g * 1.05 
          ? '🟢 Meta' // Verde se entre mínimo e 105% da meta
          : dayTotals.carbs_g <= dailyGoal.carbs_g * 1.10
            ? '🟡 Acima' // Amarelo se entre 105% e 110% da meta
            : '🔴 Excesso' // Vermelho se acima de 110% da meta
    },
    {
      macro: 'Gorduras',
      consumed: Math.round(dayTotals.fat_g),
      goal: Math.round(dailyGoal.fat_g),
      minimum: minimumRequirements.fat_g,
      // Cor dinâmica baseada na performance
      consumedColor: dayTotals.fat_g < minimumRequirements.fat_g 
        ? '#EF4444' // Vermelho se abaixo do mínimo
        : dayTotals.fat_g <= dailyGoal.fat_g * 1.15 
          ? '#10B981' // Verde se entre mínimo e 105% da meta
          : dayTotals.fat_g <= dailyGoal.fat_g * 1.25
            ? '#F59E0B' // Amarelo se entre 115% e 125% da meta
            : '#EF4444', // Vermelho se acima de 125 da meta
      // Label dinâmico para o topo da barra
      statusLabel: dayTotals.fat_g < minimumRequirements.fat_g 
        ? '🔴 Abaixo' // Vermelho se abaixo do mínimo
        : dayTotals.fat_g <= dailyGoal.fat_g * 1.15 
          ? '🟢 Meta' // Verde se entre mínimo e 105% da meta
          : dayTotals.fat_g <= dailyGoal.fat_g * 1.25
            ? '🟡 Acima' // Amarelo se entre 115% e 125% da meta
            : '🔴 Excesso' // Vermelho se acima de 125% da meta
    }
  ];


  




  return (
    <div className="space-y-6">
      {/* Header compacto com navegação */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          {/* Título */}
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">Relatório Diário</h2>
            <div className="text-sm text-gray-600 mt-1">
              {dateInfo.dayName}, {dateInfo.dayNumber} de {dateInfo.month} de {dateInfo.year}
              {isCurrentToday && (
                <span className="ml-2 text-blue-600 font-medium">• Hoje</span>
              )}
              {isCurrentYesterday && (
                <span className="ml-2 text-gray-500">• Ontem</span>
              )}
              {isCurrentTomorrow && (
                <span className="ml-2 text-gray-500">• Amanhã</span>
              )}
            </div>
          </div>
          
          {/* Navegação compacta */}
          <div className="flex items-center space-x-2">
            <Button
              onClick={handlePreviousDay}
              variant="secondary"
              size="sm"
              className="px-2 py-1 text-sm"
            >
              ←
            </Button>
            
            {!isCurrentToday && (
              <Button
                onClick={handleToday}
                variant="primary"
                size="sm"
                className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white"
              >
                Hoje
              </Button>
            )}
            
            <Button
              onClick={handleNextDay}
              variant="secondary"
              size="sm"
              className="px-2 py-1 text-sm"
            >
              →
            </Button>
          </div>
        </div>
      </div>

      {/* Main Metrics with Compact Nutrition Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Protein */}
        <CompactNutritionCard
          value={dayTotals.protein_g}
          max={dailyGoal.protein_g}
          minimum={minimumRequirements.protein_g}
          color="bg-blue-500"
          label="Proteínas"
          unit="g"
          icon="🥩"
        />

        {/* Carbs */}
        <CompactNutritionCard
          value={dayTotals.carbs_g}
          max={dailyGoal.carbs_g}
          minimum={minimumRequirements.carbs_g}
          color="bg-green-500"
          label="Carboidratos"
          unit="g"
          icon="🍞"
        />

        {/* Fat */}
        <CompactNutritionCard
          value={dayTotals.fat_g}
          max={dailyGoal.fat_g}
          minimum={minimumRequirements.fat_g}
          color="bg-yellow-500"
          label="Gorduras"
          unit="g"
          icon="🥑"
        />

        {/* Calories */}
        <CompactNutritionCard
          value={dayTotals.kcal}
          max={dailyGoal.kcal}
          minimum={minimumRequirements.kcal}
          color="bg-red-500"
          label="Calorias"
          unit="kcal"
          icon="🔥"
        />

        {/* Water */}
        <CompactNutritionCard
          value={dayTotals.water_ml}
          max={dailyGoal.water_ml}
          color="bg-cyan-500"
          label="Água"
          unit="ml"
          icon="💧"
        />
      </div>


      {/* Meal Distribution Chart */}
      <MealDistributionChart entries={entries} />

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

      {/* Calorie Balance Summary */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Saldo Calórico</h3>
        
        {/* Calorie Balance Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium text-green-800">Ingestão</span>
            </div>
            <div className="text-lg font-semibold text-green-900">
              {Math.round(calorieBalance.intake)} kcal
            </div>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-sm font-medium text-orange-800">Consumo</span>
            </div>
            <div className="text-lg font-semibold text-orange-900">
              {Math.round(calorieBalance.expenditure)} kcal
            </div>
          </div>
          
          <div className={`rounded-lg p-3 ${
            calorieBalance.balance >= 0 ? 'bg-blue-50' : 'bg-red-50'
          }`}>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                calorieBalance.balance >= 0 ? 'bg-blue-500' : 'bg-red-500'
              }`}></div>
              <span className={`text-sm font-medium ${
                calorieBalance.balance >= 0 ? 'text-blue-800' : 'text-red-800'
              }`}>Saldo</span>
            </div>
            <div className={`text-lg font-semibold ${
              calorieBalance.balance >= 0 ? 'text-blue-900' : 'text-red-900'
            }`}>
              {calorieBalance.balance >= 0 ? '+' : ''}{Math.round(calorieBalance.balance)} kcal
            </div>
          </div>
        </div>

        {/* Calorie Expenditure Details */}
        {calorieExpenditure.length > 0 && (
          <div className="mt-4 bg-gray-50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Detalhes do Consumo</h4>
            {calorieExpenditure.map((ce, index) => (
              <div key={ce.id || index} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {ce.source === 'garmin' ? 'Garmin' : 'Manual'}
                  {ce.note && ` - ${ce.note}`}
                </span>
                <span className="font-medium text-gray-900">
                  {Math.round(ce.calories_burned)} kcal
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
