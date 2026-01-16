
export enum AppState {
  INITIAL_SETUP = 'INITIAL_SETUP',
  LOGIN = 'LOGIN',
  AUTHENTICATED = 'AUTHENTICATED'
}

export interface BidSection {
  title: string;
  targetWordCount: number;
  description: string;
  content: string;
  isGenerating: boolean;
}

export interface BidProject {
  id: string;
  tenderTitle: string;
  originalText: string;
  targetTotalWords: number;
  sections: BidSection[];
  status: 'idle' | 'analyzing' | 'generating' | 'completed';
}
