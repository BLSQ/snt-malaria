import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import {
    ScopeAggregate,
    ScopeKind,
    ScopeRow,
    ScopeTree,
    ScopeTreeNode,
} from './types';

// Builds the navigable pyramid (intervention-level org units plus their
// ancestor chains, deduplicated) from a flat, `withParents`-fetched list -
// see useOrgUnitScopeTree for why we fetch it this way instead of lazily
// walking the hierarchy branch by branch.
//
// The list only ever carries `org_unit_type_id` (never a type name) for
// ancestor nodes, so names are resolved here from a separately-fetched
// id -> name map instead.
export const buildScopeTree = (
    orgUnits: OrgUnit[],
    orgUnitTypeNames: Map<number, string>,
): ScopeTree => {
    const nodesById = new Map<number, ScopeTreeNode>();
    const leafIdsByAncestor = new Map<number, number[]>();
    const leafIds: number[] = [];

    const ensureNode = (
        id: number,
        name: string,
        orgUnitTypeId: number,
        orgUnitTypeName: string,
        parentId: number | undefined,
        isLeaf: boolean,
        validationStatus?: string,
    ): ScopeTreeNode => {
        const existing = nodesById.get(id);
        if (existing) return existing;
        const node: ScopeTreeNode = {
            id,
            name,
            orgUnitTypeId,
            orgUnitTypeName,
            validationStatus,
            isLeaf,
            parentId,
            children: [],
        };
        nodesById.set(id, node);
        return node;
    };

    const addLeafToAncestor = (ancestorId: number, leafId: number) => {
        const list = leafIdsByAncestor.get(ancestorId);
        if (list) {
            list.push(leafId);
        } else {
            leafIdsByAncestor.set(ancestorId, [leafId]);
        }
    };

    orgUnits.forEach(orgUnit => {
        leafIds.push(orgUnit.id);
        addLeafToAncestor(orgUnit.id, orgUnit.id);
        ensureNode(
            orgUnit.id,
            orgUnit.name,
            orgUnit.org_unit_type_id,
            orgUnitTypeNames.get(orgUnit.org_unit_type_id) ?? '',
            orgUnit.parent?.id,
            true,
            orgUnit.validation_status,
        );

        let childId = orgUnit.id;
        let ancestor = orgUnit.parent;
        while (ancestor) {
            const ancestorNode = ensureNode(
                ancestor.id,
                ancestor.name,
                ancestor.org_unit_type_id,
                orgUnitTypeNames.get(ancestor.org_unit_type_id) ?? '',
                ancestor.parent?.id,
                false,
                ancestor.validation_status,
            );
            if (!ancestorNode.children.includes(childId)) {
                ancestorNode.children.push(childId);
            }
            addLeafToAncestor(ancestor.id, orgUnit.id);
            childId = ancestor.id;
            ancestor = ancestor.parent;
        }
    });

    nodesById.forEach(node => {
        node.children.sort((a, b) =>
            (nodesById.get(a)?.name ?? '').localeCompare(
                nodesById.get(b)?.name ?? '',
            ),
        );
    });

    const rootIds = [...nodesById.values()]
        .filter(node => node.parentId === undefined)
        .map(node => node.id)
        .sort((a, b) =>
            (nodesById.get(a)?.name ?? '').localeCompare(
                nodesById.get(b)?.name ?? '',
            ),
        );

    return { nodesById, rootIds, leafIds, leafIdsByAncestor };
};

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
            const inRule = ruleIds.has(leafId);
            const inHand = handIds.has(leafId);
            const inExc = excIds.has(leafId);
            if (inRule) rule += 1;
            if (inHand) hand += 1;
            if (inExc) exc += 1;
            if ((inRule || inHand) && !inExc) scope += 1;
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
    if (excIds.has(id)) return 'exc';
    if (handIds.has(id)) return 'hand';
    if (ruleIds.has(id)) return 'rule';
    return 'none';
};

// Picking a set of leaves restores any that are excluded (the rule still
// owns them) and handpicks the rest, unless they're already rule-matched.
export const pickLeaves = (
    leafIds: number[],
    hand: Set<number>,
    exc: Set<number>,
    ruleIds: Set<number>,
): { hand: Set<number>; exc: Set<number> } => {
    const nextHand = new Set(hand);
    const nextExc = new Set(exc);
    leafIds.forEach(id => {
        if (nextExc.has(id)) {
            nextExc.delete(id);
        } else if (!ruleIds.has(id)) {
            nextHand.add(id);
        }
    });
    return { hand: nextHand, exc: nextExc };
};

// Unpicking a set of leaves excludes the ones the rule matched (rule
// membership itself is never edited) and simply un-handpicks the rest.
export const unpickLeaves = (
    leafIds: number[],
    hand: Set<number>,
    exc: Set<number>,
    ruleIds: Set<number>,
): { hand: Set<number>; exc: Set<number> } => {
    const nextHand = new Set(hand);
    const nextExc = new Set(exc);
    leafIds.forEach(id => {
        if (ruleIds.has(id)) {
            nextExc.add(id);
        } else {
            nextHand.delete(id);
        }
    });
    return { hand: nextHand, exc: nextExc };
};

export const restoreLeaves = (
    leafIds: number[],
    exc: Set<number>,
): Set<number> => {
    const nextExc = new Set(exc);
    leafIds.forEach(id => nextExc.delete(id));
    return nextExc;
};

// Nodes to keep for a search query: nodes whose label matches, plus ancestors.
export const computeKeepForQuery = (
    tree: ScopeTree,
    query: string,
): Set<number> | null => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const keep = new Set<number>();
    const visit = (id: number, ancestors: number[]) => {
        const node = tree.nodesById.get(id);
        if (!node) return;
        if (node.name.toLowerCase().includes(q)) {
            keep.add(id);
            ancestors.forEach(a => keep.add(a));
        }
        node.children.forEach(childId => visit(childId, [...ancestors, id]));
    };
    tree.rootIds.forEach(id => visit(id, []));
    return keep;
};

// Flattens the tree into the rows to render, respecting manual expand/collapse
// state - or fully expanded when a search is active, so matches stay visible
// without the user having to expand every branch by hand.
export const buildVisibleRows = (
    tree: ScopeTree,
    expanded: Set<number>,
    keep: Set<number> | null,
): ScopeRow[] => {
    const rows: ScopeRow[] = [];
    const visit = (id: number, depth: number) => {
        if (keep && !keep.has(id)) return;
        const node = tree.nodesById.get(id);
        if (!node) return;
        const isOpen = keep ? true : expanded.has(id);
        rows.push({ id, depth, isOpen });
        if (isOpen) node.children.forEach(childId => visit(childId, depth + 1));
    };
    tree.rootIds.forEach(id => visit(id, 0));
    return rows;
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
