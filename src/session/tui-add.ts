import blessed, { Widgets } from 'blessed';

export interface AddCardResult {
  title: string;
  content: string;
}

export function showAddCardForm(
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
      width: '80%',
      height: '70%',
      border: 'line',
      label: ' New Card ',
      style: {
        border: { fg: 'cyan' },
      },
      keys: true,
      mouse: false,
    });

    blessed.text({
      parent: form,
      top: 1,
      left: 2,
      height: 1,
      content: 'Title:',
      style: { fg: 'grey', bold: true },
    });

    const titleInput = blessed.textbox({
      parent: form,
      top: 1,
      left: 10,
      right: 2,
      height: 1,
      inputOnFocus: true,
      style: {
        bg: 'black',
        fg: 'white',
        focus: { bg: 'black', fg: 'yellow' },
      },
    });

    blessed.text({
      parent: form,
      top: 3,
      left: 2,
      height: 1,
      content: 'Content:',
      style: { fg: 'grey', bold: true },
    });

    const contentInput = blessed.textarea({
      parent: form,
      top: 4,
      left: 2,
      right: 2,
      bottom: 3,
      inputOnFocus: true,
      style: {
        bg: 'black',
        fg: 'white',
        focus: { bg: 'black', fg: 'yellow' },
      },
      scrollable: true,
      alwaysScroll: true,
      keys: true,
      vi: true,
    });

    const footer = blessed.box({
      parent: form,
      bottom: 0,
      left: 0,
      right: 0,
      height: 3,
      content: ' Ctrl+S to save   Esc to cancel',
      style: {
        bg: 'blue',
        fg: 'white',
        bold: true,
      },
      padding: { left: 2, right: 2 },
    });

    titleInput.focus();

    // Tab navigation: title -> content -> title
    titleInput.key(['tab'], () => {
      contentInput.focus();
    });
    contentInput.key(['S-tab'], () => {
      titleInput.focus();
    });

    // Save: Ctrl+S
    screen.key(['C-s'], () => {
      const title = titleInput.getValue().trim();
      const content = contentInput.getValue().trim();
      if (title) {
        screen.destroy();
        onSave({ title, content });
        resolve();
      }
    });

    // Cancel: Escape
    screen.key(['escape', 'C-c'], () => {
      screen.destroy();
      onCancel();
      resolve();
    });

    screen.render();
  });
}
