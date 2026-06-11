import {
  createFormState,
  pushUndo,
  popUndo,
  insertChar,
  deleteChar,
  forwardDelete,
  moveCursor,
  moveCursorToHome,
  moveCursorToEnd,
  moveCursorWord,
  deleteToEndOfLine,
  deleteWord,
  deleteInnerWord,
  deleteCurrentLine,
  yankLine,
  pasteAfter,
  openLine,
  setMode,
  setFocused,
  moveAnswerLineDown,
  moveAnswerLineUp,
} from '../../../src/tui/card-form/state';
import type { FormState } from '../../../src/tui/card-form/types';

function makeState(overrides?: Partial<FormState>): FormState {
  return {
    mode: 'INSERT',
    focused: 'question',
    questionBuf: '',
    answerBuf: '',
    tagsBuf: '',
    qCursor: 0,
    aCursor: 0,
    tCursor: 0,
    aScrollOffset: 0,
    pendingOp: '',
    undoStack: [],
    yankRegister: '',
    ...overrides,
  };
}

describe('createFormState', () => {
  it('creates initial state with empty buffers', () => {
    const s = createFormState('', '', '');
    expect(s.mode).toBe('INSERT');
    expect(s.focused).toBe('question');
    expect(s.questionBuf).toBe('');
    expect(s.answerBuf).toBe('');
    expect(s.tagsBuf).toBe('');
    expect(s.qCursor).toBe(0);
    expect(s.aCursor).toBe(0);
    expect(s.tCursor).toBe(0);
    expect(s.aScrollOffset).toBe(0);
    expect(s.pendingOp).toBe('');
    expect(s.undoStack).toEqual([]);
    expect(s.yankRegister).toBe('');
  });

  it('creates initial state with pre-filled buffers and cursors at end', () => {
    const s = createFormState('hello', 'world\nfoo', 'tag1,tag2');
    expect(s.questionBuf).toBe('hello');
    expect(s.answerBuf).toBe('world\nfoo');
    expect(s.tagsBuf).toBe('tag1,tag2');
    expect(s.qCursor).toBe(5);
    expect(s.aCursor).toBe(9);
    expect(s.tCursor).toBe(9);
  });
});

describe('insertChar', () => {
  it('inserts into question buffer at cursor position', () => {
    const s = makeState({ questionBuf: 'helo', qCursor: 3 });
    insertChar(s, 'l');
    expect(s.questionBuf).toBe('hello');
    expect(s.qCursor).toBe(4);
  });

  it('inserts at beginning of question buffer', () => {
    const s = makeState({ questionBuf: 'world', qCursor: 0 });
    insertChar(s, 'h');
    expect(s.questionBuf).toBe('hworld');
    expect(s.qCursor).toBe(1);
  });

  it('inserts at end of question buffer', () => {
    const s = makeState({ questionBuf: 'hello', qCursor: 5 });
    insertChar(s, '!');
    expect(s.questionBuf).toBe('hello!');
    expect(s.qCursor).toBe(6);
  });

  it('inserts into answer buffer at cursor position', () => {
    const s = makeState({ focused: 'answer', answerBuf: 'helo', aCursor: 3 });
    insertChar(s, 'l');
    expect(s.answerBuf).toBe('hello');
    expect(s.aCursor).toBe(4);
  });

  it('inserts into tags buffer at cursor position', () => {
    const s = makeState({ focused: 'tags', tagsBuf: 'tag1,ag2', tCursor: 5 });
    insertChar(s, 't');
    expect(s.tagsBuf).toBe('tag1,tag2');
    expect(s.tCursor).toBe(6);
  });

  it('pushes undo before inserting', () => {
    const s = makeState({ questionBuf: 'old', qCursor: 3 });
    insertChar(s, '!');
    expect(s.undoStack).toHaveLength(1);
    expect(s.undoStack[0]!.questionBuf).toBe('old');
  });
});

