import type { FormState, FormDom } from './types';
import { ANSWER_VISIBLE_LINES } from './types';

function renderWithCursor(text: string, cursor: number): string {
  const before = text.slice(0, cursor);
  const after = text.slice(cursor);
  return before + '\x1b[7m \x1b[27m' + after || ' ';
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

export function renderQuestion(state: FormState, dom: FormDom): void {
  const content = state.focused === 'question' ? renderWithCursor(state.questionBuf, state.qCursor) : state.questionBuf || ' ';
  dom.questionBox.setContent(content);
}

export function renderAnswer(state: FormState, dom: FormDom): void {
  const lines = getAnswerLines(state);

  if (state.focused === 'answer') {
    const { line: cursorLine, col: cursorCol } = answerLineCol(state);

    if (cursorLine < state.aScrollOffset) {
      state.aScrollOffset = cursorLine;
    } else if (cursorLine >= state.aScrollOffset + ANSWER_VISIBLE_LINES) {
      state.aScrollOffset = cursorLine - ANSWER_VISIBLE_LINES + 1;
    }

    const visibleLines = lines.slice(state.aScrollOffset, state.aScrollOffset + ANSWER_VISIBLE_LINES);
    const localLine = cursorLine - state.aScrollOffset;

    const rendered = visibleLines.map((l, i) =>
      i === localLine ? l.slice(0, cursorCol) + '\x1b[7m \x1b[27m' + l.slice(cursorCol) : l,
    );

    dom.answerBox.setContent(rendered.join('\n') || ' ');
  } else {
    const visibleLines = lines.slice(state.aScrollOffset, state.aScrollOffset + ANSWER_VISIBLE_LINES);
    dom.answerBox.setContent(visibleLines.join('\n') || ' ');
  }
}

export function renderTags(state: FormState, dom: FormDom): void {
  const content = state.focused === 'tags' ? renderWithCursor(state.tagsBuf, state.tCursor) : state.tagsBuf || ' ';
  dom.tagsBox.setContent(content);
}

export function updateFooter(state: FormState, dom: FormDom, cardsDir: string): void {
  const modeStr = state.mode === 'INSERT' ? 'INSERT' : 'NORMAL';
  let base = ` ${modeStr} | Saving to: ${cardsDir || 'vault root'}`;
  if (state.pendingOp) base += `  (pending: ${state.pendingOp})`;
  if (state.mode === 'INSERT') {
    dom.footer.setContent(`${base}   Tab:switch  Ctrl+S:save  Ctrl+Q:quit`);
  } else {
    dom.footer.setContent(`${base}   h/l:move  i/a:edit  x:delete  q:quit`);
  }
  dom.footer.style.bg = state.mode === 'INSERT' ? 'blue' : 'green';
}

export function renderAll(state: FormState, dom: FormDom, cardsDir: string): void {
  renderQuestion(state, dom);
  renderAnswer(state, dom);
  renderTags(state, dom);
  updateFooter(state, dom, cardsDir);
  dom.screen.render();
}
