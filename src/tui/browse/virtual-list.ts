import blessed, { Widgets } from 'blessed';

/** A single row in the virtual list. */
export interface VirtualListRow {
  label: string;
  data: unknown;
  style?: { fg?: string; bg?: string };
}

/** Configuration options for creating a virtual list. */
export interface VirtualListOptions {
  parent: Widgets.Node;
  top: number;
  left: number;
  width: number | string;
  height: number;
  rows: VirtualListRow[];
  onSelect?: (row: VirtualListRow, index: number) => void;
}

/** Public API returned by createVirtualList. */
export interface VirtualListHandle {
  box: Widgets.BoxElement;
  setRows: (rows: VirtualListRow[]) => void;
  getSelectedIndex: () => number;
  setSelectedIndex: (index: number) => void;
  moveSelection: (delta: number) => void;
  focus: () => void;
  onSelect?: (row: VirtualListRow, index: number) => void;
}

/**
 * Create a virtual list widget with keyboard navigation.
 * @param options - Configuration for the list.
 * @returns A handle with methods to control the list.
 */
export function createVirtualList(options: VirtualListOptions): VirtualListHandle {
  const box = blessed.box({
    parent: options.parent,
    top: options.top,
    left: options.left,
    width: options.width,
    height: options.height,
    border: 'line',
    style: { border: { fg: 'cyan' }, bg: 'black' },
    keys: true,
    mouse: false,
    scrollable: false,
    tags: false,
  });

  let rows: VirtualListRow[] = options.rows;
  let selectedIndex = 0;
  let scrollOffset = 0;
  const visibleLines = options.height - 2;

  function render() {
    if (selectedIndex < scrollOffset) scrollOffset = selectedIndex;
    if (selectedIndex >= scrollOffset + visibleLines) scrollOffset = selectedIndex - visibleLines + 1;

    const visible = rows.slice(scrollOffset, scrollOffset + visibleLines);
    const lines = visible.map((row, i) => {
      const actualIndex = scrollOffset + i;
      const prefix = actualIndex === selectedIndex ? '\x1b[7m' : '';
      const suffix = actualIndex === selectedIndex ? '\x1b[27m' : '';
      const text = row.label.slice(0, 55).padEnd(55);
      return `${prefix} ${text} ${suffix}`;
    });

    while (lines.length < visibleLines) lines.push(' '.repeat(57));
    box.setContent(lines.join('\n'));
    (box.parent as Widgets.Node & { screen?: { render: () => void } })?.screen?.render?.();
  }

  const handle: VirtualListHandle = {
    box,
    setRows(newRows: VirtualListRow[]) {
      rows = newRows;
      if (selectedIndex >= rows.length) selectedIndex = Math.max(0, rows.length - 1);
      if (scrollOffset >= rows.length) scrollOffset = Math.max(0, rows.length - visibleLines);
      render();
    },
    getSelectedIndex: () => selectedIndex,
    setSelectedIndex(index: number) {
      selectedIndex = Math.max(0, Math.min(index, rows.length - 1));
      render();
    },
    moveSelection(delta: number) {
      this.setSelectedIndex(selectedIndex + delta);
    },
    focus() {
      box.focus();
    },
    onSelect: options.onSelect,
  };

  render();
  return handle;
}
