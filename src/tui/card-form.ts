import blessed from 'blessed';

/** Result returned when card form is submitted. */
export interface AddCardResult {
  title: string;
  content: string;
  tags: string;
}

type Mode = 'INSERT' | 'NORMAL';

interface UndoSnapshot {
  questionBuf: string;
  answerBuf: string;
  tagsBuf: string;
  qCursor: number;
  aCursor: number;
  tCursor: number;
}

/**
 * Open a blessed-based modal form to create or edit a card.
 * @param cardsDir - Directory path shown in the footer.
 * @param onSave - Called with the card data on save.
 * @param onCancel - Called when the form is cancelled.
 * @param initialTitle - Pre-populated question text.
 * @param initialContent - Pre-populated answer text.
 * @param initialTags - Pre-populated tags, comma-separated.
 * @returns A promise that resolves when the form closes.
 */
export function showAddCardForm(
  cardsDir: string,
  onSave: (result: AddCardResult) => void,
  onCancel: () => void,
  initialTitle: string = '',
  initialContent: string = '',
  initialTags: string = '',
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
      height: 28,
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
      top: 6,
      left: 0,
      right: 0,
      orientation: 'horizontal',
      style: { fg: 'cyan' },
    });

    blessed.text({
      parent: form,
      top: 7,
      left: 3,
      content: 'ANSWER (back of card):',
      style: { fg: 'yellow', bold: true },
    });
    const answerBox = blessed.box({
      parent: form,
      top: 8,
      left: 3,
      right: 3,
      height: 8,
      border: 'line',
      style: { border: { fg: 'grey' }, bg: 'black', fg: 'white' },
      scrollable: false,
      tags: false,
      content: initialContent || ' ',
      keys: true,
      vi: true,
    });

    blessed.text({
      parent: form,
      top: 17,
      left: 3,
      content: 'TAGS (comma-separated):',
      style: { fg: 'yellow', bold: true },
    });
    const tagsBox = blessed.box({
      parent: form,
      top: 18,
      left: 3,
      right: 3,
      height: 3,
      border: 'line',
      style: { border: { fg: 'grey' }, bg: 'black', fg: 'white' },
      scrollable: false,
      tags: false,
      content: initialTags || ' ',
      keys: true,
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

    const ANSWER_VISIBLE_LINES = 6;

    let mode: Mode = 'INSERT';
    let focused: 'question' | 'answer' | 'tags' = 'question';
    let questionBuf = initialTitle;
    let answerBuf = initialContent;
    let tagsBuf = initialTags;
    let qCursor = initialTitle.length;
    let aCursor = initialContent.length;
    let tCursor = initialTags.length;
    let aScrollOffset = 0;

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
      return { questionBuf, answerBuf, tagsBuf, qCursor, aCursor, tCursor };
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
        tagsBuf = snap.tagsBuf;
        qCursor = snap.qCursor;
        aCursor = snap.aCursor;
        tCursor = snap.tCursor;
      }
    }

    function renderWithCursor(text: string, cursor: number): string {
      const before = text.slice(0, cursor);
      const after = text.slice(cursor);
      return before + '\x1b[7m \x1b[27m' + after || ' ';
    }

    function renderQuestion() {
      const content =
        focused === 'question' ? renderWithCursor(questionBuf, qCursor) : questionBuf || ' ';
      questionBox.setContent(content);
    }

    function renderAnswer() {
      const lines = getAnswerLines();

      if (focused === 'answer') {
        const { line: cursorLine, col: cursorCol } = answerLineCol();

        if (cursorLine < aScrollOffset) {
          aScrollOffset = cursorLine;
        } else if (cursorLine >= aScrollOffset + ANSWER_VISIBLE_LINES) {
          aScrollOffset = cursorLine - ANSWER_VISIBLE_LINES + 1;
        }

        const visibleLines = lines.slice(aScrollOffset, aScrollOffset + ANSWER_VISIBLE_LINES);
        const localLine = cursorLine - aScrollOffset;

        const rendered = visibleLines.map((l, i) =>
          i === localLine ? l.slice(0, cursorCol) + '\x1b[7m \x1b[27m' + l.slice(cursorCol) : l,
        );

        answerBox.setContent(rendered.join('\n') || ' ');
      } else {
        const visibleLines = lines.slice(aScrollOffset, aScrollOffset + ANSWER_VISIBLE_LINES);
        answerBox.setContent(visibleLines.join('\n') || ' ');
      }
    }

    function renderTags() {
      const content = focused === 'tags' ? renderWithCursor(tagsBuf, tCursor) : tagsBuf || ' ';
      tagsBox.setContent(content);
    }

    function updateFooter() {
      const modeStr = mode === 'INSERT' ? 'INSERT' : 'NORMAL';
      let base = ` ${modeStr} | Saving to: ${cardsDir || 'vault root'}`;
      if (pendingOp) base += `  (pending: ${pendingOp})`;
      if (mode === 'INSERT') {
        footer.setContent(`${base}   Tab:switch  Ctrl+S:save  Ctrl+Q:quit`);
      } else {
        footer.setContent(`${base}   h/l:move  i/a:edit  x:delete  q:quit`);
      }
      footer.style.bg = mode === 'INSERT' ? 'blue' : 'green';
    }


    function renderAll() {
      renderQuestion();
      renderAnswer();
      renderTags();
      updateFooter();
      screen.render();
    }

    function insertChar(ch: string) {
      pushUndo();
      if (focused === 'question') {
        questionBuf = questionBuf.slice(0, qCursor) + ch + questionBuf.slice(qCursor);
        qCursor++;
      } else if (focused === 'answer') {
        answerBuf = answerBuf.slice(0, aCursor) + ch + answerBuf.slice(aCursor);
        aCursor++;
      } else {
        tagsBuf = tagsBuf.slice(0, tCursor) + ch + tagsBuf.slice(tCursor);
        tCursor++;
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
      } else if (focused === 'tags' && tCursor > 0) {
        tagsBuf = tagsBuf.slice(0, tCursor - 1) + tagsBuf.slice(tCursor);
        tCursor--;
      }
    }

    function forwardDelete() {
      pushUndo();
      if (focused === 'question' && qCursor < questionBuf.length) {
        questionBuf = questionBuf.slice(0, qCursor) + questionBuf.slice(qCursor + 1);
      } else if (focused === 'answer' && aCursor < answerBuf.length) {
        answerBuf = answerBuf.slice(0, aCursor) + answerBuf.slice(aCursor + 1);
      } else if (focused === 'tags' && tCursor < tagsBuf.length) {
        tagsBuf = tagsBuf.slice(0, tCursor) + tagsBuf.slice(tCursor + 1);
      }
    }

    function moveCursor(dir: number) {
      if (focused === 'question') {
        qCursor = Math.max(0, Math.min(qCursor + dir, questionBuf.length));
      } else if (focused === 'answer') {
        aCursor = Math.max(0, Math.min(aCursor + dir, answerBuf.length));
      } else {
        tCursor = Math.max(0, Math.min(tCursor + dir, tagsBuf.length));
      }
    }

    function moveCursorWord(dir: number) {
      const buf = focused === 'question' ? questionBuf : focused === 'answer' ? answerBuf : tagsBuf;
      const cur = focused === 'question' ? qCursor : focused === 'answer' ? aCursor : tCursor;
      let pos = cur;
      if (dir > 0) {
        while (pos < buf.length && !buf[pos]?.match(/\s/)) pos++;
        while (pos < buf.length && buf[pos]?.match(/\s/)) pos++;
      } else {
        while (pos > 0 && buf[pos - 1]?.match(/\s/)) pos--;
        while (pos > 0 && !buf[pos - 1]?.match(/\s/)) pos--;
      }
      if (focused === 'question') qCursor = pos;
      else if (focused === 'answer') aCursor = pos;
      else tCursor = pos;
    }

    function deleteToEndOfLine() {
      pushUndo();
      if (focused === 'question') questionBuf = questionBuf.slice(0, qCursor);
      else if (focused === 'answer') {
        const { line, lines } = answerLineCol();
        lines[line] = lines[line]?.slice(0, aCursor) || '';
        answerBuf = lines.join('\n');
        aCursor = Math.min(aCursor, answerBuf.length);
      } else tagsBuf = tagsBuf.slice(0, tCursor);
    }

    function deleteWord(includeTrailingSpaces: boolean) {
      pushUndo();
      const buf = focused === 'question' ? questionBuf : focused === 'answer' ? answerBuf : tagsBuf;
      const cur = focused === 'question' ? qCursor : focused === 'answer' ? aCursor : tCursor;
      let end = cur;
      if (buf[cur]?.match(/\s/)) while (end < buf.length && buf[end]?.match(/\s/)) end++;
      while (end < buf.length && !buf[end]?.match(/\s/)) end++;
      if (includeTrailingSpaces) while (end < buf.length && buf[end]?.match(/\s/)) end++;
      const newBuf = buf.slice(0, cur) + buf.slice(end);
      if (focused === 'question') {
        questionBuf = newBuf;
        qCursor = Math.min(qCursor, newBuf.length);
      } else if (focused === 'answer') {
        answerBuf = newBuf;
        aCursor = Math.min(aCursor, newBuf.length);
      } else {
        tagsBuf = newBuf;
        tCursor = Math.min(tCursor, newBuf.length);
      }
    }

    function deleteInnerWord() {
      pushUndo();
      const buf = focused === 'question' ? questionBuf : focused === 'answer' ? answerBuf : tagsBuf;
      const cur = focused === 'question' ? qCursor : focused === 'answer' ? aCursor : tCursor;
      if (!buf[cur]?.match(/\S/)) return;
      let start = cur;
      while (start > 0 && buf[start - 1]?.match(/\S/)) start--;
      let end = cur;
      while (end < buf.length && buf[end]?.match(/\S/)) end++;
      const newBuf = buf.slice(0, start) + buf.slice(end);
      if (focused === 'question') {
        questionBuf = newBuf;
        qCursor = start;
      } else if (focused === 'answer') {
        answerBuf = newBuf;
        aCursor = start;
      } else {
        tagsBuf = newBuf;
        tCursor = start;
      }
    }

    function deleteCurrentLine() {
      pushUndo();
      if (focused === 'question') {
        questionBuf = '';
        qCursor = 0;
        return;
      }
      if (focused === 'tags') {
        tagsBuf = '';
        tCursor = 0;
        return;
      }
      const { line, lines } = answerLineCol();
      lines.splice(line, 1);
      answerBuf = lines.join('\n');
      aCursor = Math.min(aCursor, answerBuf.length);
    }

    function yankLine() {
      if (focused === 'question') yankRegister = questionBuf;
      else if (focused === 'tags') yankRegister = tagsBuf;
      else {
        const { line, lines } = answerLineCol();
        yankRegister = lines[line] ?? '';
      }
    }

    function pasteAfter() {
      if (!yankRegister) return;
      pushUndo();
      if (focused === 'question') {
        questionBuf = questionBuf.slice(0, qCursor) + yankRegister + questionBuf.slice(qCursor);
        qCursor += yankRegister.length;
      } else if (focused === 'tags') {
        tagsBuf = tagsBuf.slice(0, tCursor) + yankRegister + tagsBuf.slice(tCursor);
        tCursor += yankRegister.length;
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

    screen.on('keypress', (ch: string, key: { name?: string; full?: string }) => {
      if (key.full === 'C-s') {
        if (!questionBuf.trim()) {
          footer.setContent(' Question cannot be empty!');
          footer.style.bg = 'red';
          screen.render();
          setTimeout(() => {
            updateFooter();
            screen.render();
          }, 1500);
          return;
        }
        // Destroy the screen BEFORE calling onSave, always.
        // The old "resetFields()" path kept the add-form screen alive after
        // saving, so when onSave reopened the browse TUI a second blessed
        // screen came up while this one was still running. Both screens then
        // competed for stdin — every j/k in browse also hit the add form
        // (which was in INSERT mode) and got inserted as literal characters.
        const result = { title: questionBuf.trim(), content: answerBuf.trim(), tags: tagsBuf.trim() };
        screen.destroy();
        resolve();
        onSave(result);
        return;
      }

      if (key.full === 'C-q') {
        screen.destroy();
        onCancel();
        resolve();
        return;
      }

      if (key.name === 'tab') {
        if (focused === 'question') {
          focused = 'answer';
          questionBox.style.border = { fg: 'grey' };
          answerBox.style.border = { fg: 'yellow' };
          tagsBox.style.border = { fg: 'grey' };
        } else if (focused === 'answer') {
          focused = 'tags';
          answerBox.style.border = { fg: 'grey' };
          tagsBox.style.border = { fg: 'yellow' };
        } else {
          focused = 'question';
          tagsBox.style.border = { fg: 'grey' };
          questionBox.style.border = { fg: 'yellow' };
        }
        pendingOp = '';
        renderAll();
        return;
      }

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
        if (key.name === 'left') {
          moveCursor(-1);
          renderAll();
          return;
        }
        if (key.name === 'right') {
          moveCursor(1);
          renderAll();
          return;
        }
        if (key.name === 'home') {
          if (focused === 'question') qCursor = 0;
          else if (focused === 'answer') aCursor = 0;
          else tCursor = 0;
          renderAll();
          return;
        }
        if (key.name === 'end') {
          if (focused === 'question') qCursor = questionBuf.length;
          else if (focused === 'answer') aCursor = answerBuf.length;
          else tCursor = tagsBuf.length;
          renderAll();
          return;
        }
        if (key.name === 'backspace') {
          deleteChar();
          renderAll();
          return;
        }
        if (key.name === 'delete') {
          forwardDelete();
          renderAll();
          return;
        }
        if (key.name === 'return') {
          insertChar('\n');
          renderAll();
          return;
        }
        if (ch && ch.length === 1) {
          insertChar(ch);
          renderAll();
        }
        return;
      }

      if (pendingOp) {
        const combo = pendingOp + ch;
        if (combo === 'dd') {
          deleteCurrentLine();
          pendingOp = '';
          renderAll();
          return;
        }
        if (combo === 'dw') {
          deleteWord(true);
          pendingOp = '';
          renderAll();
          return;
        }
        if (combo === 'de') {
          deleteWord(false);
          pendingOp = '';
          renderAll();
          return;
        }
        if (combo === 'ciw') {
          deleteInnerWord();
          mode = 'INSERT';
          pendingOp = '';
          renderAll();
          return;
        }
        if (combo === 'yy') {
          yankLine();
          pendingOp = '';
          renderAll();
          return;
        }
        if (combo === 'gg') {
          if (focused === 'question') qCursor = 0;
          else if (focused === 'answer') aCursor = 0;
          else tCursor = 0;
          pendingOp = '';
          renderAll();
          return;
        }
        if ('dcyg'.includes(ch) && pendingOp.length === 1 && 'dcyg'.includes(pendingOp[0]!)) {
          pendingOp += ch;
          updateFooter();
          screen.render();
          return;
        }
        if (pendingOp === 'c' && ch === 'i') {
          pendingOp = 'ci';
          updateFooter();
          screen.render();
          return;
        }
        pendingOp = '';
        updateFooter();
        screen.render();
      }

      switch (ch) {
        case 'q':
          screen.destroy();
          onCancel();
          resolve();
          break;
        case 'i':
          mode = 'INSERT';
          updateFooter();
          screen.render();
          break;
        case 'a':
          moveCursor(1);
          mode = 'INSERT';
          updateFooter();
          screen.render();
          break;
        case 'I':
          if (focused === 'question') qCursor = 0;
          else if (focused === 'answer') aCursor = 0;
          else tCursor = 0;
          mode = 'INSERT';
          updateFooter();
          screen.render();
          break;
        case 'A':
          if (focused === 'question') qCursor = questionBuf.length;
          else if (focused === 'answer') aCursor = answerBuf.length;
          else tCursor = tagsBuf.length;
          mode = 'INSERT';
          updateFooter();
          screen.render();
          break;
        case 'h':
          moveCursor(-1);
          renderAll();
          break;
        case 'l':
          moveCursor(1);
          renderAll();
          break;
        case 'j': {
          if (focused === 'answer') {
            const { line, col, lines } = answerLineCol();
            if (line < lines.length - 1) {
              const newCol = Math.min(col, lines[line + 1]!.length);
              aCursor = lines.slice(0, line + 1).reduce((s, l) => s + l.length + 1, 0) + newCol;
            }
          }
          renderAll();
          break;
        }
        case 'k': {
          if (focused === 'answer') {
            const { line, col, lines } = answerLineCol();
            if (line > 0) {
              const newCol = Math.min(col, lines[line - 1]!.length);
              aCursor = lines.slice(0, line - 1).reduce((s, l) => s + l.length + 1, 0) + newCol;
            }
          }
          renderAll();
          break;
        }
        case '0':
          if (focused === 'question') qCursor = 0;
          else if (focused === 'answer') aCursor = 0;
          else tCursor = 0;
          renderAll();
          break;
        case '$':
          if (focused === 'question') qCursor = questionBuf.length;
          else if (focused === 'answer') aCursor = answerBuf.length;
          else tCursor = tagsBuf.length;
          renderAll();
          break;
        case 'x':
          deleteChar();
          renderAll();
          break;
        case 'D':
          deleteToEndOfLine();
          renderAll();
          break;
        case 'u':
          popUndo();
          renderAll();
          break;
        case 'w':
          moveCursorWord(1);
          renderAll();
          break;
        case 'b':
          moveCursorWord(-1);
          renderAll();
          break;
        case 'g':
          pendingOp = 'g';
          updateFooter();
          screen.render();
          break;
        case 'G':
          if (focused === 'question') qCursor = questionBuf.length;
          else if (focused === 'answer') aCursor = answerBuf.length;
          else tCursor = tagsBuf.length;
          renderAll();
          break;
        case 'd':
          pendingOp = 'd';
          updateFooter();
          screen.render();
          break;
        case 'c':
          pendingOp = 'c';
          updateFooter();
          screen.render();
          break;
        case 'y':
          pendingOp = 'y';
          updateFooter();
          screen.render();
          break;
        case 'p':
          pasteAfter();
          renderAll();
          break;
        case 'o':
          openLine(false);
          renderAll();
          break;
        case 'O':
          openLine(true);
          renderAll();
          break;
        default:
          break;
      }
    });

    updateFooter();
    renderAll();
  });
}