describe('deleteChar', () => {
  it('deletes backward in question buffer', () => {
    const s = makeState({ questionBuf: 'hello', qCursor: 5 });
    deleteChar(s);
    expect(s.questionBuf).toBe('hell');
    expect(s.qCursor).toBe(4);
  });

  it('does nothing when cursor at start of question', () => {
    const s = makeState({ questionBuf: 'hello', qCursor: 0 });
    deleteChar(s);
    expect(s.questionBuf).toBe('hello');
    expect(s.qCursor).toBe(0);
  });

  it('deletes backward in answer buffer', () => {
    const s = makeState({ focused: 'answer', answerBuf: 'hello', aCursor: 5 });
    deleteChar(s);
    expect(s.answerBuf).toBe('hell');
    expect(s.aCursor).toBe(4);
  });

  it('deletes backward in tags buffer', () => {
    const s = makeState({ focused: 'tags', tagsBuf: 'hi', tCursor: 2 });
    deleteChar(s);
    expect(s.tagsBuf).toBe('h');
    expect(s.tCursor).toBe(1);
  });

  it('pushes undo before deleting', () => {
    const s = makeState({ questionBuf: 'hello', qCursor: 5 });
    deleteChar(s);
    expect(s.undoStack).toHaveLength(1);
  });
});

describe('forwardDelete', () => {
  it('deletes forward in question buffer', () => {
    const s = makeState({ questionBuf: 'hello', qCursor: 0 });
    forwardDelete(s);
    expect(s.questionBuf).toBe('ello');
    expect(s.qCursor).toBe(0);
  });

  it('does nothing when cursor at end of question', () => {
    const s = makeState({ questionBuf: 'hello', qCursor: 5 });
    forwardDelete(s);
    expect(s.questionBuf).toBe('hello');
  });

  it('deletes forward in answer buffer', () => {
    const s = makeState({ focused: 'answer', answerBuf: 'hello', aCursor: 0 });
    forwardDelete(s);
    expect(s.answerBuf).toBe('ello');
  });

  it('deletes forward in tags buffer', () => {
    const s = makeState({ focused: 'tags', tagsBuf: 'hi', tCursor: 0 });
    forwardDelete(s);
    expect(s.tagsBuf).toBe('i');
  });

  it('pushes undo before deleting forward', () => {
    const s = makeState({ questionBuf: 'hello', qCursor: 0 });
    forwardDelete(s);
    expect(s.undoStack).toHaveLength(1);
  });
});

describe('moveCursor', () => {
  it('moves forward in question buffer', () => {
    const s = makeState({ questionBuf: 'hello', qCursor: 0 });
    moveCursor(s, 3);
    expect(s.qCursor).toBe(3);
  });

  it('moves backward in question buffer', () => {
    const s = makeState({ questionBuf: 'hello', qCursor: 4 });
    moveCursor(s, -2);
    expect(s.qCursor).toBe(2);
  });

  it('clamps to start', () => {
    const s = makeState({ questionBuf: 'hi', qCursor: 1 });
    moveCursor(s, -5);
    expect(s.qCursor).toBe(0);
  });

  it('clamps to end', () => {
    const s = makeState({ questionBuf: 'hi', qCursor: 1 });
    moveCursor(s, 5);
    expect(s.qCursor).toBe(2);
  });

  it('moves cursor in answer buffer', () => {
    const s = makeState({ focused: 'answer', answerBuf: 'hello', aCursor: 3 });
    moveCursor(s, 2);
    expect(s.aCursor).toBe(5);
  });

  it('moves cursor in tags buffer', () => {
    const s = makeState({ focused: 'tags', tagsBuf: 'abc', tCursor: 2 });
    moveCursor(s, -2);
    expect(s.tCursor).toBe(0);
  });
});

