import ReactMarkdown from "react-markdown";
import React, { useEffect, useState } from "react";
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import javascript from 'highlight.js/lib/languages/javascript';
import bash from 'highlight.js/lib/languages/bash';
import markdown from 'highlight.js/lib/languages/markdown';
import 'highlight.js/styles/github.css';
import 'highlight.js/styles/panda-syntax-dark.min.css';

// Register the languages
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('jsx', javascript);
hljs.registerLanguage('tsx', typescript);

export default function FormatResponse({ content }: { content: string }) {
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        // Check if dark mode is enabled
        const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setIsDark(darkModeMediaQuery.matches);

        // Listen for theme changes
        const handleChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
        darkModeMediaQuery.addEventListener('change', handleChange);

        return () => darkModeMediaQuery.removeEventListener('change', handleChange);
    }, []);

    return (
        <div className={`prose ${isDark ? 'dark:bg-slate-700 dark:text-white' : 'bg-white text-black'} rounded-lg p-4 max-w-[80%] shadow-md whitespace-normal`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize, [rehypeHighlight, { detect: true, ignoreMissing: true }]]}
                components={{
                    a: ({ ...props }) => (
                        <a className="text-emerald-600 hover:text-emerald-400 underline" target="_blank" {...props} />
                    ),
                    code: ({ className, children, ...props }) => {
                        const codeClass = `${className} p-1 rounded ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-200 text-black'}`;
                        return (
                            <code className={codeClass} {...props}>
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
