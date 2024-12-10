import ReactMarkdown from "react-markdown";
import React, { useMemo } from "react";
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { Highlight, themes, Language } from 'prism-react-renderer';
import { useTheme } from 'next-themes';

type CodeProps = {
    className?: string;
    children?: React.ReactNode;
    inline?: boolean;
} & React.HTMLProps<HTMLElement>;

const getLanguage = (className: string | undefined): Language => {
    const match = /language-(\w+)/.exec(className || '');
    const lang = match ? match[1].toLowerCase() : '';
    
    // Convert common aliases
    switch (lang) {
        case 'sh':
        case 'curl':
            return 'bash';
        case 'md':
        case 'mdx':
            return 'markdown';
        case 'ts':
        case 'tsx':
            return 'typescript';
        case 'js':
        case 'jsx':
            return 'javascript';
        case 'json':
            return 'json';
        case 'http':
            return 'http';
        case 'py':
            return 'python';
        default:
            return lang as Language || 'markdown';
    }
};

const CodeBlock = React.memo(({ className, children, inline, ...props }: CodeProps) => {
    const { resolvedTheme, theme } = useTheme();
    const currentTheme = resolvedTheme || theme || 'light';
    const language = getLanguage(className);

    if (!inline && language) {
        const code = String(children).replace(/\n$/, '');
        
        return (
            <pre 
                className="text-sm align-baseline"
            >
                <Highlight
                    theme={currentTheme === 'dark' ? themes.vsDark : themes.vsLight}
                    code={code}
                    language={language}
                >
                    {({ className, style, tokens, getLineProps, getTokenProps }) => (
                        <code className={`${className} whitespace-pre`} style={style}>
                            {tokens.map((line, i) => (
                                <span 
                                    key={i} 
                                    {...getLineProps({ line })}
                                    className="token-line text-md leading-6 block"
                                >
                                    {line.map((token, key) => (
                                        <span key={key} {...getTokenProps({ token })} />
                                    ))}
                                </span>
                            ))}
                        </code>
                    )}
                </Highlight>
            </pre>
        );
    }

    return (
        <code className={`${className} bg-gray-100 dark:bg-gray-800 rounded px-1`} {...props}>
            {children}
        </code>
    );
});

CodeBlock.displayName = 'CodeBlock';

export default function FormatResponse({ content }: { content: string }) {
    const components = useMemo(() => ({
        a: ({ ...props }) => (
            <a 
                className="text-emerald-600 hover:text-emerald-400 underline" 
                target="_blank" 
                rel="noopener noreferrer" 
                {...props} 
            />
        ),
        // Handle paragraphs containing code blocks
        p: ({ children }) => {
            const childArray = React.Children.toArray(children);
            // Check if paragraph contains a code block
            const hasCodeBlock = childArray.some(
                child => React.isValidElement(child) && 
                (child.props?.className?.includes('language-') || child.type === 'pre')
            );
            
            // If it contains a code block, render without paragraph wrapper
            if (hasCodeBlock) {
                return <>{children}</>;
            }
            return <p>{children}</p>;
        },
        code: CodeBlock as any,
    }), []);

    return (
        <div className="prose prose-pre:my-0 prose-pre:bg-transparent dark:prose-invert dark:bg-slate-700 dark:text-white rounded-lg p-4 max-w-[80%] shadow-md whitespace-normal">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
                components={components}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
