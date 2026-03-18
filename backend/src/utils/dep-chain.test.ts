import { describe, it, expect } from 'vitest';
import { findDepChain } from './dep-chain.js';

describe('findDepChain', () => {
  it('returns only the item when parent is empty', () => {
    const items = [{ id: '1', parentId: null }];
    expect(findDepChain(items, '1')).toEqual([{ id: '1', parentId: null }]);
  });

  it('returns only the item when parentId is undefined', () => {
    const items = [{ id: '1' }];
    expect(findDepChain(items, '1')).toEqual([{ id: '1' }]);
  });

  it('returns a single-level chain (item with one parent)', () => {
    const items = [
      { id: '1', parentId: null },
      { id: '2', parentId: '1' },
    ];
    expect(findDepChain(items, '2')).toEqual([
      { id: '1', parentId: null },
      { id: '2', parentId: '1' },
    ]);
  });

  it('returns a multi-level chain from root to item', () => {
    const items = [
      { id: 'a', parentId: null },
      { id: 'b', parentId: 'a' },
      { id: 'c', parentId: 'b' },
      { id: 'd', parentId: 'c' },
    ];
    expect(findDepChain(items, 'd')).toEqual([
      { id: 'a', parentId: null },
      { id: 'b', parentId: 'a' },
      { id: 'c', parentId: 'b' },
      { id: 'd', parentId: 'c' },
    ]);
  });

  it('stops at a missing/broken parent reference', () => {
    const items = [
      { id: '2', parentId: 'missing' },
      { id: '3', parentId: '2' },
    ];
    // '2' has a parent that does not exist in the list
    expect(findDepChain(items, '3')).toEqual([
      { id: '2', parentId: 'missing' },
      { id: '3', parentId: '2' },
    ]);
  });

  it('returns empty array when start id does not exist', () => {
    const items = [{ id: '1', parentId: null }];
    expect(findDepChain(items, 'nonexistent')).toEqual([]);
  });

  it('handles circular reference without infinite loop', () => {
    const items = [
      { id: 'x', parentId: 'y' },
      { id: 'y', parentId: 'x' },
    ];
    // Should return partial chain (detected cycle and stopped)
    const result = findDepChain(items, 'x');
    expect(result.length).toBeLessThanOrEqual(2);
    expect(result.some((item) => item.id === 'x')).toBe(true);
  });

  it('returns chain from root to middle node (parent as startId)', () => {
    const items = [
      { id: 'a', parentId: null },
      { id: 'b', parentId: 'a' },
      { id: 'c', parentId: 'b' },
    ];
    // 'b' is a middle node — result should be [a, b], NOT including 'c'
    expect(findDepChain(items, 'b')).toEqual([
      { id: 'a', parentId: null },
      { id: 'b', parentId: 'a' },
    ]);
  });

  it('returns single-element chain when startId is the root node', () => {
    const items = [
      { id: 'root', parentId: null },
      { id: 'child', parentId: 'root' },
    ];
    // Root has no parent, so chain is just [root]
    expect(findDepChain(items, 'root')).toEqual([{ id: 'root', parentId: null }]);
  });

  it('preserves extra properties on items (generic type T)', () => {
    const items = [
      { id: '1', parentId: null, label: 'Root' },
      { id: '2', parentId: '1', label: 'Child' },
    ];
    expect(findDepChain(items, '2')).toEqual([
      { id: '1', parentId: null, label: 'Root' },
      { id: '2', parentId: '1', label: 'Child' },
    ]);
  });

  it('returns only the subchain up to a mid-tree parent in a large list', () => {
    const items = [
      { id: 'n1', parentId: null },
      { id: 'n2', parentId: 'n1' },
      { id: 'n3', parentId: 'n2' },
      { id: 'n4', parentId: 'n3' },
      { id: 'n5', parentId: 'n4' },
    ];
    // startId is 'n3' — should return [n1, n2, n3], not including n4 or n5
    expect(findDepChain(items, 'n3')).toEqual([
      { id: 'n1', parentId: null },
      { id: 'n2', parentId: 'n1' },
      { id: 'n3', parentId: 'n2' },
    ]);
  });
});
