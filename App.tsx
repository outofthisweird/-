import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Layout } from './components/Layout';
import { Button } from './components/Button';
import { Card, AppState, STORAGE_KEY_WRONG_CARDS, STORAGE_KEY_MEMOS, LoadedFile } from './types';
import { Upload, FileText, Play, CheckCircle2, XCircle, ArrowRight, BookMarked, AlertCircle, RotateCcw, Home, RefreshCw, Trash2, Plus, Layers, GraduationCap, ChevronLeft, ChevronRight, PenLine, Shuffle, Globe } from 'lucide-react';

// --- Utils ---
const normalizeAnswer = (input: string): string => {
  return input.trim().toLowerCase().replace(/\s+/g, ' ');
};

const validateCard = (obj: any): boolean => {
  // Relaxed validation to support the new schema where some fields might be inferred
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.lemma === 'string' &&
    Array.isArray(obj.translations_ko)
  );
};

// Helper to strip internal IDs (e.g., "fern_198" -> "fern")
const cleanText = (text: string): string => {
  if (!text) return "";
  return text.replace(/_\d+$/, '');
};

const parseJSONL = (text: string): { cards: Card[], error?: string } => {
  const lines = text.trim().split('\n');
  const cards: Card[] = [];
  const seen = new Set<string>();
  let invalidCount = 0;

  lines.forEach((line, index) => {
    if (!line.trim()) return;
    try {
      const obj = JSON.parse(line);
      if (validateCard(obj)) {
        // Prepare cleaned lemma
        const rawLemma = obj.lemma;
        const displayLemma = cleanText(rawLemma);
        const displayFullForm = obj.full_form ? cleanText(obj.full_form) : displayLemma;

        // Construct Card object with defaults for missing fields
        const card: Card = {
          id: typeof obj.id === 'number' ? obj.id : Date.now() + index, // Generate ID if missing
          lemma: displayLemma,
          gender: obj.gender || null,
          full_form: displayFullForm, 
          translations_ko: obj.translations_ko,
          prompt_ko: obj.prompt_ko || obj.translations_ko[0] || '???', // Default prompt to first translation
          accepted_answers_de: Array.isArray(obj.accepted_answers_de) 
            ? obj.accepted_answers_de.map((ans: string) => cleanText(ans).toLowerCase())
            : [displayLemma.toLowerCase()], // Default answers to lemma
          level: obj.level || 'Unknown',
          topic: obj.topic || 'General',
          language: obj.language || 'German' // Default language
        };

        // Deduplication: Create a signature based on content fields
        const signature = JSON.stringify({
          lang: card.language,
          lemma: card.lemma,
          gender: card.gender,
          trans: card.translations_ko,
          level: card.level,
          topic: card.topic
        });

        if (!seen.has(signature)) {
          seen.add(signature);
          cards.push(card);
        }
      } else {
        console.warn(`Invalid card structure at line ${index + 1}`);
        invalidCount++;
      }
    } catch (e) {
      console.warn(`JSON parse error at line ${index + 1}`);
      invalidCount++;
    }
  });

  if (cards.length === 0) {
    return { cards: [], error: "유효한 카드 데이터가 없습니다." };
  }

  if (invalidCount > 0) {
    if (cards.length < lines.length * 0.5) {
       return { cards, error: `파일의 상당수(${invalidCount}줄)가 올바르지 않은 형식입니다.` };
    }
  }

  return { cards };
};

// --- Components ---

// 1. Data Manager View
interface DataManagerViewProps {
  files: LoadedFile[];
  onAddFile: (file: File) => void;
  onRemoveFile: (id: string) => void;
  onGoHome: () => void;
}