describe('moveCursorToHome', () => {
  it('moves question cursor to 0', () => {
    const s = makeState({ questionBuf: 'hello', qCursor: 3 });
    moveCursorToHome(s);
    expect(s.qCursor).toBe(0);
  });

  it('moves answer cursor to 0', () => {
    const s = makeState({ focused: 'answer', answerBuf: 'hello', aCursor: 3 });
    moveCursorToHome(s);
    expect(s.aCursor).toBe(0);
  });

  it('moves tags cursor to 0', () => {
    const s = makeState({ focused: 'tags', tagsBuf: 'hello', tCursor: 3 });
    moveCursorToHome(s);
    expect(s.tCursor).toBe(0);
  });
});

describe('moveCursorToEnd', () => {
  it('moves question cursor to end', () => {
    const s = makeState({ questionBuf: 'hello', qCursor: 0 });
    moveCursorToEnd(s);
    expect(s.qCursor).toBe(5);
  });

  it('moves answer cursor to end', () => {
    const s = makeState({ focused: 'answer', answerBuf: 'hello', aCursor: 0 });
    moveCursorToEnd(s);
    expect(s.aCursor).toBe(5);
  });

  it('moves tags cursor to end', () => {
    const s = makeState({ focused: 'tags', tagsBuf: 'hello', tCursor: 0 });
    moveCursorToEnd(s);
    expect(s.tCursor).toBe(5);
  });
});

describe('moveCursorWord', () => {
  it('moves forward to next word boundary', () => {
    const s = makeState({ questionBuf: 'hello world foo', qCursor: 0 });
    moveCursorWord(s, 1);
    expect(s.qCursor).toBe(6);
  });

  it('moves backward to previous word boundary', () => {
    const s = makeState({ questionBuf: 'hello world', qCursor: 8 });
    moveCursorWord(s, -1);
    expect(s.qCursor).toBe(6);
  });

  it('stops at end of buffer when moving forward', () => {
    const s = makeState({ questionBuf: 'hello', qCursor: 3 });
    moveCursorWord(s, 1);
    expect(s.qCursor).toBe(5);
  });

  it('stops at start of buffer when moving backward', () => {
    const s = makeState({ questionBuf: 'hello', qCursor: 3 });
    moveCursorWord(s, -1);
    expect(s.qCursor).toBe(0);
  });

  it('skips consecutive whitespace forward', () => {
    const s = makeState({ questionBuf: 'a   b', qCursor: 0 });
    moveCursorWord(s, 1);
    expect(s.qCursor).toBe(4);
  });

  it('skips consecutive whitespace backward', () => {
    const s = makeState({ questionBuf: 'a   b', qCursor: 5 });
    moveCursorWord(s, -1);
    expect(s.qCursor).toBe(4);
  });

  it('works on answer buffer', () => {
    const s = makeState({ focused: 'answer', answerBuf: 'hello world', aCursor: 0 });
    moveCursorWord(s, 1);
    expect(s.aCursor).toBe(6);
  });

  it('works on tags buffer', () => {
    const s = makeState({ focused: 'tags', tagsBuf: 'hello world', tCursor: 0 });
    moveCursorWord(s, 1);
    expect(s.tCursor).toBe(6);
  });
});

