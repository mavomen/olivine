import blessed from 'blessed';
import { Database } from 'sql.js';
import { getAllNotes, insertNote, deleteNoteByPath, NoteRow } from '../../models/note';
import { getAllScheduling, SchedulingRow } from '../../models/scheduling';
import { getReviewsForNote } from '../../models/review';
import { createVirtualList, VirtualListRow } from './virtual-list';
import { showAddCardForm, AddCardResult } from '../card-form';
import { saveDb } from '../../database/connection';
import { initializeScheduling } from '../../scheduling/service';
import chalk from 'chalk';

interface BrowseState {
  notes: NoteRow[];
  schedulingMap: Map<string, SchedulingRow>;
  filteredNotes: NoteRow[];
  filterText: string;
  filterBox: number | null;
  listRows: VirtualListRow[];
}

/**
 * Open the interactive browse TUI for viewing and managing cards.
 * @param vaultPath - Path to the vault for database persistence.
 * @param db - The database instance.
 */
export function openBrowseTui(vaultPath: string, db: Database): void {
  if (!process.stdout.isTTY) {
    throw new Error('TUI browser requires a TTY.');
  }
  // Clear any leftover terminal content from the previous screen before blessed's
  // smartCSR (differential renderer) takes over — otherwise old chars bleed through.
  process.stdout.write('\x1b[2J\x1b[0;0H');

  const screen = blessed.screen({
    smartCSR: true,
    title: 'Olivine — Browse Cards',
    dockBorders: false,
  });
  const notes = getAllNotes(db);
  const scheduling = getAllScheduling(db);
  const schedMap = new Map<string, SchedulingRow>();
  for (const s of scheduling) schedMap.set(s.note_id, s);

  const state: BrowseState = {
    notes,
    schedulingMap: schedMap,
    filteredNotes: [...notes],
    filterText: '',
    filterBox: null,
    listRows: [],
  };

  function updateFilteredList() {
    let filtered = notes;

    if (state.filterBox !== null) {
      filtered = filtered.filter(n => {
        const s = schedMap.get(n.id);
        return s && s.box === state.filterBox;
      });
    }

    if (state.filterText.trim()) {
      const lower = state.filterText.toLowerCase();
      filtered = filtered.filter(n => {
        const titleMatch = n.title.toLowerCase().includes(lower);
        let tagsMatch = false;
        try {
          const tags = JSON.parse(n.tags || '[]');
          tagsMatch = tags.some((t: string) => t.toLowerCase().includes(lower));
        } catch {}
        return titleMatch || tagsMatch;
      });
    }

    state.filteredNotes = filtered;
    state.listRows = filtered.map(n => {
      const s = schedMap.get(n.id);
      const archived = s?.archived === 1;
      const box = s?.box;
      let prefix = '○ ';
      if (archived) prefix = '● ';
      let label = `${prefix}${n.title}`;
      if (archived) label += ' (archived)';
      else if (box) label += `  [Box ${box}]`;
      return { label, data: n };
    });
  }

  updateFilteredList();


  blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    border: 'line',
    style: { border: { fg: 'cyan' }, bg: 'black' },
    content: ' Browse Cards   │   /filter   b1-7:box   Enter:edit   Space:review   a:add   d:delete   h:history   q:quit',
    tags: false,
  });

  const listBox = blessed.box({
    parent: screen,
    top: 3,
    left: 0,
    width: '40%',
    bottom: 0,
    border: 'line',
    style: { border: { fg: 'cyan' }, bg: 'black' },
    scrollable: false,
    tags: false,
  });

  const detailBox = blessed.box({
    parent: screen,
    top: 3,
    left: '40%',
    right: 0,
    bottom: 0,
    border: 'line',
    style: { border: { fg: 'cyan' }, bg: 'black' },
    scrollable: true,
    alwaysScroll: true,
    tags: false,
    content: ' Select a card to view details',
  });

  const list = createVirtualList({
    parent: listBox,
    top: 0,
    left: 0,
    width: '100%-2',
    height: Math.floor((screen.height as number) - 5),
    rows: state.listRows,
    onSelect: (row: VirtualListRow) => {
      renderDetail(row.data as NoteRow);
    },
  });


  function renderDetail(note: NoteRow) {
    const s = schedMap.get(note.id);
    const archived = s?.archived === 1;
    const box = s?.box;
    const reviews = getReviewsForNote(db, note.id);
    const avgQuality = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.quality, 0) / reviews.length).toFixed(1)
      : '—';

    let tagsStr = '';
    try {
      const tags = JSON.parse(note.tags || '[]');
      tagsStr = tags.join(', ');
    } catch {}

    const lines = [
      chalk.bold.yellow(' QUESTION:'),
      chalk.white('  ' + note.title),
      '',
      chalk.bold.yellow(' ANSWER:'),
      ...note.content.split('\n').map(l => chalk.white('  ' + l)),
      '',
      chalk.bold.cyan('─────────────────────'),
      tagsStr ? chalk.dim(' Tags: ' + tagsStr) : '',
      chalk.dim(' Created: ' + note.created_at),
      chalk.dim(' Reviews: ' + reviews.length + '  Avg quality: ' + avgQuality),
      archived ? chalk.red(' ARCHIVED') : box ? chalk.green(' Box ' + box) : '',
    ].filter(Boolean).join('\n');

    detailBox.setContent(lines);
    screen.render();
  }

  if (state.listRows.length > 0) {
    renderDetail(state.listRows[0]!.data as NoteRow);
  }

  // This prevents keypresses from the current screen bleeding into the next
  // blessed screen (the root cause of the jjjkk leak into the add form buffer).
  function transitionTo(fn: () => void) {
    screen.destroy();
    // setTimeout instead of setImmediate: stdin bytes buffered during j/k navigation
    // live in the poll phase and get picked up by the next screen's listener if we
    // hand control back too quickly. 50ms lets the TTY drain before the new screen
    // registers its keypress handlers.
    setTimeout(fn, 50);
  }


  screen.key(['j', 'down'], () => {
    list.moveSelection(1);
    const idx = list.getSelectedIndex();
    if (idx < state.filteredNotes.length) {
      renderDetail(state.filteredNotes[idx]!);
    }
  });

  screen.key(['k', 'up'], () => {
    list.moveSelection(-1);
    const idx = list.getSelectedIndex();
    if (idx < state.filteredNotes.length) {
      renderDetail(state.filteredNotes[idx]!);
    }
  });

  screen.key(['/'], () => {
    const prompt = blessed.prompt({
      parent: screen,
      top: 'center',
      left: 'center',
      height: 'shrink',
      width: 'shrink',
      border: 'line',
      style: { border: { fg: 'yellow' }, bg: 'black' },
    });

    prompt.input('Filter:', '', (err: Error | null, value: string) => {
      state.filterText = value || '';
      updateFilteredList();
      list.setRows(state.listRows);
      if (state.listRows.length > 0) {
        list.setSelectedIndex(0);
        renderDetail(state.filteredNotes[0]!);
      } else {
        detailBox.setContent(' No cards match the filter');
      }
      prompt.destroy();
      screen.render();
    });
  });

  screen.key(['escape'], () => {
    state.filterText = '';
    state.filterBox = null;
    updateFilteredList();
    list.setRows(state.listRows);
    if (state.listRows.length > 0) {
      list.setSelectedIndex(0);
      renderDetail(state.filteredNotes[0]!);
    }
    detailBox.setContent(' Select a card to view details');
    screen.render();
  });

  screen.key(['b'], () => {
    const prompt = blessed.prompt({
      parent: screen,
      top: 'center',
      left: 'center',
      height: 'shrink',
      width: 'shrink',
      border: 'line',
      style: { border: { fg: 'yellow' }, bg: 'black' },
    });

    prompt.input('Filter by box (1-7, or Enter for all):', '', (err: Error | null, value: string) => {
      const box = parseInt(value, 10);
      state.filterBox = (box >= 1 && box <= 7) ? box : null;
      updateFilteredList();
      list.setRows(state.listRows);
      if (state.listRows.length > 0) {
        list.setSelectedIndex(0);
        renderDetail(state.filteredNotes[0]!);
      } else {
        detailBox.setContent(' No cards match the filter');
      }
      prompt.destroy();
      screen.render();
    });
  });


  screen.key(['enter'], () => {
    const idx = list.getSelectedIndex();
    if (idx >= state.filteredNotes.length) return;
    const note = state.filteredNotes[idx]!;
    const existingTags = (() => {
      try { return JSON.parse(note.tags || '[]').join(', '); }
      catch { return ''; }
    })();

    transitionTo(() => {
      showAddCardForm(
        'vault root',
        (result: AddCardResult) => {
          insertNote(db, {
            id: note.id,
            path: note.path,
            title: result.title,
            content: result.content,
            word_count: result.content.split(/\s+/).filter(Boolean).length,
            created_at: note.created_at,
            updated_at: new Date().toISOString().split('T')[0]!,
            tags: JSON.stringify(
              result.tags ? result.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []
            ),
          });
          saveDb(vaultPath);
          setImmediate(() => openBrowseTui(vaultPath, db));
        },
        () => setImmediate(() => openBrowseTui(vaultPath, db)),
        note.title,
        note.content,
        existingTags,
      );
    });
  });


  screen.key(['a'], () => {
    transitionTo(() => {
      showAddCardForm(
        'vault root',
        (result: AddCardResult) => {
          const slug = result.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 64);
          const id = slug + '.md';
          const today = new Date().toISOString().split('T')[0]!;
          insertNote(db, {
            id,
            path: id,
            title: result.title,
            content: result.content,
            word_count: result.content.split(/\s+/).filter(Boolean).length,
            created_at: today,
            updated_at: today,
            tags: JSON.stringify(
              result.tags ? result.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []
            ),
          });
          initializeScheduling(db, id);
          saveDb(vaultPath);
          setImmediate(() => openBrowseTui(vaultPath, db));
        },
        () => setImmediate(() => openBrowseTui(vaultPath, db)),
      );
    });
  });


  screen.key(['d'], () => {
    const idx = list.getSelectedIndex();
    if (idx >= state.filteredNotes.length) return;
    const note = state.filteredNotes[idx]!;

    const prompt = blessed.question({
      parent: screen,
      top: 'center',
      left: 'center',
      height: 'shrink',
      width: 'shrink',
      border: 'line',
      style: { border: { fg: 'red' }, bg: 'black' },
    });

    prompt.ask(`Delete "${note.title}"? (y/N):`, (err: Error | null, value: string) => {
      if (value?.toLowerCase() === 'y') {
        deleteNoteByPath(db, note.path);
        saveDb(vaultPath);
        screen.destroy();
        setImmediate(() => openBrowseTui(vaultPath, db));
      } else {
        screen.render();
      }
    });
  });


  screen.key(['h'], () => {
    const idx = list.getSelectedIndex();
    if (idx >= state.filteredNotes.length) return;
    const note = state.filteredNotes[idx]!;
    const reviews = getReviewsForNote(db, note.id);
    if (reviews.length === 0) {
      detailBox.setContent(' No review history for this card');
    } else {
      const history = reviews.map(r => {
        const qColor = r.quality >= 3 ? chalk.green : chalk.red;
        return chalk`${r.reviewed_at}  quality: ${qColor(r.quality.toString())}`;
      }).join('\n');
      detailBox.setContent(chalk.bold.magenta(' REVIEW HISTORY:\n') + history);
    }
    screen.render();
  });

  // screen.destroy() alone leaves the process alive if there are pending async
  // ops (the db connection, blessed internals). We also restore the cursor and
  // explicitly end the process.

  screen.key(['q', 'C-c'], () => {
    screen.destroy();
    process.stdout.write('\x1b[?25h');
    process.exit(0);
  });

  screen.render();
}
