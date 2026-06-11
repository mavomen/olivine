import blessed from 'blessed';
import type { AddCardResult, FormDom } from './types';
import { createFormState } from './state';
import { renderAll, updateFooter } from './render';
import {
  insertChar, deleteChar, forwardDelete, moveCursor, moveCursorToHome, moveCursorToEnd,
  moveCursorWord, deleteToEndOfLine, deleteWord, deleteInnerWord, deleteCurrentLine,
  yankLine, pasteAfter, openLine, popUndo, setMode, setFocused,
  moveAnswerLineDown, moveAnswerLineUp,
} from './state';

export type { AddCardResult } from './types';

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
    const state = createFormState(initialTitle, initialContent, initialTags);

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

    const dom: FormDom = { screen, form, questionBox, answerBox, tagsBox, footer };

    screen.on('keypress', (ch: string, key: { name?: string; full?: string }) => {
      if (key.full === 'C-s') {
        if (!state.questionBuf.trim()) {
          footer.setContent(' Question cannot be empty!');
          footer.style.bg = 'red';
          screen.render();
          setTimeout(() => {
            updateFooter(state, dom, cardsDir);
            screen.render();
          }, 1500);
          return;
        }
        const result = { title: state.questionBuf.trim(), content: state.answerBuf.trim(), tags: state.tagsBuf.trim() };
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
        if (state.focused === 'question') {
          setFocused(state, 'answer');
          questionBox.style.border = { fg: 'grey' };
          answerBox.style.border = { fg: 'yellow' };
          tagsBox.style.border = { fg: 'grey' };
        } else if (state.focused === 'answer') {
          setFocused(state, 'tags');
          answerBox.style.border = { fg: 'grey' };
          tagsBox.style.border = { fg: 'yellow' };
        } else {
          setFocused(state, 'question');
          tagsBox.style.border = { fg: 'grey' };
          questionBox.style.border = { fg: 'yellow' };
        }
        state.pendingOp = '';
        renderAll(state, dom, cardsDir);
        return;
      }

      if (key.name === 'escape') {
        if (state.mode === 'INSERT') {
          setMode(state, 'NORMAL');
          state.pendingOp = '';
          updateFooter(state, dom, cardsDir);
          screen.render();
        }
        return;
      }

      if (state.mode === 'INSERT') {
        if (key.name === 'left') { moveCursor(state, -1); renderAll(state, dom, cardsDir); return; }
        if (key.name === 'right') { moveCursor(state, 1); renderAll(state, dom, cardsDir); return; }
        if (key.name === 'home') { moveCursorToHome(state); renderAll(state, dom, cardsDir); return; }
        if (key.name === 'end') { moveCursorToEnd(state); renderAll(state, dom, cardsDir); return; }
        if (key.name === 'backspace') { deleteChar(state); renderAll(state, dom, cardsDir); return; }
        if (key.name === 'delete') { forwardDelete(state); renderAll(state, dom, cardsDir); return; }
        if (key.name === 'return') { insertChar(state, '\n'); renderAll(state, dom, cardsDir); return; }
        if (ch && ch.length === 1) { insertChar(state, ch); renderAll(state, dom, cardsDir); }
        return;
      }

      if (state.pendingOp) {
        const combo = state.pendingOp + ch;
        if (combo === 'dd') { deleteCurrentLine(state); state.pendingOp = ''; renderAll(state, dom, cardsDir); return; }
        if (combo === 'dw') { deleteWord(state, true); state.pendingOp = ''; renderAll(state, dom, cardsDir); return; }
        if (combo === 'de') { deleteWord(state, false); state.pendingOp = ''; renderAll(state, dom, cardsDir); return; }
        if (combo === 'ciw') { deleteInnerWord(state); setMode(state, 'INSERT'); state.pendingOp = ''; renderAll(state, dom, cardsDir); return; }
        if (combo === 'yy') { yankLine(state); state.pendingOp = ''; renderAll(state, dom, cardsDir); return; }
        if (combo === 'gg') { moveCursorToHome(state); state.pendingOp = ''; renderAll(state, dom, cardsDir); return; }
        if ('dcyg'.includes(ch) && state.pendingOp.length === 1 && 'dcyg'.includes(state.pendingOp[0]!)) {
          state.pendingOp += ch;
          updateFooter(state, dom, cardsDir);
          screen.render();
          return;
        }
        if (state.pendingOp === 'c' && ch === 'i') {
          state.pendingOp = 'ci';
          updateFooter(state, dom, cardsDir);
          screen.render();
          return;
        }
        state.pendingOp = '';
        updateFooter(state, dom, cardsDir);
        screen.render();
      }

      switch (ch) {
        case 'q':
          screen.destroy();
          onCancel();
          resolve();
          break;
        case 'i':
          setMode(state, 'INSERT');
          updateFooter(state, dom, cardsDir);
          screen.render();
          break;
        case 'a':
          moveCursor(state, 1);
          setMode(state, 'INSERT');
          updateFooter(state, dom, cardsDir);
          screen.render();
          break;
        case 'I':
          moveCursorToHome(state);
          setMode(state, 'INSERT');
          updateFooter(state, dom, cardsDir);
          screen.render();
          break;
        case 'A':
          moveCursorToEnd(state);
          setMode(state, 'INSERT');
          updateFooter(state, dom, cardsDir);
          screen.render();
          break;
        case 'h':
          moveCursor(state, -1);
          renderAll(state, dom, cardsDir);
          break;
        case 'l':
          moveCursor(state, 1);
          renderAll(state, dom, cardsDir);
          break;
        case 'j':
          if (state.focused === 'answer') moveAnswerLineDown(state);
          renderAll(state, dom, cardsDir);
          break;
        case 'k':
          if (state.focused === 'answer') moveAnswerLineUp(state);
          renderAll(state, dom, cardsDir);
          break;
        case '0':
          moveCursorToHome(state);
          renderAll(state, dom, cardsDir);
          break;
        case '$':
          moveCursorToEnd(state);
          renderAll(state, dom, cardsDir);
          break;
        case 'x':
          deleteChar(state);
          renderAll(state, dom, cardsDir);
          break;
        case 'D':
          deleteToEndOfLine(state);
          renderAll(state, dom, cardsDir);
          break;
        case 'u':
          popUndo(state);
          renderAll(state, dom, cardsDir);
          break;
        case 'w':
          moveCursorWord(state, 1);
          renderAll(state, dom, cardsDir);
          break;
        case 'b':
          moveCursorWord(state, -1);
          renderAll(state, dom, cardsDir);
          break;
        case 'g':
          state.pendingOp = 'g';
          updateFooter(state, dom, cardsDir);
          screen.render();
          break;
        case 'G':
          moveCursorToEnd(state);
          renderAll(state, dom, cardsDir);
          break;
        case 'd':
          state.pendingOp = 'd';
          updateFooter(state, dom, cardsDir);
          screen.render();
          break;
        case 'c':
          state.pendingOp = 'c';
          updateFooter(state, dom, cardsDir);
          screen.render();
          break;
        case 'y':
          state.pendingOp = 'y';
          updateFooter(state, dom, cardsDir);
          screen.render();
          break;
        case 'p':
          pasteAfter(state);
          renderAll(state, dom, cardsDir);
          break;
        case 'o':
          openLine(state, false);
          renderAll(state, dom, cardsDir);
          break;
        case 'O':
          openLine(state, true);
          renderAll(state, dom, cardsDir);
          break;
      }
    });

    updateFooter(state, dom, cardsDir);
    renderAll(state, dom, cardsDir);
  });
}
