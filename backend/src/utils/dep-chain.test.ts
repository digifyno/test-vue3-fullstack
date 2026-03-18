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

  it('handles a 3-node parent recursive cycle (A→B→C→A) without infinite loop', () => {
    // A has parentId B, B has parentId C, C has parentId A — a full 3-node cycle
    const items = [
      { id: 'A', parentId: 'B' },
      { id: 'B', parentId: 'C' },
      { id: 'C', parentId: 'A' },
    ];
    // The visited-set guard must break the cycle; all 3 items are visited before
    // the repeated node is encountered, so the result contains exactly all 3 items.
    const result = findDepChain(items, 'A');
    // Must terminate (no infinite loop) and return at most 3 items
    expect(result.length).toBeLessThanOrEqual(3);
    // The starting item 'A' must always be present in the result
    expect(result.some((item) => item.id === 'A')).toBe(true);
    // No item should appear more than once (cycle guard prevents duplicates)
    const ids = result.map((item) => item.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('returns only task A when it is a root item even when its dependents are present in items', () => {
    // Task A has no parent, but its children B and C appear in the items list.
    // findDepChain walks UP the parentId chain only (ancestors), never down.
    const items = [
      { id: 'A', parentId: null },
      { id: 'B', parentId: 'A' },
      { id: 'C', parentId: 'B' },
    ];
    expect(findDepChain(items, 'A')).toEqual([{ id: 'A', parentId: null }]);
  });

  it('returns [A, B] when task B depends on task A (B.parentId = A, A is root)', () => {
    // Task B has parentId 'A'; task A is a root item (no parent).
    // Starting from B, findDepChain should walk up to A and return the full chain [A, B].
    const items = [
      { id: 'A', parentId: null },
      { id: 'B', parentId: 'A' },
    ];
    expect(findDepChain(items, 'B')).toEqual([
      { id: 'A', parentId: null },
      { id: 'B', parentId: 'A' },
    ]);
  });

  it('returns [A, B, C] when task C depends on B (C.parentId = B, B.parentId = A, A is root)', () => {
    // Task C has parentId 'B'; task B has parentId 'A'; task A is a root item (no parent).
    // Starting from C, findDepChain should walk up through B to A and return the full chain [A, B, C].
    const items = [
      { id: 'A', parentId: null },
      { id: 'B', parentId: 'A' },
      { id: 'C', parentId: 'B' },
    ];
    expect(findDepChain(items, 'C')).toEqual([
      { id: 'A', parentId: null },
      { id: 'B', parentId: 'A' },
      { id: 'C', parentId: 'B' },
    ]);
  });
});