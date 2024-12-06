import ReactMarkdown from "react-markdown";
import React from "react";
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

export default function FormatResponse({ content }: { content: string }) {

    return (
        <div className="prose dark:bg-slate-700 dark:text-white rounded-lg p-4 max-w-[80%] shadow-md whitespace-normal">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
                components={{
                    a: ({ ...props }) => (<a className="text-emerald-600 hover:text-emerald-400 underline" target="_blank" {...props} />),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
