import blessed from 'blessed';

export interface AddCardResult {
  title: string;
  content: string;
}

type Mode = 'INSERT' | 'NORMAL';

interface UndoSnapshot {
  questionBuf: string;
  answerBuf: string;
  qCursor: number;
  aCursor: number;
}

export function showAddCardForm(
  cardsDir: string,
  onSave: (result: AddCardResult) => void,
  onCancel: () => void,
  initialTitle: string = '',
  initialContent: string = '',
): Promise<void> {
  return new Promise((resolve) => {
    const screen = blessed.screen({
      smartCSR: true,
      title: 'Olivine — ' + (initialTitle ? 'Edit Card' : 'New Card'),
      dockBorders: false,
    });

    const form = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 80,
      height: 24,
      border: 'line',
      label: initialTitle ? ' Edit Card ' : ' New Card ',
      style: { border: { fg: 'cyan' } },
      keys: true,
      mouse: false,
    });

    blessed.text({
      parent: form,
      top: 1,
      left: 3,
      content: 'QUESTION (front of card):',
      style: { fg: 'yellow', bold: true },
    });

    const questionBox = blessed.box({
      parent: form,
      top: 2,
      left: 3,
      right: 3,
      height: 3,
      border: 'line',
      style: { border: { fg: 'yellow' }, bg: 'black', fg: 'white' },
      scrollable: true,
      alwaysScroll: true,
      tags: false,
      content: initialTitle || ' ',
      keys: true,
      vi: true,
    });

    blessed.line({
      parent: form,
      top: 7,
      left: 0,
      right: 0,
      orientation: 'horizontal',
      style: { fg: 'cyan' },
    });

    blessed.text({
      parent: form,
      top: 8,
      left: 3,
      content: 'ANSWER (back of card):',
      style: { fg: 'yellow', bold: true },
    });

    const answerBox = blessed.box({
      parent: form,
      top: 9,
      left: 3,
      right: 3,
      height: 10,
      border: 'line',
      style: { border: { fg: 'grey' }, bg: 'black', fg: 'white' },
      scrollable: true,
      alwaysScroll: true,
      tags: false,
      content: initialContent || ' ',
      keys: true,
      vi: true,
    });

    const footer = blessed.box({
      parent: form,
      bottom: 0,
      left: 0,
      right: 0,
      height: 3,
      content: '',
      style: { bg: 'blue', fg: 'white', bold: true },
      padding: { left: 2, right: 2 },
    });

    let mode: Mode = 'INSERT';
    let focused: 'question' | 'answer' = 'question';
    let questionBuf = initialTitle;
    let answerBuf = initialContent;
    let qCursor = initialTitle.length;
    let aCursor = initialContent.length;

    let pendingOp = '';
    let undoStack: UndoSnapshot[] = [];
    let yankRegister = '';

    function getAnswerLines(): string[] {
      return answerBuf === '' ? [''] : answerBuf.split('\n');
    }

    function answerLineCol(): { line: number; col: number; lines: string[] } {
      const lines = getAnswerLines();
      let offset = 0;
      for (let i = 0; i < lines.length; i++) {
        const len = lines[i]!.length + 1;
        if (aCursor < offset + len) return { line: i, col: aCursor - offset, lines };
        offset += len;
      }
      return { line: lines.length - 1, col: lines[lines.length - 1]!.length, lines };
    }

    function saveSnapshot(): UndoSnapshot {
      return { questionBuf, answerBuf, qCursor, aCursor };
    }

    function pushUndo(): void {
      undoStack.push(saveSnapshot());
      if (undoStack.length > 50) undoStack.shift();
    }

    function popUndo(): void {
      const snap = undoStack.pop();
      if (snap) {
        questionBuf = snap.questionBuf;
        answerBuf = snap.answerBuf;
        qCursor = snap.qCursor;
        aCursor = snap.aCursor;
      }
    }

    function renderWithCursor(text: string, cursor: number): string {
      const before = text.slice(0, cursor);
      const after = text.slice(cursor);
      return before + '\x1b[7m \x1b[27m' + after || ' ';
    }

    function renderQuestion() {
      const content = focused === 'question' ? renderWithCursor(questionBuf, qCursor) : questionBuf || ' ';
      questionBox.setContent(content);
    }

    function renderAnswer() {
      const content = focused === 'answer' ? renderWithCursor(answerBuf, aCursor) : answerBuf || ' ';
      answerBox.setContent(content);
    }

    function updateFooter() {
      const modeStr = mode === 'INSERT' ? 'INSERT' : 'NORMAL';
      let base = ` ${modeStr} | Saving to: ${cardsDir || 'vault root'}`;
      if (pendingOp) base += `  (pending: ${pendingOp})`;
      if (mode === 'INSERT') {
        footer.setContent(`${base}   Tab:switch  Ctrl+S:save  Ctrl+Q:quit`);
      } else {
        footer.setContent(`${base}   h/l:move  i/a:edit  x:delete  q:quit  dd,dw,yy,ciw,...`);
      }
      footer.style.bg = mode === 'INSERT' ? 'blue' : 'green';
    }

    function resetFields() {
      questionBuf = '';
      answerBuf = '';
      qCursor = 0;
      aCursor = 0;
      focused = 'question';
      questionBox.style.border = { fg: 'yellow' };
      answerBox.style.border = { fg: 'grey' };
      undoStack = [];
      renderAll();
    }

    function renderAll() {
      renderQuestion();
      renderAnswer();
      updateFooter();
      screen.render();
    }

    function insertChar(ch: string) {
      pushUndo();
      if (focused === 'question') {
        questionBuf = questionBuf.slice(0, qCursor) + ch + questionBuf.slice(qCursor);
        qCursor++;
      } else {
        answerBuf = answerBuf.slice(0, aCursor) + ch + answerBuf.slice(aCursor);
        aCursor++;
      }
    }

    function deleteChar() {
      pushUndo();
      if (focused === 'question' && qCursor > 0) {
        questionBuf = questionBuf.slice(0, qCursor - 1) + questionBuf.slice(qCursor);
        qCursor--;
      } else if (focused === 'answer' && aCursor > 0) {
        answerBuf = answerBuf.slice(0, aCursor - 1) + answerBuf.slice(aCursor);
        aCursor--;
      }
    }

    function forwardDelete() {
      pushUndo();
      if (focused === 'question' && qCursor < questionBuf.length) {
        questionBuf = questionBuf.slice(0, qCursor) + questionBuf.slice(qCursor + 1);
      } else if (focused === 'answer' && aCursor < answerBuf.length) {
        answerBuf = answerBuf.slice(0, aCursor) + answerBuf.slice(aCursor + 1);
      }
    }

    function moveCursor(dir: number) {
      if (focused === 'question') {
        qCursor = Math.max(0, Math.min(qCursor + dir, questionBuf.length));
      } else {
        aCursor = Math.max(0, Math.min(aCursor + dir, answerBuf.length));
      }
    }

    function moveCursorWord(dir: number) {
      const buf = focused === 'question' ? questionBuf : answerBuf;
      const cur = focused === 'question' ? qCursor : aCursor;
      let pos = cur;
      if (dir > 0) {
        while (pos < buf.length && !buf[pos]?.match(/\s/)) pos++;
        while (pos < buf.length && buf[pos]?.match(/\s/)) pos++;
      } else {
        while (pos > 0 && buf[pos - 1]?.match(/\s/)) pos--;
        while (pos > 0 && !buf[pos - 1]?.match(/\s/)) pos--;
      }
      if (focused === 'question') qCursor = pos;
      else aCursor = pos;
    }

    function deleteToEndOfLine() {
      pushUndo();
      if (focused === 'question') {
        questionBuf = questionBuf.slice(0, qCursor);
      } else {
        const { line, lines } = answerLineCol();
        lines[line] = lines[line]?.slice(0, aCursor) || '';
        answerBuf = lines.join('\n');
        aCursor = Math.min(aCursor, answerBuf.length);
      }
    }

    function deleteWord(includeTrailingSpaces: boolean) {
      pushUndo();
      const buf = focused === 'question' ? questionBuf : answerBuf;
      const cur = focused === 'question' ? qCursor : aCursor;
      let end = cur;
      if (buf[cur]?.match(/\s/)) while (end < buf.length && buf[end]?.match(/\s/)) end++;
      while (end < buf.length && !buf[end]?.match(/\s/)) end++;
      if (includeTrailingSpaces) while (end < buf.length && buf[end]?.match(/\s/)) end++;
      const newBuf = buf.slice(0, cur) + buf.slice(end);
      if (focused === 'question') {
        questionBuf = newBuf;
        qCursor = Math.min(qCursor, newBuf.length);
      } else {
        answerBuf = newBuf;
        aCursor = Math.min(aCursor, newBuf.length);
      }
    }

    function deleteInnerWord() {
      pushUndo();
      const buf = focused === 'question' ? questionBuf : answerBuf;
      const cur = focused === 'question' ? qCursor : aCursor;
      if (!buf[cur]?.match(/\S/)) return;
      let start = cur;
      while (start > 0 && buf[start - 1]?.match(/\S/)) start--;
      let end = cur;
      while (end < buf.length && buf[end]?.match(/\S/)) end++;
      const newBuf = buf.slice(0, start) + buf.slice(end);
      if (focused === 'question') { questionBuf = newBuf; qCursor = start; }
      else { answerBuf = newBuf; aCursor = start; }
    }

    function deleteCurrentLine() {
      pushUndo();
      if (focused === 'question') { questionBuf = ''; qCursor = 0; return; }
      const { line, lines } = answerLineCol();
      lines.splice(line, 1);
      answerBuf = lines.join('\n');
      aCursor = Math.min(aCursor, answerBuf.length);
    }

    function yankLine() {
      if (focused === 'question') yankRegister = questionBuf;
      else { const { line, lines } = answerLineCol(); yankRegister = lines[line] ?? ''; }
    }

    function pasteAfter() {
      if (!yankRegister) return;
      pushUndo();
      if (focused === 'question') {
        questionBuf = questionBuf.slice(0, qCursor) + yankRegister + questionBuf.slice(qCursor);
        qCursor += yankRegister.length;
      } else {
        const { line, lines } = answerLineCol();
        lines.splice(line + 1, 0, yankRegister);
        answerBuf = lines.join('\n');
        aCursor = lines.slice(0, line + 1).reduce((s, l) => s + l.length + 1, 0);
      }
    }

    function openLine(above: boolean) {
      if (focused !== 'answer') return;
      pushUndo();
      const { line, lines } = answerLineCol();
      const targetLine = above ? line : line + 1;
      lines.splice(targetLine, 0, '');
      answerBuf = lines.join('\n');
      aCursor = lines.slice(0, targetLine).reduce((s, l) => s + l.length + 1, 0);
      mode = 'INSERT';
      updateFooter();
    }

    // Unified key handler
    screen.on('keypress', (ch: string, key: { name?: string; full?: string }) => {
      // Ctrl+S always saves
      if (key.full === 'C-s') {
        if (!questionBuf.trim()) {
          footer.setContent(' Question cannot be empty!');
          footer.style.bg = 'red';
          screen.render();
          setTimeout(() => { updateFooter(); screen.render(); }, 1500);
          return;
        }
        onSave({ title: questionBuf.trim(), content: answerBuf.trim() });
        if (initialTitle) { screen.destroy(); resolve(); }
        else resetFields();
        return;
      }

      // Ctrl+Q always cancels
      if (key.full === 'C-q') {
        screen.destroy();
        onCancel();
        resolve();
        return;
      }

      // Tab always switches field
      if (key.name === 'tab') {
        if (focused === 'question') {
          focused = 'answer';
          questionBox.style.border = { fg: 'grey' };
          answerBox.style.border = { fg: 'yellow' };
        } else {
          focused = 'question';
          answerBox.style.border = { fg: 'grey' };
          questionBox.style.border = { fg: 'yellow' };
        }
        pendingOp = '';
        renderAll();
        return;
      }

      // Esc: INSERT -> NORMAL, NORMAL -> do nothing
      if (key.name === 'escape') {
        if (mode === 'INSERT') {
          mode = 'NORMAL';
          pendingOp = '';
          updateFooter();
          screen.render();
        }
        return;
      }

      if (mode === 'INSERT') {
        // Insert mode typing
        if (key.name === 'left') { moveCursor(-1); renderAll(); return; }
        if (key.name === 'right') { moveCursor(1); renderAll(); return; }
        if (key.name === 'home') { if (focused === 'question') qCursor = 0; else aCursor = 0; renderAll(); return; }
        if (key.name === 'end') { if (focused === 'question') qCursor = questionBuf.length; else aCursor = answerBuf.length; renderAll(); return; }
        if (key.name === 'backspace') { deleteChar(); renderAll(); return; }
        if (key.name === 'delete') { forwardDelete(); renderAll(); return; }
        if (key.name === 'return') { insertChar('\n'); renderAll(); return; }
        if (ch && ch.length === 1) {
          insertChar(ch);
          renderAll();
        }
        return;
      }

      // NORMAL mode — finish pending operators first
      if (pendingOp) {
        const combo = pendingOp + ch;
        if (combo === 'dd') { deleteCurrentLine(); pendingOp = ''; renderAll(); return; }
        if (combo === 'dw') { deleteWord(true); pendingOp = ''; renderAll(); return; }
        if (combo === 'de') { deleteWord(false); pendingOp = ''; renderAll(); return; }
        if (combo === 'ciw') { deleteInnerWord(); mode = 'INSERT'; pendingOp = ''; renderAll(); return; }
        if (combo === 'yy') { yankLine(); pendingOp = ''; renderAll(); return; }
        if (combo === 'gg') { if (focused === 'question') qCursor = 0; else aCursor = 0; pendingOp = ''; renderAll(); return; }
        // continue building operator sequence
        if ('dcyg'.includes(ch) && pendingOp.length === 1 && 'dcyg'.includes(pendingOp[0]!)) {
          pendingOp += ch;
          updateFooter(); screen.render();
          return;
        }
        if (pendingOp === 'c' && ch === 'i') { pendingOp = 'ci'; updateFooter(); screen.render(); return; }
        // unknown combo — cancel
        pendingOp = '';
        updateFooter();
        screen.render();
        // fall through to process as single command
      }

      // Single NORMAL commands
      switch (ch) {
        case 'q': screen.destroy(); onCancel(); resolve(); break;
        case 'i': mode = 'INSERT'; updateFooter(); screen.render(); break;
        case 'a': moveCursor(1); mode = 'INSERT'; updateFooter(); screen.render(); break;
        case 'I': if (focused === 'question') qCursor = 0; else aCursor = 0; mode = 'INSERT'; updateFooter(); screen.render(); break;
        case 'A': if (focused === 'question') qCursor = questionBuf.length; else aCursor = answerBuf.length; mode = 'INSERT'; updateFooter(); screen.render(); break;
        case 'h': moveCursor(-1); renderAll(); break;
        case 'l': moveCursor(1); renderAll(); break;
        case '0': if (focused === 'question') qCursor = 0; else aCursor = 0; renderAll(); break;
        case '$': if (focused === 'question') qCursor = questionBuf.length; else aCursor = answerBuf.length; renderAll(); break;
        case 'x': deleteChar(); renderAll(); break;
        case 'D': deleteToEndOfLine(); renderAll(); break;
        case 'u': popUndo(); renderAll(); break;
        case 'w': moveCursorWord(1); renderAll(); break;
        case 'b': moveCursorWord(-1); renderAll(); break;
        case 'g': pendingOp = 'g'; updateFooter(); screen.render(); break;
        case 'G': if (focused === 'question') qCursor = questionBuf.length; else aCursor = answerBuf.length; renderAll(); break;
        case 'd': pendingOp = 'd'; updateFooter(); screen.render(); break;
        case 'c': pendingOp = 'c'; updateFooter(); screen.render(); break;
        case 'y': pendingOp = 'y'; updateFooter(); screen.render(); break;
        case 'p': pasteAfter(); renderAll(); break;
        case 'o': openLine(false); renderAll(); break;
        case 'O': openLine(true); renderAll(); break;
        default:
          // ignore unknown normal keys
          break;
      }
    });

    updateFooter();
    renderAll();
  });
}
