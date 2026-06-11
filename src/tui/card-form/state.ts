import type { FormState, UndoSnapshot } from './types';

export function createFormState(
  initialTitle: string,
  initialContent: string,
  initialTags: string,
): FormState {
  return {
    mode: 'INSERT',
    focused: 'question',
    questionBuf: initialTitle,
    answerBuf: initialContent,
    tagsBuf: initialTags,
    qCursor: initialTitle.length,
    aCursor: initialContent.length,
    tCursor: initialTags.length,
    aScrollOffset: 0,
    pendingOp: '',
    undoStack: [],
    yankRegister: '',
  };
}

function getAnswerLines(state: FormState): string[] {
  return state.answerBuf === '' ? [''] : state.answerBuf.split('\n');
}

function answerLineCol(state: FormState): { line: number; col: number; lines: string[] } {
  const lines = getAnswerLines(state);
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    const len = lines[i]!.length + 1;
    if (state.aCursor < offset + len) return { line: i, col: state.aCursor - offset, lines };
    offset += len;
  }
  return { line: lines.length - 1, col: lines[lines.length - 1]!.length, lines };
}

function saveSnapshot(state: FormState): UndoSnapshot {
  return { questionBuf: state.questionBuf, answerBuf: state.answerBuf, tagsBuf: state.tagsBuf, qCursor: state.qCursor, aCursor: state.aCursor, tCursor: state.tCursor };
}

export function pushUndo(state: FormState): void {
  state.undoStack.push(saveSnapshot(state));
  if (state.undoStack.length > 50) state.undoStack.shift();
}

export function popUndo(state: FormState): void {
  const snap = state.undoStack.pop();
  if (snap) {
    state.questionBuf = snap.questionBuf;
    state.answerBuf = snap.answerBuf;
    state.tagsBuf = snap.tagsBuf;
    state.qCursor = snap.qCursor;
    state.aCursor = snap.aCursor;
    state.tCursor = snap.tCursor;
  }
}

export function insertChar(state: FormState, ch: string): void {
  pushUndo(state);
  if (state.focused === 'question') {
    state.questionBuf = state.questionBuf.slice(0, state.qCursor) + ch + state.questionBuf.slice(state.qCursor);
    state.qCursor++;
  } else if (state.focused === 'answer') {
    state.answerBuf = state.answerBuf.slice(0, state.aCursor) + ch + state.answerBuf.slice(state.aCursor);
    state.aCursor++;
  } else {
    state.tagsBuf = state.tagsBuf.slice(0, state.tCursor) + ch + state.tagsBuf.slice(state.tCursor);
    state.tCursor++;
  }
}

export function deleteChar(state: FormState): void {
  pushUndo(state);
  if (state.focused === 'question' && state.qCursor > 0) {
    state.questionBuf = state.questionBuf.slice(0, state.qCursor - 1) + state.questionBuf.slice(state.qCursor);
    state.qCursor--;
  } else if (state.focused === 'answer' && state.aCursor > 0) {
    state.answerBuf = state.answerBuf.slice(0, state.aCursor - 1) + state.answerBuf.slice(state.aCursor);
    state.aCursor--;
  } else if (state.focused === 'tags' && state.tCursor > 0) {
    state.tagsBuf = state.tagsBuf.slice(0, state.tCursor - 1) + state.tagsBuf.slice(state.tCursor);
    state.tCursor--;
  }
}

export function forwardDelete(state: FormState): void {
  pushUndo(state);
  if (state.focused === 'question' && state.qCursor < state.questionBuf.length) {
    state.questionBuf = state.questionBuf.slice(0, state.qCursor) + state.questionBuf.slice(state.qCursor + 1);
  } else if (state.focused === 'answer' && state.aCursor < state.answerBuf.length) {
    state.answerBuf = state.answerBuf.slice(0, state.aCursor) + state.answerBuf.slice(state.aCursor + 1);
  } else if (state.focused === 'tags' && state.tCursor < state.tagsBuf.length) {
    state.tagsBuf = state.tagsBuf.slice(0, state.tCursor) + state.tagsBuf.slice(state.tCursor + 1);
  }
}

