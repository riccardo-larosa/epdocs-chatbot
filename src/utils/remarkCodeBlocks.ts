import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Paragraph, Code } from 'mdast';

const remarkCodeBlocks: Plugin = () => {
    return (tree: Root) => {
        visit(tree, 'paragraph', (node: Paragraph, index, parent) => {
            if (!parent || typeof index !== 'number') return;

            const children = node.children || [];
            if (children.length === 1 && children[0].type === 'code') {
                // Replace the paragraph with the code block
                parent.children[index] = children[0] as Code;
            }
        });
    };
};

export default remarkCodeBlocks; 