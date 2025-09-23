import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAppStore } from './store/useAppStore';
import { Dashboard } from './components/Dashboard';
import { FoodEntry } from './components/FoodEntry';
import { DailyEntries } from './components/DailyEntries';
import { FoodsManager } from './components/FoodsManager';
import { AddWaterModal } from './components/AddWaterModal';
import { ReportsDashboard } from './components/reports/ReportsDashboard';
import { FirebaseSync } from './components/FirebaseSync';
import { Entry } from './types';

function App() {
  const { 
    initializeApp, 
    isLoading, 
    error, 
    addEntry, 
    updateEntry, 
    deleteEntry
  } = useAppStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showFoodsManager, setShowFoodsManager] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showAddWater, setShowAddWater] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

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

    window.addEventListener('openFoodEntry', handleOpenFoodEntry);
    window.addEventListener('openFoodsManager', handleOpenFoodsManager);
    window.addEventListener('openReports', handleOpenReports);
    window.addEventListener('openAddWater', handleOpenAddWater);

    return () => {
      window.removeEventListener('openFoodEntry', handleOpenFoodEntry);
      window.removeEventListener('openFoodsManager', handleOpenFoodsManager);
      window.removeEventListener('openReports', handleOpenReports);
      window.removeEventListener('openAddWater', handleOpenAddWater);
    };
  }, []);

  const handleEditEntry = (entry: Entry) => {
    setEditingEntry(entry);
    setShowAddModal(true);
  };

  const handleDuplicateEntry = (entry: Entry) => {
    const duplicatedEntry = {
      ...entry,
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      note: entry.note ? `${entry.note} (cópia)` : 'Cópia'
    };
    addEntry(duplicatedEntry);
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
    setEditingEntry(null);
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


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Dashboard />
        
        {/* Daily Entries */}
        <div className="mt-8">
          <DailyEntries
            onEdit={handleEditEntry}
            onDuplicate={handleDuplicateEntry}
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

      <ReportsDashboard
        isOpen={showReports}
        onClose={handleCloseModals}
      />

      <FirebaseSync />

      <Toaster position="top-right" />
    </div>
  );
}

export default App;
