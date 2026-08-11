/**
 * Resolves a `combine` node's "stack" priority order against its live connections. Mirrors the
 * backend's `_resolve_stack_order` (`services/composite/evaluator.py`) exactly, so both sides agree
 * on the outcome without either one needing to "repair" a stale persisted value: stale entries
 * (ports no longer connected) drop, duplicates collapse to their first occurrence, and any
 * connected port missing from the list is prepended - lowest priority - rather than appended, so a
 * newly wired input only fills gaps the other inputs leave, instead of silently overriding them.
 *
 * Priority is ascending: the LAST entry in the returned array wins on an overlap.
 */
export const resolveStackOrder = (
    raw: unknown,
    connectedPorts: string[],
): string[] => {
    const connected = new Set(connectedPorts);
    const ordered: string[] = [];
    if (Array.isArray(raw)) {
        raw.forEach(entry => {
            if (
                typeof entry === 'string' &&
                connected.has(entry) &&
                !ordered.includes(entry)
            ) {
                ordered.push(entry);
            }
        });
    }
    const missing = connectedPorts
        .filter(port => !ordered.includes(port))
        .sort();
    return [...missing, ...ordered];
};
