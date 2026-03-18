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

  it('returns empty array when items list is empty (task with no deps)', () => {
    expect(findDepChain([], 'any-id')).toEqual([]);
  });

  it('returns chain for item with direct parent (direct dependency)', () => {
    const items = [
      { id: 'parent-task', parentId: null },
      { id: 'child-task', parentId: 'parent-task' },
    ];
    expect(findDepChain(items, 'child-task')).toEqual([
      { id: 'parent-task', parentId: null },
      { id: 'child-task', parentId: 'parent-task' },
    ]);
  });
});