const DataManagerView: React.FC<DataManagerViewProps> = ({ files, onAddFile, onRemoveFile, onGoHome }) => {
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalCards = files.reduce((acc, f) => acc + f.cards.length, 0);

  const processAndUpload = (file: File) => {
     setErrorMsg(null);
     const reader = new FileReader();
     reader.onload = (e) => {
       const text = e.target?.result as string;
       const { cards, error } = parseJSONL(text);
       if (cards.length > 0) {
          const newFile: LoadedFile = {
            id: Date.now().toString() + Math.random().toString().slice(2, 6),
            name: file.name,
            cards: cards,
            timestamp: Date.now()
          };
          (onAddFile as any)(newFile);
       } else {
         setErrorMsg(error || "파일을 읽을 수 없습니다.");
       }
     };
     reader.readAsText(file);
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processAndUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex flex-col flex-1 py-6 space-y-8 animate-in fade-in slide-in-from-bottom-2">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">자료 관리 (Library)</h2>
        <p className="text-slate-500 mt-1">
          다양한 단어장 파일을 추가하여 한꺼번에 학습하세요.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <span className="font-semibold text-slate-700 text-sm">업로드된 파일 목록</span>
          <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full font-bold">
            Total Cards: {totalCards}
          </span>
        </div>
        
        {files.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            등록된 파일이 없습니다.<br/>아래에서 파일을 추가해주세요.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {files.map(file => (
              <li key={file.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      카드 {file.cards.length}개 • {new Date(file.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => onRemoveFile(file.id)}
                  className="text-slate-400 hover:text-red-500 p-2 transition-colors"
                  title="삭제"
                >
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-4">
        {errorMsg && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}
        
        <div 
          className={`border-3 border-dashed rounded-xl flex flex-col items-center justify-center p-8 transition-all cursor-pointer
            ${dragActive ? 'border-amber-500 bg-amber-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'}
          `}
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input 
            ref={inputRef} 
            type="file" 
            accept=".jsonl,.json" 
            className="hidden" 
            onChange={(e) => {
              if (e.target.files?.[0]) processAndUpload(e.target.files[0]);
            }} 
          />
          <Plus size={32} className={`mb-2 ${dragActive ? 'text-amber-500' : 'text-slate-400'}`} />
          <p className="font-medium text-slate-700">새 파일 추가하기</p>
          <p className="text-xs text-slate-400 mt-1">card.jsonl 형식</p>
        </div>
      </div>

      {files.length > 0 && (
         <Button onClick={onGoHome} size="lg" className="w-full">
           학습 설정으로 이동 <ArrowRight className="ml-2" size={18} />
         </Button>
      )}

      <div className="text-center pt-4">
         <button 
            onClick={() => {
              const sampleData = `{"lemma":"constitution","gender":null,"translations_ko":["헌법"],"level":"B2","topic":"정치/공공","language":"English"}\n{"id":1,"lemma":"Apfel","gender":"m","full_form":"der Apfel","translations_ko":["사과"],"prompt_ko":"사과","accepted_answers_de":["der apfel"],"level":"A1","topic":"Food","language":"German"}`;
              const { cards } = parseJSONL(sampleData);
              const newFile: LoadedFile = {
                  id: "sample-id", name: "Sample_Multi_Lang.jsonl", cards, timestamp: Date.now()
              };
              (onAddFile as any)(newFile);
            }}
            className="text-slate-400 text-xs hover:text-slate-600 underline"
          >
            샘플 데이터 추가해보기
          </button>
      </div>
    </div>
  );
};

// 2. Learning View (Refactored)
interface LearningViewProps {
  allCards: Card[];
  onGoToManager: () => void;
  availableLanguages: string[];
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
}

const LearningView: React.FC<LearningViewProps> = ({ allCards, onGoToManager, availableLanguages, selectedLanguage, onSelectLanguage }) => {
  const [mode, setMode] = useState<'SELECT' | 'STUDY'>('SELECT');
  const [targetLevel, setTargetLevel] = useState<string>('A1');
  const [isShuffle, setIsShuffle] = useState(false);
  const [studyCards, setStudyCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [memos, setMemos] = useState<Record<number, string>>({});

  // Filter cards by selected language
  const languageCards = useMemo(() => {
    return allCards.filter(c => (c.language || 'German') === selectedLanguage);
  }, [allCards, selectedLanguage]);

  // Load memos on mount
  useEffect(() => {
    const savedMemos = localStorage.getItem(STORAGE_KEY_MEMOS);
    if (savedMemos) {
      try {
        setMemos(JSON.parse(savedMemos));
      } catch (e) {
        console.error("Failed to load memos", e);
      }
    }
  }, []);

  const handleMemoChange = (cardId: number, text: string) => {
    if (text.length > 30) return;
    
    const newMemos = { ...memos, [cardId]: text };
    setMemos(newMemos);
    localStorage.setItem(STORAGE_KEY_MEMOS, JSON.stringify(newMemos));
  };

  // Levels for selection
  const levels = useMemo(() => {
    const lvls = Array.from(new Set(languageCards.map(c => c.level))).sort();
    return ['ALL', ...lvls];
  }, [languageCards]);

  const startLearning = () => {
    let filtered = languageCards;
    if (targetLevel !== 'ALL') {
      filtered = languageCards.filter(c => c.level === targetLevel);
    }
    
    if (filtered.length === 0) {
      alert("해당 난이도의 단어가 없습니다.");
      return;
    }
    
    // Shuffle if enabled
    if (isShuffle) {
      filtered = [...filtered].sort(() => Math.random() - 0.5);
    }
    
    setStudyCards(filtered);
    setCurrentIndex(0);
    setMode('STUDY');
  };

  // Keyboard navigation
  useEffect(() => {
    if (mode !== 'STUDY') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent navigation if user is typing in memo
      if (document.activeElement?.tagName === 'INPUT') return;

      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        if (currentIndex < studyCards.length - 1) setCurrentIndex(p => p + 1);
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) setCurrentIndex(p => p - 1);
      } else if (e.key === 'Escape') {
        setMode('SELECT');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, studyCards, currentIndex]);

  // Gender based styles
  const getGenderTheme = (gender: string | null) => {
    switch (gender) {
      case 'm': return {
        bg: 'bg-blue-50', border: 'border-blue-200',
        text: 'text-slate-900', badge: 'bg-blue-200 text-blue-800',
        input: 'bg-white/50 border-blue-200 focus:border-blue-400 placeholder-blue-300'
      };
      case 'f': return {
        bg: 'bg-pink-50', border: 'border-pink-200',
        text: 'text-slate-900', badge: 'bg-pink-200 text-pink-800',
        input: 'bg-white/50 border-pink-200 focus:border-pink-400 placeholder-pink-300'
      };
      case 'n': return {
        bg: 'bg-amber-50', border: 'border-amber-200',
        text: 'text-slate-900', badge: 'bg-amber-200 text-amber-800',
        input: 'bg-white/50 border-amber-200 focus:border-amber-400 placeholder-amber-300'
      };
      // Explicit null/empty handling (e.g. Verbs, Adjectives)
      case null:
      case '':
        return {
          bg: 'bg-emerald-50', border: 'border-emerald-200',
          text: 'text-slate-900', badge: 'bg-emerald-200 text-emerald-800',
          input: 'bg-white/50 border-emerald-200 focus:border-emerald-400 placeholder-emerald-300'
        };
      default: return {
        bg: 'bg-white', border: 'border-slate-200',
        text: 'text-slate-900', badge: 'bg-slate-100 text-slate-600',
        input: 'bg-slate-50 border-slate-200 focus:border-slate-400 placeholder-slate-300'
      };
    }
  };

  if (allCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-10 text-center space-y-6">
        <div className="bg-slate-100 p-6 rounded-full text-slate-400">
          <GraduationCap size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">데이터가 없습니다</h2>
          <p className="text-slate-500 mt-2">먼저 단어장 파일을 추가해주세요.</p>
        </div>
        <Button onClick={onGoToManager}>
          자료 관리로 이동
        </Button>
      </div>
    );
  }

  // --- Mode 1: Selection ---
  if (mode === 'SELECT') {
    return (
      <div className="flex flex-col items-center justify-center flex-1 space-y-8 py-10 w-full max-w-xl mx-auto animate-in fade-in">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-2xl mb-4 text-amber-600">
             <GraduationCap size={32} />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900">단어 학습 설정</h2>
          <p className="text-slate-500 mt-2">
             난이도를 선택하여 단어 카드를 학습하세요.
          </p>
        </div>

        {availableLanguages.length > 1 && (
          <div className="flex flex-wrap gap-2 justify-center w-full max-w-xl">
             {availableLanguages.map(lang => (
               <button 
                  key={lang}
                  onClick={() => onSelectLanguage(lang)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all
                    ${selectedLanguage === lang 
                      ? 'bg-slate-800 text-white shadow-md transform scale-105' 
                      : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'}
                  `}
               >
                 {lang}
               </button>
             ))}
          </div>
        )}

        <div className="w-full space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <label className="block text-sm font-medium text-slate-700">
               {selectedLanguage} 난이도 선택
            </label>
            <div className="grid grid-cols-3 gap-3">
              {levels.map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setTargetLevel(lvl)}
                  className={`py-3 rounded-xl border-2 font-bold transition-all text-sm
                    ${(targetLevel === lvl)
                      ? 'border-amber-500 bg-amber-500 text-white shadow-md' 
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'}
                  `}
                >
                  {lvl === 'ALL' ? '전체' : lvl}
                </button>
              ))}
            </div>

            {/* Shuffle Toggle */}
            <div 
              onClick={() => setIsShuffle(!isShuffle)}
              className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center gap-3 cursor-pointer group select-none"
            >
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${isShuffle ? 'bg-amber-500 border-amber-500' : 'bg-white border-slate-200 group-hover:border-slate-300'}`}>
                    {isShuffle && <CheckCircle2 size={16} className="text-white" />}
                </div>
                <span className={`text-sm font-bold transition-colors ${isShuffle ? 'text-slate-800' : 'text-slate-500'}`}>
                    카드 순서 섞기
                </span>
                <Shuffle size={16} className={`${isShuffle ? 'text-amber-500' : 'text-slate-400'}`} />
            </div>

            <p className="text-xs text-slate-400 text-center pt-2">
               {isShuffle ? '선택한 난이도의 단어를 무작위로 섞어서 학습합니다.' : '선택한 난이도의 단어를 파일 순서대로 학습합니다.'}
            </p>
        </div>

        <Button onClick={startLearning} size="lg" className="w-full text-lg" variant="secondary">
            <GraduationCap size={20} className="mr-2" />
            학습 시작
        </Button>
      </div>
    );
  }

  // --- Mode 2: Study ---
  const currentCard = studyCards[currentIndex];
  const theme = getGenderTheme(currentCard.gender);
  const currentMemo = memos[currentCard.id] || '';

  return (
    <div className="flex flex-col flex-1 py-4 space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center px-2">
         <button 
             onClick={() => setMode('SELECT')} 
             className="text-slate-400 hover:text-slate-600 text-sm font-medium flex items-center"
         >
             <ArrowRight className="rotate-180 mr-1" size={16} /> 설정으로
         </button>
         <div className="text-slate-600 text-sm font-bold bg-slate-100 px-3 py-1 rounded-full">
            {currentIndex + 1} / {studyCards.length}
         </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-full max-w-xl">
             <div className={`rounded-2xl shadow-xl border p-8 md:p-12 text-center relative flex flex-col min-h-[460px] justify-between transition-colors duration-500 ${theme.bg} ${theme.border}`}>
                {/* Meta Badge */}
                <div className="flex justify-center gap-2 mb-6">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/50 text-slate-600 border border-slate-200`}>
                    {currentCard.language || 'German'}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${theme.badge} bg-opacity-50`}>
                    {currentCard.level}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${theme.badge} bg-opacity-50`}>
                    {currentCard.topic}
                  </span>
                  {currentCard.gender && (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${theme.badge}`}>
                      {currentCard.gender === 'm' ? 'Maskulin' : currentCard.gender === 'f' ? 'Feminin' : 'Neutrum'}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-center items-center space-y-6 mb-4">
                  <div>
                    <p className="text-slate-500 text-sm font-medium mb-2">단어 (Word)</p>
                    <h3 className={`text-4xl md:text-5xl font-extrabold leading-tight ${theme.text}`}>
                      {currentCard.full_form || currentCard.lemma}
                    </h3>
                  </div>
                  
                  <div className={`w-16 h-1 rounded-full opacity-30 bg-slate-400`}></div>

                  <div>
                    <p className="text-slate-500 text-sm font-medium mb-2">의미 (Meaning)</p>
                    <p className="text-2xl font-bold text-slate-700">
                      {currentCard.translations_ko.join(', ')}
                    </p>
                    {currentCard.prompt_ko !== currentCard.translations_ko[0] && (
                       <p className="text-slate-400 text-sm mt-1">({currentCard.prompt_ko})</p>
                    )}
                  </div>
                </div>

                {/* Memo Field */}
                <div className="relative mt-4 group">
                  <div className="relative">
                    <PenLine className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      type="text" 
                      value={currentMemo}
                      onChange={(e) => handleMemoChange(currentCard.id, e.target.value)}
                      placeholder="메모 작성 (30자 이내)"
                      maxLength={30}
                      className={`w-full text-sm pl-9 pr-10 py-2.5 rounded-lg border outline-none transition-all ${theme.input} text-slate-700`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono pointer-events-none">
                      {currentMemo.length}/30
                    </span>
                  </div>
                </div>

                {/* Progress bar inside card */}
                <div className="absolute bottom-0 left-0 h-1.5 w-full bg-slate-900/5 overflow-hidden rounded-b-2xl">
                    <div className="h-full bg-slate-900/20 transition-all duration-300" style={{width: `${((currentIndex + 1) / studyCards.length) * 100}%`}}></div>
                </div>
             </div>

             {/* Navigation Controls */}
             <div className="flex justify-between items-center mt-8 gap-4">
                <Button 
                  onClick={() => currentIndex > 0 && setCurrentIndex(p => p - 1)} 
                  variant="outline" 
                  className="flex-1"
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="mr-2" size={20} /> 이전
                </Button>
                
                <span className="text-slate-400 text-sm font-medium hidden md:block">
                  방향키로 이동
                </span>

                <Button 
                  onClick={() => currentIndex < studyCards.length - 1 && setCurrentIndex(p => p + 1)} 
                  variant="primary" 
                  className="flex-1"
                  disabled={currentIndex === studyCards.length - 1}
                >
                  다음 <ChevronRight className="ml-2" size={20} />
                </Button>
             </div>
          </div>
      </div>
    </div>
  );
};


// 3. Config View (Refactored to include Clear Wrong Cards)
interface ConfigViewProps {
  totalCards: number;
  onStart: (level: string | null) => void;
  onGoToManager: () => void;
  savedWrongCardsCount: number;
  onStartReview: () => void;
  onClearWrongCards: () => void;
  availableLanguages: string[];
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
  allCards: Card[];
}

const ConfigView: React.FC<ConfigViewProps> = ({ totalCards, onStart, onGoToManager, savedWrongCardsCount, onStartReview, onClearWrongCards, availableLanguages, selectedLanguage, onSelectLanguage, allCards }) => {
  const [selectedLevel, setSelectedLevel] = useState<string>('A1');
  
  // Compute levels for selected language
  const levels = useMemo(() => {
    const langCards = allCards.filter(c => (c.language || 'German') === selectedLanguage);
    const lvls = Array.from(new Set(langCards.map(c => c.level))).sort();
    return ['ALL', ...lvls];
  }, [allCards, selectedLanguage]);

  const currentLanguageCardsCount = useMemo(() => {
    return allCards.filter(c => (c.language || 'German') === selectedLanguage).length;
  }, [allCards, selectedLanguage]);

  if (totalCards === 0 && savedWrongCardsCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-10 text-center space-y-6">
        <div className="bg-slate-100 p-6 rounded-full text-slate-400">
          <Layers size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">데이터가 없습니다</h2>
          <p className="text-slate-500 mt-2">먼저 단어장 파일을 추가해주세요.</p>
        </div>
        <Button onClick={onGoToManager}>
          자료 관리로 이동
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 space-y-8 py-10 w-full max-w-xl mx-auto animate-in fade-in">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-slate-900">퀴즈 설정</h2>
        <p className="text-slate-500 mt-2">
          총 <span className="font-bold text-slate-900">{totalCards}</span>개의 단어가 준비되어 있습니다.
        </p>
      </div>

      {/* Language Tabs */}
      {availableLanguages.length > 1 && (
        <div className="flex flex-wrap gap-2 justify-center w-full">
           {availableLanguages.map(lang => (
             <button 
                key={lang}
                onClick={() => onSelectLanguage(lang)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2
                  ${selectedLanguage === lang 
                    ? 'bg-slate-800 text-white shadow-md transform scale-105' 
                    : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'}
                `}
             >
               <Globe size={14} />
               {lang}
             </button>
           ))}
        </div>
      )}

      {savedWrongCardsCount > 0 && (
        <div className="w-full bg-red-50 border border-red-100 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BookMarked size={20} className="text-red-500" />
            <div className="text-left">
              <h3 className="font-bold text-slate-800 text-sm">오답 노트</h3>
              <p className="text-slate-600 text-xs">{savedWrongCardsCount}개의 복습할 단어</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={onClearWrongCards}
              className="p-2 text-red-300 hover:text-red-500 hover:bg-red-100 rounded-lg transition-colors"
              title="오답 기록 초기화"
            >
              <Trash2 size={18} />
            </button>
            <Button variant="danger" size="sm" onClick={onStartReview}>
              복습하기
            </Button>
          </div>
        </div>
      )}

      {currentLanguageCardsCount > 0 && (
        <>
          <div className="w-full space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-slate-700">{selectedLanguage} 난이도 선택</label>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                {currentLanguageCardsCount} cards
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {levels.map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevel(lvl)}
                  className={`py-3 rounded-xl border-2 font-bold transition-all text-sm
                    ${(selectedLevel === lvl) || (lvl === 'ALL' && selectedLevel === null)
                      ? 'border-slate-900 bg-slate-900 text-white shadow-md' 
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'}
                  `}
                >
                  {lvl === 'ALL' ? '전체' : lvl}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 text-center pt-2">
              * 한 세트는 무작위로 20문제가 출제됩니다.
            </p>
          </div>

          <Button onClick={() => onStart(selectedLevel === 'ALL' ? null : selectedLevel)} size="lg" className="w-full text-lg">
            <Play size={20} className="mr-2" fill="currentColor" />
            퀴즈 시작
          </Button>
        </>
      )}
    </div>
  );
};

// 4. Quiz View (Unchanged)
interface QuizViewProps {
  cards: Card[];
  onExit: () => void;
  onRetry: (cards: Card[]) => void;
  isReviewMode?: boolean;
}

const QuizView: React.FC<QuizViewProps> = ({ cards, onExit, onRetry, isReviewMode = false }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [stats, setStats] = useState({ total: 0, correct: 0 });
  const [isFinished, setIsFinished] = useState(false);
  const [sessionWrongCards, setSessionWrongCards] = useState<Card[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const currentCard = cards[currentIndex];

  useEffect(() => {
    setCurrentIndex(0); setInput(''); setFeedback('idle');
    setStats({ total: 0, correct: 0 }); setIsFinished(false); setSessionWrongCards([]);
  }, [cards]);

  useEffect(() => {
    if (!isFinished && inputRef.current) inputRef.current.focus();
  }, [currentIndex, feedback, isFinished]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFinished) return;
    if (feedback !== 'idle') { handleNext(); return; }
    if (!input.trim()) return;

    const normalizedInput = normalizeAnswer(input);
    const isCorrect = currentCard.accepted_answers_de.includes(normalizedInput);

    setStats(prev => ({ total: prev.total + 1, correct: isCorrect ? prev.correct + 1 : prev.correct }));
    setFeedback(isCorrect ? 'correct' : 'incorrect');

    if (!isCorrect) {
       saveWrongCard(currentCard);
       setSessionWrongCards(prev => [...prev, currentCard]);
    }
  };

  const saveWrongCard = (card: Card) => {
    const stored = localStorage.getItem(STORAGE_KEY_WRONG_CARDS);
    let list: Card[] = stored ? JSON.parse(stored) : [];
    if (!list.find(c => c.id === card.id)) {
      list.push(card);
      localStorage.setItem(STORAGE_KEY_WRONG_CARDS, JSON.stringify(list));
    }
  };

  const handleNext = () => {
    setFeedback('idle'); setInput('');
    if (currentIndex + 1 >= cards.length) { setIsFinished(true); } else { setCurrentIndex(prev => prev + 1); }
  };

  if (isFinished) {
    const score = Math.round((stats.correct / stats.total) * 100);
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-10 animate-in fade-in duration-500">
        <div className="text-center mb-8">
          <div className="inline-block p-4 rounded-full bg-slate-100 mb-4">
            {score >= 80 ? <CheckCircle2 size={48} className="text-green-500" /> : <AlertCircle size={48} className="text-amber-500" />}
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">세션 종료!</h2>
          <p className="text-slate-500">20문제를 모두 풀었습니다.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-sm">
            <div className="text-4xl font-black text-slate-900 mb-1">{stats.correct}</div>
            <div className="text-sm text-green-600 font-medium">맞은 개수</div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-sm">
            <div className="text-4xl font-black text-slate-900 mb-1">{stats.total - stats.correct}</div>
            <div className="text-sm text-red-500 font-medium">틀린 개수</div>
          </div>
        </div>
        <div className="space-y-3 w-full max-w-md">
          {sessionWrongCards.length > 0 && (
            <Button onClick={() => onRetry(sessionWrongCards)} variant="secondary" className="w-full justify-between group">
              <span>틀린 문제 다시 풀기 ({sessionWrongCards.length})</span>
              <RefreshCw size={18} className="group-hover:rotate-180 transition-transform" />
            </Button>
          )}
          <div className="flex gap-4">
            <Button onClick={onExit} variant="outline" className="flex-1"><Home size={18} className="mr-2" /> 홈으로</Button>
            <Button onClick={onExit} variant="primary" className="flex-1"><RotateCcw size={18} className="mr-2" /> 새로운 세션</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-w-xl mx-auto w-full pt-4">
      <div className="w-full bg-slate-200 h-1.5 rounded-full mb-6 overflow-hidden">
        <div className="bg-slate-900 h-full transition-all duration-300 ease-out" style={{ width: `${((currentIndex) / cards.length) * 100}%` }} />
      </div>
      <div className="flex justify-between items-center mb-6 px-2">
        <button onClick={onExit} className="text-slate-400 hover:text-slate-600 text-sm font-medium">← 나가기</button>
        <div className="text-slate-600 text-sm font-bold bg-slate-100 px-3 py-1 rounded-full">
          진행: <span className="text-slate-900">{currentIndex + 1}</span> / {cards.length}
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 md:p-12 text-center relative overflow-hidden min-h-[400px] flex flex-col">
        {isReviewMode && <div className="absolute top-4 right-4 bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">오답 노트</div>}
        <div className="flex-1 flex flex-col justify-center items-center mb-8">
           <span className="text-slate-400 text-xs font-bold tracking-wider uppercase mb-3">{currentCard.language || 'German'} • {currentCard.level} • {currentCard.topic}</span>
           <h3 className="text-3xl md:text-4xl font-bold text-slate-800 leading-tight">{currentCard.prompt_ko}</h3>
           <p className="text-slate-400 text-sm mt-4">이에 해당하는 단어를<br/>입력하세요.</p>
        </div>
        <form onSubmit={handleSubmit} className="relative z-10 w-full">
          <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} readOnly={feedback !== 'idle'} autoComplete="off" placeholder="" className={`w-full text-center text-2xl p-4 border-b-2 bg-transparent outline-none transition-colors mb-6 ${feedback === 'idle' ? 'border-slate-300 focus:border-slate-900' : ''} ${feedback === 'correct' ? 'border-green-500 text-green-600' : ''} ${feedback === 'incorrect' ? 'border-red-500 text-red-600 line-through decoration-2' : ''}`} />
          <div className="min-h-[120px]">
            {feedback === 'idle' && <Button type="submit" size="lg" className="w-full shadow-lg" disabled={!input.trim()}>정답 확인</Button>}
            {feedback === 'correct' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 text-center">
                <div className="flex items-center justify-center gap-2 text-green-600 font-bold text-xl mb-2"><CheckCircle2 size={24} /><span>정답입니다!</span></div>
                <div className="bg-green-50 rounded-xl p-4 border border-green-100"><p className="text-2xl font-bold text-slate-800 mb-1">{currentCard.full_form || currentCard.lemma}</p><p className="text-slate-500 text-sm">{currentCard.translations_ko.join(', ')}</p></div>
                <Button onClick={handleNext} variant="primary" className="w-full mt-4">다음 문제 (Enter)</Button>
              </div>
            )}
            {feedback === 'incorrect' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 text-center">
                 <div className="flex items-center justify-center gap-2 text-red-500 font-bold text-xl mb-2"><XCircle size={24} /><span>오답입니다.</span></div>
                 <div className="bg-red-50 rounded-xl p-4 border border-red-100 mb-4 text-left">
                   <div className="mb-2"><span className="text-xs text-red-400 font-bold uppercase">당신의 답</span><p className="text-lg text-red-700 font-medium">{input}</p></div>
                   <div><span className="text-xs text-green-600 font-bold uppercase">정답</span><p className="text-2xl font-bold text-slate-800">{currentCard.full_form || currentCard.lemma}</p></div>
                 </div>
                 <Button onClick={handleNext} variant="outline" className="w-full">다음 문제 (Enter) <ArrowRight size={16} className="ml-2" /></Button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.HOME);
  const [loadedFiles, setLoadedFiles] = useState<LoadedFile[]>([]);
  const [quizCards, setQuizCards] = useState<Card[]>([]);
  const [savedWrongCards, setSavedWrongCards] = useState<Card[]>([]);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('German');

  // Compute all cards from files
  const allCards = useMemo(() => {
    return loadedFiles.flatMap(f => f.cards);
  }, [loadedFiles]);

  const availableLanguages = useMemo(() => {
     const langs = new Set(allCards.map(c => c.language || 'German'));
     return Array.from(langs).sort();
  }, [allCards]);

  // Set default language on load
  useEffect(() => {
    if (availableLanguages.length > 0 && !availableLanguages.includes(selectedLanguage)) {
      setSelectedLanguage(availableLanguages[0]);
    }
  }, [availableLanguages, selectedLanguage]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_WRONG_CARDS);
    if (saved) {
      try { setSavedWrongCards(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  const handleAddFile = (newFile: LoadedFile) => {
    setLoadedFiles(prev => [...prev, newFile]);
  };

  const handleRemoveFile = (id: string) => {
    setLoadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleStartQuiz = (level: string | null) => {
    let filtered = allCards.filter(c => (c.language || 'German') === selectedLanguage);
    if (level) {
      filtered = filtered.filter(c => c.level === level);
    }
    
    if (filtered.length === 0) {
      alert("선택한 조건에 맞는 카드가 없습니다.");
      return;
    }
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 20);
    setQuizCards(selected);
    setIsReviewMode(false);
    setAppState(AppState.QUIZ);
  };

  const handleStartReview = () => {
    if (savedWrongCards.length === 0) return;
    const shuffled = [...savedWrongCards].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 20);
    setQuizCards(selected);
    setIsReviewMode(true);
    setAppState(AppState.QUIZ);
  };

  const handleRetrySession = (wrongCards: Card[]) => {
    setQuizCards(wrongCards);
    setIsReviewMode(true);
  };

  const handleClearWrongCards = () => {
    if (window.confirm("오답 노트를 초기화하시겠습니까? 기록된 모든 틀린 단어가 삭제됩니다.")) {
      localStorage.removeItem(STORAGE_KEY_WRONG_CARDS);
      setSavedWrongCards([]);
    }
  };

  const goHome = () => {
    setAppState(AppState.HOME);
    setIsReviewMode(false);
  };

  return (
    <Layout 
      onHome={goHome} 
      onManageData={() => setAppState(AppState.DATA_MANAGER)}
      onLearning={() => setAppState(AppState.LEARNING)}
      currentPage={appState}
    >
      {appState === AppState.DATA_MANAGER && (
        <DataManagerView 
          files={loadedFiles}
          onAddFile={(file: any) => handleAddFile(file)} 
          onRemoveFile={handleRemoveFile}
          onGoHome={goHome}
        />
      )}

      {appState === AppState.HOME && (
        <ConfigView 
          totalCards={allCards.length}
          // Note: levels prop is no longer passed as it's computed inside based on selectedLanguage
          onStart={handleStartQuiz}
          onGoToManager={() => setAppState(AppState.DATA_MANAGER)}
          savedWrongCardsCount={savedWrongCards.length}
          onStartReview={handleStartReview}
          onClearWrongCards={handleClearWrongCards}
          availableLanguages={availableLanguages}
          selectedLanguage={selectedLanguage}
          onSelectLanguage={setSelectedLanguage}
          allCards={allCards}
        />
      )}

      {appState === AppState.LEARNING && (
        <LearningView 
          allCards={allCards}
          onGoToManager={() => setAppState(AppState.DATA_MANAGER)}
          availableLanguages={availableLanguages}
          selectedLanguage={selectedLanguage}
          onSelectLanguage={setSelectedLanguage}
        />
      )}

      {appState === AppState.QUIZ && (
        <QuizView 
          cards={quizCards} 
          onExit={goHome}
          onRetry={handleRetrySession}
          isReviewMode={isReviewMode}
        />
      )}
    </Layout>
  );
}