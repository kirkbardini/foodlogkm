import React from 'react';
import { useAppStore, userThemes } from '../store/useAppStore';
import { Card } from './ui/Card';

export const Dashboard: React.FC = () => {
  const {
    currentUser,
    selectedDate,
    users,
    setCurrentUser,
    setSelectedDate,
    getDailyTotals,
    isAuthenticated,
  } = useAppStore();

  // Filtrar apenas usuários Kirk e Manu
  const filteredUsers = React.useMemo(() => {
    return (users || []).filter(user => user.id === 'kirk' || user.id === 'manu');
  }, [users]);

  const currentUserData = filteredUsers.find(u => u.id === currentUser);
  const dailyTotals = getDailyTotals(currentUser, selectedDate);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const formatDateBR = (dateISO: string) => {
    const [year, month, day] = dateISO.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">FoodLog KM</h1>
          <p className="text-gray-600">Registro de alimentos e nutrientes</p>
        </div>
        
        {/* User Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {filteredUsers.map((user) => {
            const theme = userThemes[user.id as keyof typeof userThemes];
            return (
              <button
                key={user.id}
                onClick={() => setCurrentUser(user.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                  currentUser === user.id
                    ? `${theme.bgGradient} ${theme.textColor} shadow-lg transform scale-105`
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>{user.name}</span>
                  {currentUser === user.id && (
                    <div className="flex items-center space-x-1">
                      <div className={`w-2 h-2 rounded-full ${
                        isAuthenticated ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                      <span className={`text-xs ${
                        isAuthenticated ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {isAuthenticated ? '🟢 Conectado' : '⚪ Offline'}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Selection */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Data Selecionada</h2>
            <p className="text-sm text-gray-600">
              {formatDateBR(selectedDate)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => {
              const event = new CustomEvent('openFoodEntry');
              window.dispatchEvent(event);
            }}
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="truncate">Novo Lançamento</span>
          </button>
          <button
            onClick={() => {
              const event = new CustomEvent('openAddWater');
              window.dispatchEvent(event);
            }}
            className="inline-flex items-center justify-center px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 w-full"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <span className="truncate">Adicionar Água</span>
          </button>
          <button
            onClick={() => {
              const event = new CustomEvent('openFoodsManager');
              window.dispatchEvent(event);
            }}
            className="inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 w-full"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="truncate">Alimentos</span>
          </button>
          <button
            onClick={() => {
              const event = new CustomEvent('openReports');
              window.dispatchEvent(event);
            }}
            className="inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="truncate">Relatórios</span>
          </button>
        </div>
      </Card>

      {/* Nutrition Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Protein */}
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {dailyTotals.protein_g.toFixed(1)}g
            </div>
            <div className="text-sm text-gray-600 mb-2">Proteínas</div>
            <div className="text-xs text-gray-500">
              Meta: {currentUserData?.goals.protein_g || 0}g
            </div>
          </div>
        </Card>

        {/* Carbs */}
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {dailyTotals.carbs_g.toFixed(1)}g
            </div>
            <div className="text-sm text-gray-600 mb-2">Carboidratos</div>
            <div className="text-xs text-gray-500">
              Meta: {currentUserData?.goals.carbs_g || 0}g
            </div>
          </div>
        </Card>

        {/* Fat */}
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {dailyTotals.fat_g.toFixed(1)}g
            </div>
            <div className="text-sm text-gray-600 mb-2">Gorduras</div>
            <div className="text-xs text-gray-500">
              Meta: {currentUserData?.goals.fat_g || 0}g
            </div>
          </div>
        </Card>

        {/* Calories */}
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {dailyTotals.kcal.toFixed(0)}
            </div>
            <div className="text-sm text-gray-600 mb-2">Calorias</div>
            <div className="text-xs text-gray-500">
              Meta: {currentUserData?.goals.kcal || 0}
            </div>
          </div>
        </Card>

        {/* Water */}
        <Card>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-600">
              {dailyTotals.water_ml.toFixed(0)}ml
            </div>
            <div className="text-sm text-gray-600 mb-2">Água</div>
            <div className="text-xs text-gray-500">
              Meta: {currentUserData?.goals.water_ml || 0}ml
            </div>
          </div>
        </Card>
      </div>

    </div>
  );
};
