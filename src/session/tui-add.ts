import blessed, { Widgets } from 'blessed';

export interface AddCardResult {
  title: string;
  content: string;
}

type Mode = 'INSERT' | 'NORMAL';

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
      height: 22,
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
      height: 1,
      border: 'line',
      style: { border: { fg: 'yellow' }, bg: 'black', fg: 'white' },
      scrollable: false,
      tags: false,
      content: ' ',
    });

    blessed.line({
      parent: form,
      top: 5,
      left: 0,
      right: 0,
      orientation: 'horizontal',
      style: { fg: 'cyan' },
    });

    blessed.text({
      parent: form,
      top: 6,
      left: 3,
      content: 'ANSWER (back of card):',
      style: { fg: 'yellow', bold: true },
    });

    const answerBox = blessed.box({
      parent: form,
      top: 7,
      left: 3,
      right: 3,
      height: 8,
      border: 'line',
      style: { border: { fg: 'grey' }, bg: 'black', fg: 'white' },
      scrollable: false,
      tags: false,
      content: ' ',
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

    function renderField(box: Widgets.BoxElement, text: string, cursor: number) {
      const before = text.slice(0, cursor);
      const at = text[cursor] || ' ';
      const after = text.slice(cursor + 1);
      const display = before + '\x1b[7m' + at + '\x1b[27m' + after;
      box.setContent(display || ' ');
    }

    function renderAnswerLines() {
      const display = answerBuf;
      const before = display.slice(0, aCursor);
      const at = display[aCursor] || ' ';
      const after = display.slice(aCursor + 1);
      answerBox.setContent(before + '\x1b[7m' + at + '\x1b[27m' + after || ' ');
    }

    function updateFooter() {
      const modeStr = mode === 'INSERT' ? 'INSERT' : 'NORMAL';
      const base = ` ${modeStr} | Saving to: ${cardsDir || 'vault root'}`;
      if (mode === 'INSERT') {
        footer.setContent(`${base}   Tab:switch  Ctrl+S:save  Ctrl+Q:quit`);
      } else {
        footer.setContent(`${base}   h/l:move  j/k:line  i/a:edit  x:delete  q:quit`);
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
      renderAll();
    }

    function renderAll() {
      renderField(questionBox, questionBuf, qCursor);
      renderAnswerLines();
      updateFooter();
      screen.render();
    }

    function insertChar(ch: string) {
      if (focused === 'question') {
        questionBuf = questionBuf.slice(0, qCursor) + ch + questionBuf.slice(qCursor);
        qCursor++;
      } else {
        answerBuf = answerBuf.slice(0, aCursor) + ch + answerBuf.slice(aCursor);
        aCursor++;
      }
    }

    function deleteChar() {
      if (focused === 'question' && qCursor > 0) {
        questionBuf = questionBuf.slice(0, qCursor - 1) + questionBuf.slice(qCursor);
        qCursor--;
      } else if (focused === 'answer' && aCursor > 0) {
        answerBuf = answerBuf.slice(0, aCursor - 1) + answerBuf.slice(aCursor);
        aCursor--;
      }
    }

    function forwardDelete() {
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

    function moveLineVertical(dir: number) {
      if (focused !== 'answer') return;
      // flat buffer, approximate: treat newlines as line boundaries
      const lines = answerBuf.split('\n');
      let offset = 0;
      let lineNum = 0;
      for (let i = 0; i < lines.length; i++) {
        const len = lines[i]!.length + 1;
        if (aCursor < offset + len) { lineNum = i; break; }
        offset += len;
      }
      const targetLine = lineNum + dir;
      if (targetLine < 0 || targetLine >= lines.length) return;
      const colInCurrent = aCursor - offset;
      let targetOffset = 0;
      for (let i = 0; i < targetLine; i++) targetOffset += lines[i]!.length + 1;
      aCursor = targetOffset + Math.min(colInCurrent, lines[targetLine]!.length + (targetLine < lines.length - 1 ? 1 : 0));
    }

    function nextWord() {
      const buf = focused === 'question' ? questionBuf : answerBuf;
      const cur = focused === 'question' ? qCursor : aCursor;
      const rest = buf.slice(cur);
      const match = rest.match(/\s*\S+/);
      if (match) {
        const newCur = cur + match[0]!.length;
        if (focused === 'question') qCursor = newCur;
        else aCursor = newCur;
      }
    }

    function prevWord() {
      const buf = focused === 'question' ? questionBuf : answerBuf;
      const cur = focused === 'question' ? qCursor : aCursor;
      const before = buf.slice(0, cur);
      const words = before.match(/\S+\s*$/);
      if (words) {
        const newCur = cur - words[0]!.length;
        if (focused === 'question') qCursor = newCur;
        else aCursor = newCur;
      } else {
        if (focused === 'question') qCursor = 0;
        else aCursor = 0;
      }
    }

    screen.on('keypress', (ch: string, key: { name?: string; full?: string }) => {
      if (key.full === 'C-s') {
        if (!questionBuf.trim()) {
          footer.setContent(' Question cannot be empty!');
          footer.style.bg = 'red';
          screen.render();
          setTimeout(() => { updateFooter(); screen.render(); }, 1500);
          return;
        }
        onSave({ title: questionBuf.trim(), content: answerBuf.trim() });
        if (initialTitle) {
          // For edit mode, destroy after save (no reset)
          screen.destroy();
          resolve();
        } else {
          resetFields();
        }
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
        } else {
          focused = 'question';
          answerBox.style.border = { fg: 'grey' };
          questionBox.style.border = { fg: 'yellow' };
        }
        renderAll();
        return;
      }

      if (key.name === 'escape') {
        if (mode === 'INSERT') {
          mode = 'NORMAL';
          updateFooter();
          screen.render();
        } else {
          screen.destroy();
          onCancel();
          resolve();
        }
        return;
      }

      if (mode === 'INSERT') {
        if (key.name === 'left') { moveCursor(-1); renderAll(); return; }
        if (key.name === 'right') { moveCursor(1); renderAll(); return; }
        if (key.name === 'up') { moveLineVertical(-1); renderAll(); return; }
        if (key.name === 'down') { moveLineVertical(1); renderAll(); return; }
        if (key.name === 'home') { if (focused === 'question') qCursor = 0; else aCursor = 0; renderAll(); return; }
        if (key.name === 'end') { if (focused === 'question') qCursor = questionBuf.length; else aCursor = answerBuf.length; renderAll(); return; }
        if (key.name === 'backspace') { deleteChar(); renderAll(); return; }
        if (key.name === 'delete') { forwardDelete(); renderAll(); return; }
        if (key.name === 'return') { insertChar('\n'); renderAll(); return; }
        if (ch && ch.length === 1) {
          insertChar(ch);
          renderAll();
        }
      } else {
        switch (ch) {
          case 'q': screen.destroy(); onCancel(); resolve(); break;
          case 'i': mode = 'INSERT'; updateFooter(); screen.render(); break;
          case 'a': moveCursor(1); mode = 'INSERT'; updateFooter(); screen.render(); break;
          case 'I': if (focused === 'question') qCursor = 0; else aCursor = 0; mode = 'INSERT'; updateFooter(); screen.render(); break;
          case 'A': if (focused === 'question') qCursor = questionBuf.length; else aCursor = answerBuf.length; mode = 'INSERT'; updateFooter(); screen.render(); break;
          case 'h': moveCursor(-1); renderAll(); break;
          case 'l': moveCursor(1); renderAll(); break;
          case 'j': moveLineVertical(1); renderAll(); break;
          case 'k': moveLineVertical(-1); renderAll(); break;
          case '0': if (focused === 'question') qCursor = 0; else aCursor = 0; renderAll(); break;
          case '$': if (focused === 'question') qCursor = questionBuf.length; else aCursor = answerBuf.length; renderAll(); break;
          case 'w': nextWord(); renderAll(); break;
          case 'b': prevWord(); renderAll(); break;
          case 'x': deleteChar(); renderAll(); break;
        }
      }
    });

    updateFooter();
    renderAll();
  });
}
