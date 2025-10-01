import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAppStore } from './store/useAppStore';
import { Dashboard } from './components/Dashboard';
import { FoodEntry } from './components/FoodEntry';
import { DailyEntries } from './components/DailyEntries';
import { FoodsManager } from './components/FoodsManager';
import { AddWaterModal } from './components/AddWaterModal';
import { AddCalorieExpenditureModal } from './components/AddCalorieExpenditureModal';
import { CalorieExpenditureManager } from './components/CalorieExpenditureManager';
import { ReportsDashboard } from './components/reports/ReportsDashboard';
import { FirebaseSync } from './components/FirebaseSync';
import { LoadingModal } from './components/LoadingModal';
import { Entry } from './types';

function App() {
  const { 
    initializeApp, 
    isLoading, 
    error, 
    updateEntry, 
    deleteEntry,
    getCurrentUserTheme,
    isAuthenticated
  } = useAppStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showFoodsManager, setShowFoodsManager] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showAddWater, setShowAddWater] = useState(false);
  const [showAddCalorieExpenditure, setShowAddCalorieExpenditure] = useState(false);
  const [showCalorieExpenditureManager, setShowCalorieExpenditureManager] = useState(false);
  const [calorieExpenditureDate, setCalorieExpenditureDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showFirebaseSync, setShowFirebaseSync] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(false);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // Event listeners for custom events from Dashboard
  useEffect(() => {
    const handleOpenFoodEntry = () => {
      setShowAddModal(true);
    };

    const handleOpenFoodsManager = () => {
      setShowFoodsManager(true);
    };

    const handleOpenReports = () => {
      setShowReports(true);
    };

    const handleOpenAddWater = () => {
      setShowAddWater(true);
    };

    const handleOpenAddCalorieExpenditure = () => {
      setCalorieExpenditureDate(new Date().toISOString().split('T')[0]);
      setShowAddCalorieExpenditure(true);
    };

    const handleOpenCalorieExpenditureManager = () => {
      setShowCalorieExpenditureManager(true);
    };

    const handleOpenFirebaseSync = () => {
      setShowFirebaseSync(true);
    };

    window.addEventListener('openFoodEntry', handleOpenFoodEntry);
    window.addEventListener('openFoodsManager', handleOpenFoodsManager);
    window.addEventListener('openReports', handleOpenReports);
    window.addEventListener('openAddWater', handleOpenAddWater);
    window.addEventListener('openAddCalorieExpenditure', handleOpenAddCalorieExpenditure);
    window.addEventListener('openCalorieExpenditureManager', handleOpenCalorieExpenditureManager);
    window.addEventListener('openFirebaseSync', handleOpenFirebaseSync);

    return () => {
      window.removeEventListener('openFoodEntry', handleOpenFoodEntry);
      window.removeEventListener('openFoodsManager', handleOpenFoodsManager);
      window.removeEventListener('openReports', handleOpenReports);
      window.removeEventListener('openAddWater', handleOpenAddWater);
      window.removeEventListener('openAddCalorieExpenditure', handleOpenAddCalorieExpenditure);
      window.removeEventListener('openCalorieExpenditureManager', handleOpenCalorieExpenditureManager);
      window.removeEventListener('openFirebaseSync', handleOpenFirebaseSync);
    };
  }, []);

  const handleEditEntry = (entry: Entry) => {
    setEditingEntry(entry);
    setShowAddModal(true);
  };


  const handleDeleteEntry = async (id: string) => {
    await deleteEntry(id);
  };

  const handleUpdateEntry = (entry: Entry) => {
    updateEntry(entry);
    setEditingEntry(null);
  };

  const handleCloseModals = () => {
    setShowAddModal(false);
    setShowFoodsManager(false);
    setShowReports(false);
    setShowAddWater(false);
    setShowAddCalorieExpenditure(false);
    setShowCalorieExpenditureManager(false);
    setEditingEntry(null);
  };

  // Função para controlar o loading do Firebase
  const handleFirebaseLoading = (loading: boolean) => {
    setIsFirebaseLoading(loading);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">❌</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }


  const userTheme = getCurrentUserTheme();

  return (
    <div className={`min-h-screen ${userTheme.subtleBg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Dashboard />
        
        {/* Daily Entries */}
        <div className="mt-8">
          <DailyEntries
            onEdit={handleEditEntry}
            onDelete={handleDeleteEntry}
          />
        </div>
      </div>

      {/* Modals */}
      <FoodEntry
        isOpen={showAddModal}
        onClose={handleCloseModals}
        editingEntry={editingEntry}
        onUpdate={handleUpdateEntry}
      />

      <FoodsManager
        isOpen={showFoodsManager}
        onClose={handleCloseModals}
      />

      <AddWaterModal
        isOpen={showAddWater}
        onClose={handleCloseModals}
      />

      <AddCalorieExpenditureModal
        isOpen={showAddCalorieExpenditure}
        onClose={handleCloseModals}
        selectedDate={calorieExpenditureDate}
        onDateChange={setCalorieExpenditureDate}
      />

      <CalorieExpenditureManager
        isOpen={showCalorieExpenditureManager}
        onClose={handleCloseModals}
      />

      <ReportsDashboard
        isOpen={showReports}
        onClose={handleCloseModals}
      />

      <FirebaseSync 
        isOpen={showFirebaseSync}
        onClose={() => setShowFirebaseSync(false)}
        onLoadingChange={handleFirebaseLoading} 
      />

      <LoadingModal
        isOpen={isFirebaseLoading}
        message="Sincronizando dados do Firebase..."
      />

      {/* Footer de Sincronização */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              isAuthenticated ? 'bg-green-500' : 'bg-gray-400'
            }`} />
            <span className={`text-sm ${
              isAuthenticated ? 'text-green-600' : 'text-gray-500'
            }`}>
              {isAuthenticated ? 'Conectado' : 'Pronto para sincronizar'}
            </span>
          </div>
          <button
            onClick={() => {
              const event = new CustomEvent('openFirebaseSync');
              window.dispatchEvent(event);
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {isAuthenticated ? 'Gerenciar' : 'Conectar'}
          </button>
        </div>
      </footer>

      <Toaster position="top-right" />
    </div>
  );
}

export default App;
