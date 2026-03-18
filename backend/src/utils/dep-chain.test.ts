import { describe, it, expect, afterAll } from 'vitest';
import { findDepChain, findDependentAgentSubTaskChain } from './dep-chain.js';

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
});

describe('findDependentAgentSubTaskChain', () => {
  const PREFIX = 'test_findDepChain parent status filter';
  const createdIds: string[] = [];

  afterAll(() => {
    // Pure in-memory tests — no external resources to clean up.
    createdIds.length = 0;
  });

  it('excludes completed/in_progress tasks and tasks behind a broken chain, includes pending/blocked direct dependents', () => {
    const agentParentId = `${PREFIX} agent-parent`;

    const rootTask = { id: `${PREFIX} root`, status: 'failed',      agentParentId, dependsOn: null };
    const taskB    = { id: `${PREFIX} B`,    status: 'completed',   agentParentId, dependsOn: `${PREFIX} root` };
    const taskC    = { id: `${PREFIX} C`,    status: 'pending',     agentParentId, dependsOn: `${PREFIX} B` };
    const taskD    = { id: `${PREFIX} D`,    status: 'in_progress', agentParentId, dependsOn: `${PREFIX} root` };
    const taskE    = { id: `${PREFIX} E`,    status: 'pending',     agentParentId, dependsOn: `${PREFIX} root` };
    const taskF    = { id: `${PREFIX} F`,    status: 'blocked',     agentParentId, dependsOn: `${PREFIX} root` };

    createdIds.push(rootTask.id, taskB.id, taskC.id, taskD.id, taskE.id, taskF.id);

    const tasks = [rootTask, taskB, taskC, taskD, taskE, taskF];
    const result = findDependentAgentSubTaskChain(rootTask.id, agentParentId, tasks);

    const resultIds = result.map((t) => t.id);

    // Included: pending/blocked direct dependents of root
    expect(resultIds).toContain(taskE.id);
    expect(resultIds).toContain(taskF.id);

    // Excluded: completed (B), in_progress (D), and C (behind broken chain via B)
    expect(resultIds).not.toContain(taskB.id);
    expect(resultIds).not.toContain(taskC.id);
    expect(resultIds).not.toContain(taskD.id);

    // Exactly E and F — no extras
    expect(result).toHaveLength(2);
  });
});