describe('undo/redo via pushUndo/popUndo', () => {
  it('pushUndo saves a snapshot and popUndo restores it', () => {
    const s = makeState({
      questionBuf: 'old',
      answerBuf: 'old answer',
      tagsBuf: 'old tags',
      qCursor: 3,
      aCursor: 10,
      tCursor: 8,
    });
    pushUndo(s);
    s.questionBuf = 'new';
    s.qCursor = 3;
    popUndo(s);
    expect(s.questionBuf).toBe('old');
    expect(s.answerBuf).toBe('old answer');
    expect(s.tagsBuf).toBe('old tags');
    expect(s.qCursor).toBe(3);
    expect(s.aCursor).toBe(10);
    expect(s.tCursor).toBe(8);
  });

  it('popUndo does nothing when stack is empty', () => {
    const s = makeState({ questionBuf: 'data' });
    popUndo(s);
    expect(s.questionBuf).toBe('data');
  });

  it('limits undo stack to 50 entries', () => {
    const s = makeState({ questionBuf: 'start' });
    for (let i = 0; i < 60; i++) {
      pushUndo(s);
    }
    expect(s.undoStack).toHaveLength(50);
  });

  it('oldest entry is evicted when stack exceeds 50', () => {
    const s = makeState({ questionBuf: 'oldest' });
    for (let i = 0; i < 51; i++) {
      s.questionBuf = `entry-${i}`;
      pushUndo(s);
    }
    expect(s.undoStack[0]!.questionBuf).toBe('entry-1');
    expect(s.undoStack).toHaveLength(50);
  });

  it('can undo after insertChar (which calls pushUndo)', () => {
    const s = makeState({ questionBuf: 'hel', qCursor: 3 });
    insertChar(s, 'l');
    expect(s.questionBuf).toBe('hell');
    popUndo(s);
    expect(s.questionBuf).toBe('hel');
    expect(s.qCursor).toBe(3);
  });
});

describe('deleteToEndOfLine', () => {
  it('deletes from cursor to end of question', () => {
    const s = makeState({ questionBuf: 'hello world', qCursor: 5 });
    deleteToEndOfLine(s);
    expect(s.questionBuf).toBe('hello');
  });

  it('deletes from cursor to end of current answer line', () => {
    const s = makeState({ focused: 'answer', answerBuf: 'line1\nline2\nline3', aCursor: 3 });
    deleteToEndOfLine(s);
    expect(s.answerBuf).toBe('lin\nline2\nline3');
  });

  it('deletes from cursor to end of tags', () => {
    const s = makeState({ focused: 'tags', tagsBuf: 'tag1,tag2', tCursor: 5 });
    deleteToEndOfLine(s);
    expect(s.tagsBuf).toBe('tag1,');
  });

  it('pushes undo before deletion', () => {
    const s = makeState({ questionBuf: 'hello', qCursor: 3 });
    deleteToEndOfLine(s);
    expect(s.undoStack).toHaveLength(1);
  });
});

describe('deleteWord', () => {
  it('deletes word from cursor forward without trailing spaces', () => {
    const s = makeState({ questionBuf: 'hello world foo', qCursor: 6 });
    deleteWord(s, false);
    expect(s.questionBuf).toBe('hello  foo');
  });

  it('deletes word from cursor forward with trailing spaces', () => {
    const s = makeState({ questionBuf: 'hello world   foo', qCursor: 6 });
    deleteWord(s, true);
    expect(s.questionBuf).toBe('hello foo');
  });

  it('deletes consecutive whitespace as a word', () => {
    const s = makeState({ questionBuf: 'hello   world', qCursor: 5 });
    deleteWord(s, false);
    expect(s.questionBuf).toBe('hello');
  });

  it('pushes undo before deleting word', () => {
    const s = makeState({ questionBuf: 'hello world', qCursor: 6 });
    deleteWord(s, false);
    expect(s.undoStack).toHaveLength(1);
  });

  it('works on answer buffer', () => {
    const s = makeState({ focused: 'answer', answerBuf: 'hello world', aCursor: 6 });
    deleteWord(s, false);
    expect(s.answerBuf).toBe('hello ');
  });

  it('works on tags buffer', () => {
    const s = makeState({ focused: 'tags', tagsBuf: 'hello world', tCursor: 6 });
    deleteWord(s, false);
    expect(s.tagsBuf).toBe('hello ');
  });
});

