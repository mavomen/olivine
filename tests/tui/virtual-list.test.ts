const mockSetContent = jest.fn();

jest.mock('blessed', () => ({
  box: jest.fn(() => ({
    setContent: mockSetContent,
    focus: jest.fn(),
    on: jest.fn(),
  })),
}));

import { createVirtualList, VirtualListRow } from '../../src/tui/browse/virtual-list';

function makeRows(n: number): VirtualListRow[] {
  return Array.from({ length: n }, (_, i) => ({
    label: `Row ${i + 1}`,
    data: { id: i + 1 },
  }));
}

describe('createVirtualList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a list with rows', () => {
    const rows = makeRows(3);
    const list = createVirtualList({
      parent: {} as any,
      top: 0,
      left: 0,
      width: 30,
      height: 5,
      rows,
    });
    expect(list.getSelectedIndex()).toBe(0);
    expect(mockSetContent).toHaveBeenCalled();
  });

  it('should start with selected index 0', () => {
    const rows = makeRows(5);
    const list = createVirtualList({ parent: {} as any, top: 0, left: 0, width: 30, height: 10, rows });
    expect(list.getSelectedIndex()).toBe(0);
  });

  it('should move selection with setSelectedIndex', () => {
    const rows = makeRows(5);
    const list = createVirtualList({ parent: {} as any, top: 0, left: 0, width: 30, height: 10, rows });
    list.setSelectedIndex(2);
    expect(list.getSelectedIndex()).toBe(2);
  });

  it('should clamp setSelectedIndex to bounds', () => {
    const rows = makeRows(5);
    const list = createVirtualList({ parent: {} as any, top: 0, left: 0, width: 30, height: 10, rows });
    list.setSelectedIndex(-1);
    expect(list.getSelectedIndex()).toBe(0);
    list.setSelectedIndex(100);
    expect(list.getSelectedIndex()).toBe(4);
  });

  it('should move selection relatively with moveSelection', () => {
    const rows = makeRows(5);
    const list = createVirtualList({ parent: {} as any, top: 0, left: 0, width: 30, height: 10, rows });
    list.moveSelection(2);
    expect(list.getSelectedIndex()).toBe(2);
    list.moveSelection(-1);
    expect(list.getSelectedIndex()).toBe(1);
  });

  it('should clamp moveSelection to bounds', () => {
    const rows = makeRows(3);
    const list = createVirtualList({ parent: {} as any, top: 0, left: 0, width: 30, height: 10, rows });
    list.moveSelection(-5);
    expect(list.getSelectedIndex()).toBe(0);
    list.moveSelection(10);
    expect(list.getSelectedIndex()).toBe(2);
  });

  it('should adjust selectedIndex when setRows reduces count', () => {
    const rows = makeRows(10);
    const list = createVirtualList({ parent: {} as any, top: 0, left: 0, width: 30, height: 10, rows });
    list.setSelectedIndex(8);
    list.setRows(makeRows(3));
    expect(list.getSelectedIndex()).toBe(2);
  });

  it('should render content on setRows', () => {
    const rows = makeRows(3);
    const list = createVirtualList({ parent: {} as any, top: 0, left: 0, width: 30, height: 10, rows });
    jest.clearAllMocks();
    list.setRows(makeRows(5));
    expect(mockSetContent).toHaveBeenCalled();
  });

  it('should store onSelect callback', () => {
    const onSelect = jest.fn();
    const list = createVirtualList({
      parent: {} as any,
      top: 0,
      left: 0,
      width: 30,
      height: 10,
      rows: makeRows(3),
      onSelect,
    });
    expect(list.onSelect).toBe(onSelect);
  });
});
