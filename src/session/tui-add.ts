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
): Promise<void> {
  return new Promise((resolve) => {
    const screen = blessed.screen({
      smartCSR: true,
      title: 'Olivine — New Card',
      dockBorders: false,
    });

    const form = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: 80,
      height: 22,
      border: 'line',
      label: ' New Card ',
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
      scrollable: false,
      tags: false,
      content: ' ',
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
      height: 6,
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
    let questionBuf = '';
    let answerBuf = '';
    let qCursor = 0;
    let aCursor = 0;

    function renderField(box: Widgets.BoxElement, text: string, cursor: number) {
      const before = text.slice(0, cursor);
      const at = text[cursor] || ' ';
      const after = text.slice(cursor + 1);
      const display = before + '\x1b[7m' + at + '\x1b[27m' + after;
      box.setContent(display || ' ');
    }

    function updateFooter() {
      const modeStr = mode === 'INSERT' ? 'INSERT' : 'NORMAL';
      const base = ` ${modeStr} | Saving to: ${cardsDir || 'vault root'}`;
      if (mode === 'INSERT') {
        footer.setContent(`${base}   Tab:switch  Ctrl+S:save  Ctrl+Q:quit`);
      } else {
        footer.setContent(`${base}   h/l:move  i/a:edit  x:delete  q:quit`);
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
      renderField(answerBox, answerBuf, aCursor);
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

    function moveCursor(dir: number) {
      if (focused === 'question') {
        qCursor = Math.max(0, Math.min(qCursor + dir, questionBuf.length));
      } else {
        aCursor = Math.max(0, Math.min(aCursor + dir, answerBuf.length));
      }
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

    // Single unified key handler
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
        resetFields();
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
        renderAll();
        return;
      }

      // Esc toggles mode
      if (key.name === 'escape') {
        if (mode === 'INSERT') {
          mode = 'NORMAL';
          updateFooter();
          screen.render();
        } else {
          // In NORMAL, escape cancels
          screen.destroy();
          onCancel();
          resolve();
        }
        return;
      }

      if (mode === 'INSERT') {
        // Insert mode typing
        if (key.name === 'left') { moveCursor(-1); renderAll(); return; }
        if (key.name === 'right') { moveCursor(1); renderAll(); return; }
        if (key.name === 'home') { if (focused === 'question') qCursor=0; else aCursor=0; renderAll(); return; }
        if (key.name === 'end') { if (focused === 'question') qCursor=questionBuf.length; else aCursor=answerBuf.length; renderAll(); return; }
        if (key.name === 'backspace') { deleteChar(); renderAll(); return; }
        if (key.name === 'delete') {
          if (focused === 'question' && qCursor < questionBuf.length)
            questionBuf = questionBuf.slice(0, qCursor) + questionBuf.slice(qCursor+1);
          else if (focused === 'answer' && aCursor < answerBuf.length)
            answerBuf = answerBuf.slice(0, aCursor) + answerBuf.slice(aCursor+1);
          renderAll(); return;
        }
        if (key.name === 'return') { insertChar('\n'); renderAll(); return; }
        if (ch && ch.length === 1) {
          insertChar(ch);
          renderAll();
        }
      } else {
        // Normal mode
        switch (ch) {
          case 'q': screen.destroy(); onCancel(); resolve(); break;
          case 'i': mode = 'INSERT'; updateFooter(); screen.render(); break;
          case 'a': moveCursor(1); mode = 'INSERT'; updateFooter(); screen.render(); break;
          case 'I': if (focused === 'question') qCursor=0; else aCursor=0; mode = 'INSERT'; updateFooter(); screen.render(); break;
          case 'A': if (focused === 'question') qCursor=questionBuf.length; else aCursor=answerBuf.length; mode = 'INSERT'; updateFooter(); screen.render(); break;
          case 'h': moveCursor(-1); renderAll(); break;
          case 'l': moveCursor(1); renderAll(); break;
          case '0': if (focused === 'question') qCursor=0; else aCursor=0; renderAll(); break;
          case '$': if (focused === 'question') qCursor=questionBuf.length; else aCursor=answerBuf.length; renderAll(); break;
          case 'w': nextWord(); renderAll(); break;
          case 'b': prevWord(); renderAll(); break;
          case 'x': deleteChar(); renderAll(); break;
          case 'o':
            if (focused === 'answer') {
              answerBuf = answerBuf.slice(0, aCursor) + '\n' + answerBuf.slice(aCursor);
              aCursor++;
              mode = 'INSERT';
              updateFooter();
              renderAll();
            }
            break;
        }
      }
    });

    updateFooter();
    renderAll();
  });
}
