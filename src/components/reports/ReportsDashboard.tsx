import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { DailyReport } from './DailyReport';
import { WeeklyReport } from './WeeklyReport';
import { startOfWeek } from 'date-fns';

interface ReportsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

type ReportType = 'daily' | 'weekly' | 'monthly';

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({
  isOpen,
  onClose
}) => {
  const [activeReport, setActiveReport] = useState<ReportType>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleWeekChange = (newWeekStart: Date) => {
    setWeekStart(newWeekStart);
  };

  const reportTabs = [
    { id: 'daily', label: 'Diário', icon: '📅' },
    { id: 'weekly', label: 'Semanal', icon: '📊' },
    { id: 'monthly', label: 'Mensal', icon: '📈' }
  ] as const;

  const renderReport = () => {
    switch (activeReport) {
      case 'daily':
        return <DailyReport date={selectedDate} />;
      case 'weekly':
        return <WeeklyReport weekStart={weekStart} onWeekChange={handleWeekChange} />;
      case 'monthly':
        return (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📈</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Relatório Mensal
            </h3>
            <p className="text-gray-600">
              Em desenvolvimento...
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📊 Relatórios"
      size="xl"
    >
      <div className="space-y-6">
        {/* Report Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {reportTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveReport(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm min-h-[44px] flex items-center space-x-2 ${
                  activeReport === tab.id
                    ? 'border-blue-500 text-blue-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Date Selector for Daily Report */}
        {activeReport === 'daily' && (
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">
              Data:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {/* Report Content */}
        <div className="min-h-[600px]">
          {renderReport()}
        </div>
      </div>
    </Modal>
  );
};
