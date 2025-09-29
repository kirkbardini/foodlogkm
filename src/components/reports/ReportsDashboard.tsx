import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { DailyReport } from './DailyReport';
import { WeeklyReport } from './WeeklyReport';
import { MonthlyReport } from './MonthlyReport';
import { startOfWeek, startOfMonth } from 'date-fns';

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
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [monthStart, setMonthStart] = useState(startOfMonth(new Date()));

  const handleDailyDateChange = (newDate: string) => {
    setSelectedDate(newDate);
  };

  const handleWeekChange = (newWeekStart: Date) => {
    setWeekStart(newWeekStart);
  };

  const handleMonthChange = (newMonthStart: Date) => {
    setMonthStart(newMonthStart);
  };

  const reportTabs = [
    { id: 'daily', label: 'Diário', icon: '📅' },
    { id: 'weekly', label: 'Semanal', icon: '📊' },
    { id: 'monthly', label: 'Mensal', icon: '📈' }
  ] as const;

  const renderReport = () => {
    switch (activeReport) {
      case 'daily':
        return <DailyReport date={selectedDate} onDateChange={handleDailyDateChange} />;
      case 'weekly':
        return <WeeklyReport weekStart={weekStart} onWeekChange={handleWeekChange} />;
      case 'monthly':
        return <MonthlyReport monthStart={monthStart} onMonthChange={handleMonthChange} />;
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

        {/* Date Selector removido - navegação agora é feita pelos botões no DailyReport */}

        {/* Report Content */}
        <div className="min-h-[600px]">
          {renderReport()}
        </div>
      </div>
    </Modal>
  );
};