describe('deleteInnerWord', () => {
  it('deletes the word under the cursor', () => {
    const s = makeState({ questionBuf: 'hello world', qCursor: 7 });
    deleteInnerWord(s);
    expect(s.questionBuf).toBe('hello ');
    expect(s.qCursor).toBe(6);
  });

  it('does nothing when cursor is on whitespace', () => {
    const s = makeState({ questionBuf: 'hello   world', qCursor: 5 });
    deleteInnerWord(s);
    expect(s.questionBuf).toBe('hello   world');
  });

  it('deletes single character word', () => {
    const s = makeState({ questionBuf: 'a b c', qCursor: 0 });
    deleteInnerWord(s);
    expect(s.questionBuf).toBe(' b c');
    expect(s.qCursor).toBe(0);
  });

  it('pushes undo before deleting inner word', () => {
    const s = makeState({ questionBuf: 'hello world', qCursor: 6 });
    deleteInnerWord(s);
    expect(s.undoStack).toHaveLength(1);
  });

  it('works on answer buffer', () => {
    const s = makeState({ focused: 'answer', answerBuf: 'hello world', aCursor: 6 });
    deleteInnerWord(s);
    expect(s.answerBuf).toBe('hello ');
  });

  it('works on tags buffer', () => {
    const s = makeState({ focused: 'tags', tagsBuf: 'hello world', tCursor: 6 });
    deleteInnerWord(s);
    expect(s.tagsBuf).toBe('hello ');
  });
});

describe('deleteCurrentLine', () => {
  it('clears question buffer', () => {
    const s = makeState({ questionBuf: 'hello world', qCursor: 5 });
    deleteCurrentLine(s);
    expect(s.questionBuf).toBe('');
    expect(s.qCursor).toBe(0);
  });

  it('clears tags buffer', () => {
    const s = makeState({ focused: 'tags', tagsBuf: 'tag1,tag2', tCursor: 4 });
    deleteCurrentLine(s);
    expect(s.tagsBuf).toBe('');
    expect(s.tCursor).toBe(0);
  });

  it('removes the current line in answer buffer', () => {
    const s = makeState({ focused: 'answer', answerBuf: 'line1\nline2\nline3', aCursor: 8 });
    deleteCurrentLine(s);
    expect(s.answerBuf).toBe('line1\nline3');
  });

  it('removes last line in answer buffer', () => {
    const s = makeState({ focused: 'answer', answerBuf: 'line1\nline2', aCursor: 11 });
    deleteCurrentLine(s);
    expect(s.answerBuf).toBe('line1');
  });

  it('pushes undo before deleting line', () => {
    const s = makeState({ questionBuf: 'hello', qCursor: 3 });
    deleteCurrentLine(s);
    expect(s.undoStack).toHaveLength(1);
  });
});

describe('yankLine and pasteAfter', () => {
  it('yanks question buffer and pastes into question', () => {
    const s = makeState({ questionBuf: 'hello', qCursor: 3 });
    yankLine(s);
    expect(s.yankRegister).toBe('hello');
    pasteAfter(s);
    expect(s.questionBuf).toBe('helhellolo');
    expect(s.qCursor).toBe(8);
  });

  it('yanks tags buffer and pastes into tags', () => {
    const s = makeState({ focused: 'tags', tagsBuf: 'tag1', tCursor: 4 });
    yankLine(s);
    expect(s.yankRegister).toBe('tag1');
    pasteAfter(s);
    expect(s.tagsBuf).toBe('tag1tag1');
    expect(s.tCursor).toBe(8);
  });

  it('yanks current answer line and pastes after current line', () => {
    const s = makeState({ focused: 'answer', answerBuf: 'line1\nline2\nline3', aCursor: 2 });
    yankLine(s);
    expect(s.yankRegister).toBe('line1');
    pasteAfter(s);
    expect(s.answerBuf).toBe('line1\nline1\nline2\nline3');
  });

  it('pasteAfter does nothing when yankRegister is empty', () => {
    const s = makeState({ questionBuf: 'hello', qCursor: 3 });
    pasteAfter(s);
    expect(s.questionBuf).toBe('hello');
  });

  it('pushes undo on pasteAfter', () => {
    const s = makeState({ questionBuf: 'hello', qCursor: 3, yankRegister: 'X' });
    pasteAfter(s);
    expect(s.undoStack).toHaveLength(1);
  });
});

