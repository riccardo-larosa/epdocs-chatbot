import ReactMarkdown from "react-markdown";
import React from "react";
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypePrism from 'rehype-prism-plus';

// We'll dynamically import Prism on the client side only
import dynamic from 'next/dynamic';

interface ComponentProps {
    node?: any;
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
}

export default function FormatResponse({ content }: { content: string }) {
    // Load Prism only on the client side
    React.useEffect(() => {
        const loadPrism = async () => {
            const Prism = (await import('prismjs')).default;
            await Promise.all([
                import('prismjs/components/prism-typescript'),
                import('prismjs/components/prism-javascript'),
                import('prismjs/components/prism-jsx'),
                import('prismjs/components/prism-tsx'),
                import('prismjs/components/prism-bash'),
                import('prismjs/components/prism-json'),
                import('prismjs/components/prism-markdown'),
                import('prismjs/components/prism-css'),
            ]);
            Prism.highlightAll();
        };
        loadPrism();
    }, [content]);

    return (
        <div className="markdown-content dark:bg-slate-700 dark:text-white rounded-lg p-4 max-w-[80%] shadow-md whitespace-normal">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize, rehypePrism]}
                components={{
                    a: ({ node, ...props }: ComponentProps) => (
                        <a 
                            className="text-emerald-600 hover:text-emerald-400 underline" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            {...props} 
                        />
                    ),
                    code: ({ node, inline, className, children, ...props }: ComponentProps) => {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline ? (
                            <pre className="prism-code">
                                <code className={match ? `language-${match[1]}` : ''} {...props}>
                                    {children}
                                </code>
                            </pre>
                        ) : (
                            <code className={className} {...props}>
                                {children}
                            </code>
                        );
                    }
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
