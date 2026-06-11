import type { Widgets } from 'blessed';

export interface AddCardResult {
  title: string;
  content: string;
  tags: string;
}

export type Mode = 'INSERT' | 'NORMAL';
export type Field = 'question' | 'answer' | 'tags';

export interface UndoSnapshot {
  questionBuf: string;
  answerBuf: string;
  tagsBuf: string;
  qCursor: number;
  aCursor: number;
  tCursor: number;
}

export interface FormDom {
  screen: Widgets.Screen;
  form: Widgets.BoxElement;
  questionBox: Widgets.BoxElement;
  answerBox: Widgets.BoxElement;
  tagsBox: Widgets.BoxElement;
  footer: Widgets.BoxElement;
}

export interface FormState {
  mode: Mode;
  focused: Field;
  questionBuf: string;
  answerBuf: string;
  tagsBuf: string;
  qCursor: number;
  aCursor: number;
  tCursor: number;
  aScrollOffset: number;
  pendingOp: string;
  undoStack: UndoSnapshot[];
  yankRegister: string;
}

export const ANSWER_VISIBLE_LINES = 6;
