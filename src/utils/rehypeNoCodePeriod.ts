import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';

// Custom rehype plugin to remove periods after code blocks
const rehypeNoCodePeriod: Plugin = () => {
    return (tree) => {
        visit(tree, 'element', (node, index, parent) => {
            if (
                node.tagName === 'p' && 
                node.children?.length === 1 && 
                node.children[0].tagName === 'pre'
            ) {
                parent.children[index] = node.children[0];
            }
        });
    };
};

export default rehypeNoCodePeriod; 