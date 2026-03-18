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

export interface AgentSubTask {
  id: string;
  status: string;
  agentParentId?: string | null;
  dependsOn?: string | null;
}

const ELIGIBLE_STATUSES: ReadonlySet<string> = new Set(['pending', 'blocked']);

/**
 * Returns all downstream dependents of rootId that are reachable through
 * an unbroken chain of eligible statuses ('pending' or 'blocked').
 * A non-eligible task in the chain stops traversal through that path.
 */
export function findDependentAgentSubTaskChain(
  rootId: string,
  agentParentId: string,
  tasks: AgentSubTask[],
): AgentSubTask[] {
  const agentTasks = tasks.filter((t) => t.agentParentId === agentParentId);

  // Build forward dependency map: dependsOn → [tasks that depend on it]
  const forwardDeps = new Map<string, AgentSubTask[]>();
  for (const task of agentTasks) {
    if (task.dependsOn) {
      const arr = forwardDeps.get(task.dependsOn) ?? [];
      arr.push(task);
      forwardDeps.set(task.dependsOn, arr);
    }
  }

  const result: AgentSubTask[] = [];
  const visited = new Set<string>();

  const traverse = (id: string): void => {
    if (visited.has(id)) return;
    visited.add(id);
    for (const dep of forwardDeps.get(id) ?? []) {
      if (ELIGIBLE_STATUSES.has(dep.status)) {
        result.push(dep);
        traverse(dep.id);
      }
      // Non-eligible tasks break the chain — do not traverse through them
    }
  };

  traverse(rootId);
  return result;
}
