import React from 'react';
import { Card } from '../ui/Card';

interface InsightsPanelProps {
  currentTotals: {
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    kcal: number;
    water_ml: number;
  };
  goals: {
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    kcal: number;
    water_ml: number;
  };
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({
  currentTotals,
  goals
}) => {
  const getInsights = () => {
    const insights = [];
    
    // Análise de proteínas
    const proteinPercentage = (currentTotals.protein_g / goals.protein_g) * 100;
    if (proteinPercentage < 50) {
      insights.push({
        type: 'warning',
        icon: '🥩',
        title: 'Proteína baixa',
        message: `Você consumiu apenas ${proteinPercentage.toFixed(0)}% da meta de proteína. Considere adicionar carnes, ovos ou leguminosas.`
      });
    } else if (proteinPercentage >= 100) {
      insights.push({
        type: 'success',
        icon: '💪',
        title: 'Proteína em dia!',
        message: `Excelente! Você atingiu ${proteinPercentage.toFixed(0)}% da meta de proteína.`
      });
    }

    // Análise de carboidratos
    const carbsPercentage = (currentTotals.carbs_g / goals.carbs_g) * 100;
    if (carbsPercentage < 40) {
      insights.push({
        type: 'warning',
        icon: '🍞',
        title: 'Carboidratos insuficientes',
        message: `Você precisa de mais energia. Adicione arroz, batata ou frutas para atingir a meta.`
      });
    }

    // Análise de água
    const waterPercentage = (currentTotals.water_ml / goals.water_ml) * 100;
    if (waterPercentage < 60) {
      insights.push({
        type: 'warning',
        icon: '💧',
        title: 'Hidratação baixa',
        message: `Você bebeu apenas ${waterPercentage.toFixed(0)}% da meta de água. Lembre-se de beber água regularmente.`
      });
    } else if (waterPercentage >= 100) {
      insights.push({
        type: 'success',
        icon: '🌊',
        title: 'Hidratação perfeita!',
        message: `Parabéns! Você atingiu a meta de hidratação.`
      });
    }

    // Análise de calorias
    const kcalPercentage = (currentTotals.kcal / goals.kcal) * 100;
    if (kcalPercentage < 70) {
      insights.push({
        type: 'info',
        icon: '⚡',
        title: 'Calorias baixas',
        message: `Você consumiu ${kcalPercentage.toFixed(0)}% da meta calórica. Considere adicionar um lanche saudável.`
      });
    } else if (kcalPercentage > 130) {
      insights.push({
        type: 'warning',
        icon: '📈',
        title: 'Calorias altas',
        message: `Você excedeu a meta em ${(kcalPercentage - 100).toFixed(0)}%. Considere reduzir porções nas próximas refeições.`
      });
    }


    return insights;
  };

  const insights = getInsights();

  if (insights.length === 0) {
    return (
      <Card className="bg-green-50 border-green-200">
        <div className="text-center py-4">
          <div className="text-4xl mb-2">🎉</div>
          <h3 className="text-lg font-semibold text-green-800">Excelente dia!</h3>
          <p className="text-green-600">Você está no caminho certo com sua nutrição!</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
        <span className="mr-2">🧠</span>
        Insights Inteligentes
      </h3>
      
      <div className="space-y-3">
        {insights.map((insight, index) => (
          <Card
            key={index}
            className={`${
              insight.type === 'success' ? 'bg-green-50 border-green-200' :
              insight.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
              insight.type === 'info' ? 'bg-blue-50 border-blue-200' :
              'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-start space-x-3">
              <span className="text-2xl">{insight.icon}</span>
              <div className="flex-1">
                <h4 className={`font-medium ${
                  insight.type === 'success' ? 'text-green-800' :
                  insight.type === 'warning' ? 'text-yellow-800' :
                  insight.type === 'info' ? 'text-blue-800' :
                  'text-gray-800'
                }`}>
                  {insight.title}
                </h4>
                <p className={`text-sm ${
                  insight.type === 'success' ? 'text-green-600' :
                  insight.type === 'warning' ? 'text-yellow-600' :
                  insight.type === 'info' ? 'text-blue-600' :
                  'text-gray-600'
                }`}>
                  {insight.message}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
