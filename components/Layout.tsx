import React from 'react';
import { BookOpen, Library, GraduationCap } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onHome?: () => void;
  onManageData?: () => void;
  onLearning?: () => void;
  currentPage?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, onHome, onManageData, onLearning, currentPage }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={onHome}
          >
            <div className="w-8 h-8 bg-slate-900 text-amber-400 rounded-md flex items-center justify-center">
              <BookOpen size={20} strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-bold tracking-tight hidden md:block">준벅식<span className="text-slate-500">올단어</span></h1>
            <h1 className="text-xl font-bold tracking-tight md:hidden">준벅</h1>
          </div>
          
          <div className="flex items-center gap-1 md:gap-2">
             <button 
              onClick={onLearning}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium
                ${currentPage === 'LEARNING' 
                  ? 'bg-amber-100 text-amber-900' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}
              `}
            >
              <GraduationCap size={18} />
              <span className="hidden md:inline">학습</span>
            </button>

            <button 
              onClick={onHome}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium
                ${(currentPage === 'HOME' || currentPage === 'QUIZ') 
                  ? 'bg-slate-100 text-slate-900' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}
              `}
            >
              <BookOpen size={18} />
              <span className="hidden md:inline">퀴즈</span>
            </button>

            <button 
              onClick={onManageData}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium
                ${currentPage === 'DATA_MANAGER' 
                  ? 'bg-slate-100 text-slate-900' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}
              `}
            >
              <Library size={18} />
              <span className="hidden md:inline">관리</span>
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-3xl mx-auto w-full p-4 flex flex-col">
        {children}
      </main>
      <footer className="py-6 text-center text-slate-400 text-sm">
        <p>© 2024 준벅식올단어.</p>
      </footer>
    </div>
  );
};