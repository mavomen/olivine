import blessed, { Widgets } from 'blessed';

export interface CardState {
  title: string;
  content: string;
  revealed: boolean;
  index: number;
  total: number;
  box: number;
}

export function createCardBox(
  screen: Widgets.Screen,
  card: CardState,
  onReveal: () => void,
  onUnreveal: () => void,
  onRate: (quality: number) => void,
  onQuit: () => void,
): Widgets.BoxElement {
  const box = blessed.box({
    top: 'center',
    left: 'center',
    width: '80%',
    height: '70%',
    border: 'line',
    label: ` Card no. ${card.index} of ${card.total} — Box ${card.box} `,
    style: {
      border: { fg: 'cyan' },
      focus: { border: { fg: 'green' } },
    },
    keys: true,
    mouse: false,
    scrollable: false,
  });

  blessed.box({
    parent: box,
    top: 1,
    left: 2,
    right: 2,
    bottom: 3,
    content: card.revealed ? card.content : card.title,
    style: {
      fg: card.revealed ? 'white' : 'yellow',
    },
    align: card.revealed ? 'left' : 'center',
    valign: 'middle',
    scrollable: card.revealed,
    alwaysScroll: card.revealed,
    keys: true,
    vi: true,
  });

  blessed.box({
    parent: box,
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    content: card.revealed
      ? ' rating:  [0] blackout  [1] incorrect  [2] hard  [3] good  [4] easy  [5] perfect'
      : ' space to reveal the answer, backspace to go back to question',
    style: {
      bg: card.revealed ? 'green' : 'blue',
      fg: 'white',
      bold: true,
    },
    padding: { left: 2, right: 2 },
  });

  box.key(['space'], () => {
    if (!card.revealed) {
      onReveal();
    }
  });

  box.key(['backspace'], () => {
    if (card.revealed) {
      onUnreveal();
    }
  });

  box.key(['0', '1', '2', '3', '4', '5'], (ch: string) => {
    if (card.revealed) {
      const quality = parseInt(ch, 10);
      onRate(quality);
    }
  });

  box.key(['q', 'escape', 'C-c'], () => {
    onQuit();
  });

  screen.append(box);
  box.focus();
  return box;
}
