import type { MultiGraph } from "graphology";
import { addEdgeIfNot } from "./Utils/graphUtils";
import { BC_I_AUNT, BC_I_COUSIN, BC_I_PARENT, BC_I_SIBLING_1, BC_I_SIBLING_2 } from "./constants";
import type { BCSettings } from "./interfaces";
import { fallbackField, getFieldInfo } from "./Utils/HierUtils";

export function addSiblingsFromSameParent(g: MultiGraph, settings: BCSettings) {
    const { userHiers, treatCurrNodeAsImpliedSibling } = settings;
    g.forEachNode((currN, a) => {
        // Find parents of current node
        g.forEachOutEdge(currN, (k, currNAttr, s, parentNode) => {
            if (currNAttr.dir !== "up") return;

            const { fieldDir, fieldHier } = getFieldInfo(userHiers, currNAttr.field);
            const field =
                fieldHier.same[0] ?? fallbackField(currNAttr.field, fieldDir);

            // Find the children of those parents
            g.forEachOutEdge(parentNode, (k, a, s, impliedSibling) => {
                // Skip the current node if the settings say to
                if (
                    a.dir !== "down" ||
                    (!treatCurrNodeAsImpliedSibling && impliedSibling === currN)
                )
                    return;

                addEdgeIfNot(g, currN, impliedSibling, {
                    dir: "same",
                    field,
                    implied: BC_I_SIBLING_1,
                });
            });
        });
    });
}

export function addSiblingsParentIsParent(g: MultiGraph) {
    g.forEachNode((currN, a) => {
        // Find siblings of current node
        g.forEachOutEdge(currN, (k, currNAttr, s, sibling) => {
            if (currNAttr.dir !== "same") return;
            // Find the parents of those siblings
            g.forEachOutEdge(sibling, (k, a, s, parent) => {
                const { dir, field } = a;
                if (dir !== "up") return;

                addEdgeIfNot(g, currN, parent, {
                    dir: "up",
                    field,
                    implied: BC_I_PARENT,
                });
            });
        });
    });
}

// Transitive closure of siblings
export function addSiblingsFromSiblings(g: MultiGraph) { }

export function addAuntsUncles(g: MultiGraph) {
    g.forEachNode((currN, a) => {
        // Find parents of current node
        g.forEachOutEdge(currN, (k, currEAttr, s, parentNode) => {
            if (currEAttr.dir !== "up") return;
            // Find the siblings of those parents
            g.forEachOutEdge(parentNode, (k, a, s, uncle) => {
                if (a.dir !== "same") return;

                addEdgeIfNot(g, currN, uncle, {
                    dir: "up",
                    // Use the starting node's parent field
                    field: currEAttr.field,
                    implied: BC_I_AUNT,
                });
            });
        });
    });
}
export function addCousins(g: MultiGraph) {
    g.forEachNode((currN, a) => {
        // Find parents of current node
        g.forEachOutEdge(currN, (k, currEAttr, s, parentNode) => {
            if (currEAttr.dir !== "up") return;
            // Find the siblings of those parents
            g.forEachOutEdge(parentNode, (k, parentSiblingAttr, s, uncle) => {
                if (parentSiblingAttr.dir !== "same") return;

                g.forEachOutEdge(uncle, (k, a, s, cousin) => {
                    if (a.dir !== "down" || currN === cousin) return;

                    addEdgeIfNot(g, currN, cousin, {
                        dir: "same",
                        field: parentSiblingAttr.field,
                        implied: BC_I_COUSIN,
                    });
                });
            });
        });
    });
}

// Sis --> Me <-- Bro
// Implies: Sis <--> Bro
export function addStructuralEquivalenceSiblings(g: MultiGraph) {
    g.forEachNode((currN, a) => {
        g.forEachInEdge(currN, (k, aSis, sis, _) => {
            if (aSis.dir !== "same") return;
            g.forEachInEdge(currN, (k, aBro, bro, _) => {
                if (aBro.dir !== "same" || sis === bro) return;
                if (aBro.field === aSis.field) {
                    addEdgeIfNot(g, sis, bro, {
                        dir: "same",
                        field: aBro.field,
                        implied: BC_I_SIBLING_2,
                    });
                }
            });
        });
    });
}
