import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Node } from 'unist';

const remarkCodeBlocks: Plugin = () => {
    return (tree: Node) => {
        visit(tree, 'paragraph', (node: any, index: number, parent: any) => {
            if (!parent || typeof index !== 'number') return;

            const children = node.children || [];
            if (children.length === 1 && children[0].type === 'code') {
                parent.children[index] = children[0];
            }
        });
    };
};

export default remarkCodeBlocks; 