export function moveCursor(state: FormState, dir: number): void {
  if (state.focused === 'question') {
    state.qCursor = Math.max(0, Math.min(state.qCursor + dir, state.questionBuf.length));
  } else if (state.focused === 'answer') {
    state.aCursor = Math.max(0, Math.min(state.aCursor + dir, state.answerBuf.length));
  } else {
    state.tCursor = Math.max(0, Math.min(state.tCursor + dir, state.tagsBuf.length));
  }
}

export function moveCursorToHome(state: FormState): void {
  if (state.focused === 'question') state.qCursor = 0;
  else if (state.focused === 'answer') state.aCursor = 0;
  else state.tCursor = 0;
}

export function moveCursorToEnd(state: FormState): void {
  if (state.focused === 'question') state.qCursor = state.questionBuf.length;
  else if (state.focused === 'answer') state.aCursor = state.answerBuf.length;
  else state.tCursor = state.tagsBuf.length;
}

export function moveCursorWord(state: FormState, dir: number): void {
  const buf = state.focused === 'question' ? state.questionBuf : state.focused === 'answer' ? state.answerBuf : state.tagsBuf;
  const cur = state.focused === 'question' ? state.qCursor : state.focused === 'answer' ? state.aCursor : state.tCursor;
  let pos = cur;
  if (dir > 0) {
    while (pos < buf.length && !buf[pos]?.match(/\s/)) pos++;
    while (pos < buf.length && buf[pos]?.match(/\s/)) pos++;
  } else {
    while (pos > 0 && buf[pos - 1]?.match(/\s/)) pos--;
    while (pos > 0 && !buf[pos - 1]?.match(/\s/)) pos--;
  }
  if (state.focused === 'question') state.qCursor = pos;
  else if (state.focused === 'answer') state.aCursor = pos;
  else state.tCursor = pos;
}

export function deleteToEndOfLine(state: FormState): void {
  pushUndo(state);
  if (state.focused === 'question') state.questionBuf = state.questionBuf.slice(0, state.qCursor);
  else if (state.focused === 'answer') {
    const { line, lines } = answerLineCol(state);
    lines[line] = lines[line]?.slice(0, state.aCursor) || '';
    state.answerBuf = lines.join('\n');
    state.aCursor = Math.min(state.aCursor, state.answerBuf.length);
  } else state.tagsBuf = state.tagsBuf.slice(0, state.tCursor);
}

export function deleteWord(state: FormState, includeTrailingSpaces: boolean): void {
  pushUndo(state);
  const buf = state.focused === 'question' ? state.questionBuf : state.focused === 'answer' ? state.answerBuf : state.tagsBuf;
  const cur = state.focused === 'question' ? state.qCursor : state.focused === 'answer' ? state.aCursor : state.tCursor;
  let end = cur;
  if (buf[cur]?.match(/\s/)) while (end < buf.length && buf[end]?.match(/\s/)) end++;
  while (end < buf.length && !buf[end]?.match(/\s/)) end++;
  if (includeTrailingSpaces) while (end < buf.length && buf[end]?.match(/\s/)) end++;
  const newBuf = buf.slice(0, cur) + buf.slice(end);
  if (state.focused === 'question') {
    state.questionBuf = newBuf;
    state.qCursor = Math.min(state.qCursor, newBuf.length);
  } else if (state.focused === 'answer') {
    state.answerBuf = newBuf;
    state.aCursor = Math.min(state.aCursor, newBuf.length);
  } else {
    state.tagsBuf = newBuf;
    state.tCursor = Math.min(state.tCursor, newBuf.length);
  }
}

