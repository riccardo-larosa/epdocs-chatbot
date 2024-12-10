import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Element } from 'hast';

const rehypeNoCodePeriod: Plugin = () => {
    return (tree) => {
        visit(tree, 'element', (node: Element, index, parent) => {
            // Check if this is a paragraph containing only a pre element
            if (
                node.tagName === 'p' && 
                node.children?.length === 1 && 
                (node.children[0] as Element).tagName === 'pre'
            ) {
                // Replace the paragraph with its pre child
                if (parent && typeof index === 'number') {
                    parent.children[index] = node.children[0] as Element;
                }
            }
        });
    };
};

export default rehypeNoCodePeriod; 