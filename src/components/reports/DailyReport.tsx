import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { formatNumber } from '../../lib/calculations';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DailyReportProps {
  date: string;
}

export const DailyReport: React.FC<DailyReportProps> = ({ date }) => {
  const { currentUser, users, getEntriesForDate } = useAppStore();
  
  const currentUserData = users.find(u => u.id === currentUser);
  const entries = getEntriesForDate(currentUser, date);
  
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

  const macroData = [
    { name: 'Proteínas', value: dayTotals.protein_g, color: '#3B82F6' },
    { name: 'Carboidratos', value: dayTotals.carbs_g, color: '#10B981' },
    { name: 'Gorduras', value: dayTotals.fat_g, color: '#F59E0B' }
  ];


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Relatório Diário</h2>
        <p className="text-gray-600">{formatDateBR(date)}</p>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Protein */}
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-2">
              {formatNumber(dayTotals.protein_g)}g
            </div>
            <div className="text-sm text-gray-600 mb-3">Proteínas</div>
            <ProgressBar
              value={dayTotals.protein_g}
              max={dailyGoal.protein_g}
              color="blue"
            />
            <div className="text-xs text-gray-500 mt-1">
              Meta: {dailyGoal.protein_g}g
            </div>
          </div>
        </Card>

        {/* Carbs */}
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-2">
              {formatNumber(dayTotals.carbs_g)}g
            </div>
            <div className="text-sm text-gray-600 mb-3">Carboidratos</div>
            <ProgressBar
              value={dayTotals.carbs_g}
              max={dailyGoal.carbs_g}
              color="green"
            />
            <div className="text-xs text-gray-500 mt-1">
              Meta: {dailyGoal.carbs_g}g
            </div>
          </div>
        </Card>

        {/* Fat */}
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600 mb-2">
              {formatNumber(dayTotals.fat_g)}g
            </div>
            <div className="text-sm text-gray-600 mb-3">Gorduras</div>
            <ProgressBar
              value={dayTotals.fat_g}
              max={dailyGoal.fat_g}
              color="yellow"
            />
            <div className="text-xs text-gray-500 mt-1">
              Meta: {dailyGoal.fat_g}g
            </div>
          </div>
        </Card>

        {/* Calories */}
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 mb-2">
              {formatNumber(dayTotals.kcal)}
            </div>
            <div className="text-sm text-gray-600 mb-3">Calorias</div>
            <ProgressBar
              value={dayTotals.kcal}
              max={dailyGoal.kcal}
              color="red"
            />
            <div className="text-xs text-gray-500 mt-1">
              Meta: {dailyGoal.kcal}
            </div>
          </div>
        </Card>

        {/* Water */}
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-600 mb-2">
              {formatNumber(dayTotals.water_ml)}ml
            </div>
            <div className="text-sm text-gray-600 mb-3">Água</div>
            <ProgressBar
              value={dayTotals.water_ml}
              max={dailyGoal.water_ml}
              color="cyan"
            />
            <div className="text-xs text-gray-500 mt-1">
              Meta: {dailyGoal.water_ml}ml
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
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
    </div>
  );
};