export function deleteInnerWord(state: FormState): void {
  pushUndo(state);
  const buf = state.focused === 'question' ? state.questionBuf : state.focused === 'answer' ? state.answerBuf : state.tagsBuf;
  const cur = state.focused === 'question' ? state.qCursor : state.focused === 'answer' ? state.aCursor : state.tCursor;
  if (!buf[cur]?.match(/\S/)) return;
  let start = cur;
  while (start > 0 && buf[start - 1]?.match(/\S/)) start--;
  let end = cur;
  while (end < buf.length && buf[end]?.match(/\S/)) end++;
  const newBuf = buf.slice(0, start) + buf.slice(end);
  if (state.focused === 'question') {
    state.questionBuf = newBuf;
    state.qCursor = start;
  } else if (state.focused === 'answer') {
    state.answerBuf = newBuf;
    state.aCursor = start;
  } else {
    state.tagsBuf = newBuf;
    state.tCursor = start;
  }
}

export function deleteCurrentLine(state: FormState): void {
  pushUndo(state);
  if (state.focused === 'question') {
    state.questionBuf = '';
    state.qCursor = 0;
    return;
  }
  if (state.focused === 'tags') {
    state.tagsBuf = '';
    state.tCursor = 0;
    return;
  }
  const { line, lines } = answerLineCol(state);
  lines.splice(line, 1);
  state.answerBuf = lines.join('\n');
  state.aCursor = Math.min(state.aCursor, state.answerBuf.length);
}

export function yankLine(state: FormState): void {
  if (state.focused === 'question') state.yankRegister = state.questionBuf;
  else if (state.focused === 'tags') state.yankRegister = state.tagsBuf;
  else {
    const { line, lines } = answerLineCol(state);
    state.yankRegister = lines[line] ?? '';
  }
}

export function pasteAfter(state: FormState): void {
  if (!state.yankRegister) return;
  pushUndo(state);
  if (state.focused === 'question') {
    state.questionBuf = state.questionBuf.slice(0, state.qCursor) + state.yankRegister + state.questionBuf.slice(state.qCursor);
    state.qCursor += state.yankRegister.length;
  } else if (state.focused === 'tags') {
    state.tagsBuf = state.tagsBuf.slice(0, state.tCursor) + state.yankRegister + state.tagsBuf.slice(state.tCursor);
    state.tCursor += state.yankRegister.length;
  } else {
    const { line, lines } = answerLineCol(state);
    lines.splice(line + 1, 0, state.yankRegister);
    state.answerBuf = lines.join('\n');
    state.aCursor = lines.slice(0, line + 1).reduce((s, l) => s + l.length + 1, 0);
  }
}

export function openLine(state: FormState, above: boolean): void {
  if (state.focused !== 'answer') return;
  pushUndo(state);
  const { line, lines } = answerLineCol(state);
  const targetLine = above ? line : line + 1;
  lines.splice(targetLine, 0, '');
  state.answerBuf = lines.join('\n');
  state.aCursor = lines.slice(0, targetLine).reduce((s, l) => s + l.length + 1, 0);
  state.mode = 'INSERT';
}

export function setMode(state: FormState, mode: 'INSERT' | 'NORMAL'): void {
  state.mode = mode;
}

export function setFocused(state: FormState, field: 'question' | 'answer' | 'tags'): void {
  state.focused = field;
}

export function moveAnswerLineDown(state: FormState): void {
  const { line, col, lines } = answerLineCol(state);
  if (line < lines.length - 1) {
    const newCol = Math.min(col, lines[line + 1]!.length);
    state.aCursor = lines.slice(0, line + 1).reduce((s, l) => s + l.length + 1, 0) + newCol;
  }
}

export function moveAnswerLineUp(state: FormState): void {
  const { line, col, lines } = answerLineCol(state);
  if (line > 0) {
    const newCol = Math.min(col, lines[line - 1]!.length);
    state.aCursor = lines.slice(0, line - 1).reduce((s, l) => s + l.length + 1, 0) + newCol;
  }
}
