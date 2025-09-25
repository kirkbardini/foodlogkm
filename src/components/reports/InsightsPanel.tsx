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
    
    // Função para determinar status baseado no tipo de macro
    const getMacroStatus = (percentage: number, macroType: string) => {
      switch (macroType.toLowerCase()) {
        case 'proteína':
        case 'proteínas':
          if (percentage < 85) return 'very-low';
          if (percentage <= 94) return 'low';
          if (percentage <= 110) return 'target';
          if (percentage <= 120) return 'above';
          return 'excess';
        
        case 'carboidrato':
        case 'carboidratos':
          if (percentage < 70) return 'very-low';
          if (percentage <= 84) return 'low';
          if (percentage <= 100) return 'target';
          if (percentage <= 105) return 'above';
          return 'excess';
        
        case 'gordura':
        case 'gorduras':
          if (percentage < 70) return 'very-low';
          if (percentage <= 84) return 'low';
          if (percentage <= 100) return 'target';
          if (percentage <= 110) return 'above';
          return 'excess';
        
        case 'caloria':
        case 'calorias':
          if (percentage < 90) return 'very-low';
          if (percentage <= 96) return 'low';
          if (percentage <= 103) return 'target';
          if (percentage <= 107) return 'above';
          return 'excess';
        
        case 'água':
        case 'agua':
          if (percentage < 75) return 'very-low';
          if (percentage <= 90) return 'low';
          if (percentage <= 130) return 'target';
          if (percentage <= 150) return 'above';
          return 'excess';
        
        default:
          return 'target';
      }
    };
    
    // Análise de proteínas
    const proteinPercentage = (currentTotals.protein_g / goals.protein_g) * 100;
    const proteinStatus = getMacroStatus(proteinPercentage, 'proteína');
    
    if (proteinStatus === 'very-low') {
      insights.push({
        type: 'warning',
        icon: '🔴',
        title: 'Proteína muito baixa',
        message: `Você consumiu apenas ${proteinPercentage.toFixed(0)}% da meta de proteína. Adicione carnes, ovos ou leguminosas.`
      });
    } else if (proteinStatus === 'low') {
      insights.push({
        type: 'warning',
        icon: '🟠',
        title: 'Proteína baixa',
        message: `Você consumiu ${proteinPercentage.toFixed(0)}% da meta de proteína. Considere adicionar mais fontes proteicas.`
      });
    } else if (proteinStatus === 'target') {
      insights.push({
        type: 'success',
        icon: '✅',
        title: 'Proteína em dia!',
        message: `Excelente! Você atingiu ${proteinPercentage.toFixed(0)}% da meta de proteína.`
      });
    } else if (proteinStatus === 'above') {
      insights.push({
        type: 'info',
        icon: '🟡',
        title: 'Proteína acima da meta',
        message: `Você consumiu ${proteinPercentage.toFixed(0)}% da meta de proteína. Está um pouco acima, mas ainda dentro do aceitável.`
      });
    } else if (proteinStatus === 'excess') {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        title: 'Proteína em excesso',
        message: `Você consumiu ${proteinPercentage.toFixed(0)}% da meta de proteína. Considere reduzir a ingestão proteica.`
      });
    }

    // Análise de carboidratos
    const carbsPercentage = (currentTotals.carbs_g / goals.carbs_g) * 100;
    const carbsStatus = getMacroStatus(carbsPercentage, 'carboidrato');
    
    if (carbsStatus === 'very-low') {
      insights.push({
        type: 'warning',
        icon: '🔴',
        title: 'Carboidratos muito baixos',
        message: `Você consumiu apenas ${carbsPercentage.toFixed(0)}% da meta de carboidratos. Adicione arroz, batata ou frutas.`
      });
    } else if (carbsStatus === 'low') {
      insights.push({
        type: 'warning',
        icon: '🟠',
        title: 'Carboidratos baixos',
        message: `Você consumiu ${carbsPercentage.toFixed(0)}% da meta de carboidratos. Considere adicionar mais fontes energéticas.`
      });
    } else if (carbsStatus === 'target') {
      insights.push({
        type: 'success',
        icon: '✅',
        title: 'Carboidratos em dia!',
        message: `Excelente! Você atingiu ${carbsPercentage.toFixed(0)}% da meta de carboidratos.`
      });
    } else if (carbsStatus === 'above') {
      insights.push({
        type: 'info',
        icon: '🟡',
        title: 'Carboidratos acima da meta',
        message: `Você consumiu ${carbsPercentage.toFixed(0)}% da meta de carboidratos. Está um pouco acima, mas ainda dentro do aceitável.`
      });
    } else if (carbsStatus === 'excess') {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        title: 'Carboidratos em excesso',
        message: `Você consumiu ${carbsPercentage.toFixed(0)}% da meta de carboidratos. Considere reduzir a ingestão.`
      });
    }

    // Análise de gorduras
    const fatPercentage = (currentTotals.fat_g / goals.fat_g) * 100;
    const fatStatus = getMacroStatus(fatPercentage, 'gordura');
    
    if (fatStatus === 'very-low') {
      insights.push({
        type: 'warning',
        icon: '🔴',
        title: 'Gorduras muito baixas',
        message: `Você consumiu apenas ${fatPercentage.toFixed(0)}% da meta de gorduras. Adicione azeite, abacate ou castanhas.`
      });
    } else if (fatStatus === 'low') {
      insights.push({
        type: 'warning',
        icon: '🟠',
        title: 'Gorduras baixas',
        message: `Você consumiu ${fatPercentage.toFixed(0)}% da meta de gorduras. Considere adicionar mais fontes de gordura saudável.`
      });
    } else if (fatStatus === 'target') {
      insights.push({
        type: 'success',
        icon: '✅',
        title: 'Gorduras em dia!',
        message: `Excelente! Você atingiu ${fatPercentage.toFixed(0)}% da meta de gorduras.`
      });
    } else if (fatStatus === 'above') {
      insights.push({
        type: 'info',
        icon: '🟡',
        title: 'Gorduras acima da meta',
        message: `Você consumiu ${fatPercentage.toFixed(0)}% da meta de gorduras. Está um pouco acima, mas ainda dentro do aceitável.`
      });
    } else if (fatStatus === 'excess') {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        title: 'Gorduras em excesso',
        message: `Você consumiu ${fatPercentage.toFixed(0)}% da meta de gorduras. Considere reduzir a ingestão.`
      });
    }

    // Análise de calorias
    const kcalPercentage = (currentTotals.kcal / goals.kcal) * 100;
    const kcalStatus = getMacroStatus(kcalPercentage, 'caloria');
    
    if (kcalStatus === 'very-low') {
      insights.push({
        type: 'warning',
        icon: '🔴',
        title: 'Calorias muito baixas',
        message: `Você consumiu apenas ${kcalPercentage.toFixed(0)}% da meta calórica. Considere adicionar um lanche saudável.`
      });
    } else if (kcalStatus === 'low') {
      insights.push({
        type: 'warning',
        icon: '🟠',
        title: 'Calorias baixas',
        message: `Você consumiu ${kcalPercentage.toFixed(0)}% da meta calórica. Considere adicionar mais alimentos.`
      });
    } else if (kcalStatus === 'target') {
      insights.push({
        type: 'success',
        icon: '✅',
        title: 'Calorias em dia!',
        message: `Excelente! Você atingiu ${kcalPercentage.toFixed(0)}% da meta calórica.`
      });
    } else if (kcalStatus === 'above') {
      insights.push({
        type: 'info',
        icon: '🟡',
        title: 'Calorias acima da meta',
        message: `Você consumiu ${kcalPercentage.toFixed(0)}% da meta calórica. Está um pouco acima, mas ainda dentro do aceitável.`
      });
    } else if (kcalStatus === 'excess') {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        title: 'Calorias em excesso',
        message: `Você consumiu ${kcalPercentage.toFixed(0)}% da meta calórica. Considere reduzir porções nas próximas refeições.`
      });
    }

    // Análise de água
    const waterPercentage = (currentTotals.water_ml / goals.water_ml) * 100;
    const waterStatus = getMacroStatus(waterPercentage, 'água');
    
    if (waterStatus === 'very-low') {
      insights.push({
        type: 'warning',
        icon: '🔴',
        title: 'Hidratação muito baixa',
        message: `Você bebeu apenas ${waterPercentage.toFixed(0)}% da meta de água. Lembre-se de beber água regularmente.`
      });
    } else if (waterStatus === 'low') {
      insights.push({
        type: 'warning',
        icon: '🟠',
        title: 'Hidratação baixa',
        message: `Você bebeu ${waterPercentage.toFixed(0)}% da meta de água. Considere aumentar a ingestão de líquidos.`
      });
    } else if (waterStatus === 'target') {
      insights.push({
        type: 'success',
        icon: '✅',
        title: 'Hidratação perfeita!',
        message: `Parabéns! Você atingiu ${waterPercentage.toFixed(0)}% da meta de hidratação.`
      });
    } else if (waterStatus === 'above') {
      insights.push({
        type: 'info',
        icon: '🟡',
        title: 'Hidratação acima da meta',
        message: `Você bebeu ${waterPercentage.toFixed(0)}% da meta de água. Está um pouco acima, mas ainda dentro do aceitável.`
      });
    } else if (waterStatus === 'excess') {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        title: 'Hidratação em excesso',
        message: `Você bebeu ${waterPercentage.toFixed(0)}% da meta de água. Considere reduzir a ingestão de líquidos.`
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

