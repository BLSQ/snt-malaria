import { OrgUnit } from 'Iaso/domains/orgUnits/types/orgUnit';
import { OrgUnitTree, OrgUnitTreeNode, VisibleTreeRow } from './types';

// Builds the navigable pyramid (intervention-level org units plus their
// ancestor chains, deduplicated) from a flat, `withParents`-fetched list -
// see useOrgUnitTree for why we fetch it this way instead of lazily
// walking the hierarchy branch by branch.
//
// The list only ever carries `org_unit_type_id` (never a type name) for
// ancestor nodes, so names are resolved here from a separately-fetched
// id -> name map instead.
export const buildOrgUnitTree = (
    orgUnits: OrgUnit[],
    orgUnitTypeNames: Map<number, string>,
): OrgUnitTree => {
    const nodesById = new Map<number, OrgUnitTreeNode>();
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
    ): OrgUnitTreeNode => {
        const existing = nodesById.get(id);
        if (existing) return existing;
        const node: OrgUnitTreeNode = {
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

// Nodes to keep for a search query: nodes whose label matches, plus ancestors.
export const computeKeepForQuery = (
    tree: OrgUnitTree,
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
    tree: OrgUnitTree,
    expanded: Set<number>,
    keep: Set<number> | null,
): VisibleTreeRow[] => {
    const rows: VisibleTreeRow[] = [];
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
