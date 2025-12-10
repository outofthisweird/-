export interface Card {
  id: number;
  lemma: string;
  gender: string | null;
  full_form: string | null;
  translations_ko: string[];
  prompt_ko: string;
  accepted_answers_de: string[];
  level: string;
  topic: string;
  language?: string;
}

export interface LoadedFile {
  id: string;
  name: string;
  cards: Card[];
  timestamp: number;
}

export enum AppState {
  HOME = 'HOME', // Quiz Setup
  QUIZ = 'QUIZ',
  RESULT = 'RESULT',
  DATA_MANAGER = 'DATA_MANAGER',
  LEARNING = 'LEARNING'
}

export interface QuizResult {
  total: number;
  correct: number;
  wrongCards: Card[];
}

export const STORAGE_KEY_WRONG_CARDS = 'vokabel_wrong_cards_v2';
export const STORAGE_KEY_MEMOS = 'vokabel_memos_v1';