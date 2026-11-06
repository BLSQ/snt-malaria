import { ScopeAggregate, ScopeKind } from './types';

export const computeAggregates = (
    leafIdsByAncestor: Map<number, number[]>,
    ruleIds: Set<number>,
    handIds: Set<number>,
    excIds: Set<number>,
): Map<number, ScopeAggregate> => {
    const aggregates = new Map<number, ScopeAggregate>();
    leafIdsByAncestor.forEach((leaves, nodeId) => {
        let rule = 0;
        let hand = 0;
        let exc = 0;
        let scope = 0;
        leaves.forEach(leafId => {
            const kind = leafKind(leafId, ruleIds, handIds, excIds);
            if (ruleIds.has(leafId)) rule += 1;
            if (kind === 'hand') hand += 1;
            if (kind === 'exc') exc += 1;
            if (kind === 'rule' || kind === 'hand') scope += 1;
        });
        aggregates.set(nodeId, {
            total: leaves.length,
            rule,
            hand,
            exc,
            scope,
        });
    });
    return aggregates;
};

export const leafKind = (
    id: number,
    ruleIds: Set<number>,
    handIds: Set<number>,
    excIds: Set<number>,
): ScopeKind => {
    if (ruleIds.has(id)) {
        return excIds.has(id) ? 'exc' : 'rule';
    }
    return handIds.has(id) ? 'hand' : 'none';
};

// Picking a set of leaves restores the rule-matched ones and handpicks the
// rest, dropping any exclusion left over from earlier criteria.
export const pickLeaves = (
    leafIds: number[],
    hand: Set<number>,
    exc: Set<number>,
    ruleIds: Set<number>,
): { hand: Set<number>; exc: Set<number> } => {
    const nextHand = new Set(hand);
    const nextExc = new Set(exc);
    leafIds.forEach(id => {
        nextExc.delete(id);
        if (!ruleIds.has(id)) {
            nextHand.add(id);
        }
    });
    return { hand: nextHand, exc: nextExc };
};

// Unpicking a set of leaves excludes the ones the rule matched (rule
// membership itself is never edited) and un-handpicks all of them, including
// handpicks left over from earlier criteria.
export const unpickLeaves = (
    leafIds: number[],
    hand: Set<number>,
    exc: Set<number>,
    ruleIds: Set<number>,
): { hand: Set<number>; exc: Set<number> } => {
    const nextHand = new Set(hand);
    const nextExc = new Set(exc);
    leafIds.forEach(id => {
        nextHand.delete(id);
        if (ruleIds.has(id)) {
            nextExc.add(id);
        }
    });
    return { hand: nextHand, exc: nextExc };
};

// Overrides that no longer change anything: exclusions of leaves the rule no
// longer matches, and handpicks of leaves it now matches.
export const pruneNoOpOverrides = (
    ruleIds: Set<number>,
    handpickedIds: number[],
    excludedIds: number[],
): { hand: number[]; exc: number[] } => ({
    hand: handpickedIds.filter(id => !ruleIds.has(id)),
    exc: excludedIds.filter(id => ruleIds.has(id)),
});

export const restoreLeaves = (
    leafIds: number[],
    exc: Set<number>,
): Set<number> => {
    const nextExc = new Set(exc);
    leafIds.forEach(id => nextExc.delete(id));
    return nextExc;
};

export const sumAggregates = (
    ids: number[],
    aggregates: Map<number, ScopeAggregate>,
): ScopeAggregate => {
    const total = { total: 0, rule: 0, hand: 0, exc: 0, scope: 0 };
    ids.forEach(id => {
        const aggregate = aggregates.get(id);
        if (!aggregate) return;
        total.total += aggregate.total;
        total.rule += aggregate.rule;
        total.hand += aggregate.hand;
        total.exc += aggregate.exc;
        total.scope += aggregate.scope;
    });
    return total;
};