describe('openLine', () => {
  it('opens line below in answer buffer', () => {
    const s = makeState({ focused: 'answer', answerBuf: 'line1\nline2', aCursor: 3 });
    openLine(s, false);
    expect(s.answerBuf).toBe('line1\n\nline2');
    expect(s.aCursor).toBe(6);
    expect(s.mode).toBe('INSERT');
  });

  it('opens line above in answer buffer', () => {
    const s = makeState({ focused: 'answer', answerBuf: 'line1\nline2', aCursor: 3 });
    openLine(s, true);
    expect(s.answerBuf).toBe('\nline1\nline2');
    expect(s.aCursor).toBe(0);
    expect(s.mode).toBe('INSERT');
  });

  it('does nothing when not focused on answer', () => {
    const s = makeState({ questionBuf: 'hello', qCursor: 3 });
    openLine(s, false);
    expect(s.questionBuf).toBe('hello');
  });

  it('pushes undo before opening line', () => {
    const s = makeState({ focused: 'answer', answerBuf: 'line1', aCursor: 3 });
    openLine(s, false);
    expect(s.undoStack).toHaveLength(1);
  });
});

describe('setMode', () => {
  it('sets mode to INSERT', () => {
    const s = makeState({ mode: 'NORMAL' });
    setMode(s, 'INSERT');
    expect(s.mode).toBe('INSERT');
  });

  it('sets mode to NORMAL', () => {
    const s = makeState({ mode: 'INSERT' });
    setMode(s, 'NORMAL');
    expect(s.mode).toBe('NORMAL');
  });
});

describe('setFocused', () => {
  it('sets focused field to question', () => {
    const s = makeState({ focused: 'answer' });
    setFocused(s, 'question');
    expect(s.focused).toBe('question');
  });

  it('sets focused field to answer', () => {
    const s = makeState({ focused: 'question' });
    setFocused(s, 'answer');
    expect(s.focused).toBe('answer');
  });

  it('sets focused field to tags', () => {
    const s = makeState({ focused: 'question' });
    setFocused(s, 'tags');
    expect(s.focused).toBe('tags');
  });
});

describe('moveAnswerLineDown', () => {
  it('moves cursor down one line in answer', () => {
    const s = makeState({ focused: 'answer', answerBuf: 'line1\nline2\nline3', aCursor: 2 });
    moveAnswerLineDown(s);
    expect(s.aCursor).toBe(8);
  });

  it('clamps column to shorter target line', () => {
    const s = makeState({ focused: 'answer', answerBuf: 'abc\nde\nfghij', aCursor: 2 }); // col 2 on "abc"
    moveAnswerLineDown(s);
    expect(s.aCursor).toBe(6); // "de" is 2 chars, so col clamped to 2 => offset=4+2=6
  });

  it('does nothing on last line', () => {
    const s = makeState({ focused: 'answer', answerBuf: 'line1\nline2', aCursor: 8 });
    moveAnswerLineDown(s);
    expect(s.aCursor).toBe(8);
  });
});

describe('moveAnswerLineUp', () => {
  it('moves cursor up one line in answer', () => {
    const s = makeState({ focused: 'answer', answerBuf: 'line1\nline2\nline3', aCursor: 8 });
    moveAnswerLineUp(s);
    expect(s.aCursor).toBe(2);
  });

  it('clamps column to shorter target line', () => {
    const s = makeState({ focused: 'answer', answerBuf: 'ab\ndefg\nhi', aCursor: 8 });
    moveAnswerLineUp(s);
    expect(s.aCursor).toBe(3);
  });

  it('does nothing on first line', () => {
    const s = makeState({ focused: 'answer', answerBuf: 'line1\nline2', aCursor: 2 });
    moveAnswerLineUp(s);
    expect(s.aCursor).toBe(2);
  });
});
