export interface DepItem {
  id: string;
  parentId?: string | null;
}

/**
 * Returns the ordered chain of ancestors from root to the given item (inclusive).
 * Handles missing parent references and circular references.
 */
export function findDepChain<T extends DepItem>(items: T[], startId: string): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(item.id, item);
  }

  const chain: T[] = [];
  const visited = new Set<string>();
  let currentId: string | null | undefined = startId;

  while (currentId != null) {
    if (visited.has(currentId)) {
      break;
    }
    const item = map.get(currentId);
    if (!item) {
      break;
    }
    visited.add(currentId);
    chain.unshift(item);
    currentId = item.parentId;
  }

  return chain;
}
