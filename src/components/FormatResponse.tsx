import ReactMarkdown from "react-markdown";
import React from "react";
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import javascript from 'highlight.js/lib/languages/javascript';
import bash from 'highlight.js/lib/languages/bash';
import markdown from 'highlight.js/lib/languages/markdown';
import 'highlight.js/styles/github-dark.css';

// Register the languages
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('jsx', javascript);
hljs.registerLanguage('tsx', typescript);

interface CodeProps extends React.HTMLAttributes<HTMLElement> {
    inline?: boolean;
    className?: string;
}

export default function FormatResponse({ content }: { content: string }) {
    return (
        <div className="prose dark:prose-invert bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-w-[80%] shadow-md whitespace-normal">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize, [rehypeHighlight, { detect: true, ignoreMissing: true }]]}
                components={{
                    a: ({ ...props }) => (
                        <a className="text-emerald-600 hover:text-emerald-400 underline" target="_blank" {...props} />
                    ),
                    code: ({ className, children, inline, ...props }: CodeProps) => {
                        if (inline) {
                            return (
                                <code className="inline-code" {...props}>
                                    {children}
                                </code>
                            );
                        }
                        return (
                            <code 
                                className={`${className || ''}`} 
                                {...props}
                            >
                                {children}
                            </code>
                        );
                    },
                    pre: ({ children, ...props }) => (
                        <pre className="code-block-wrapper" {...props}>
                            {children}
                        </pre>
                    )
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
