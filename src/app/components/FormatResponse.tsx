import ReactMarkdown from "react-markdown";
import React from "react";
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

export default function FormatResponse({ content }: { content: string }) {

    return (
        <div className="prose bg-gray-100 rounded-lg p-4 max-w-[80%] shadow-md whitespace-normal">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
                components={{
                    a: ({ ...props }) => (<a className="text-blue-600 hover:text-blue-800 underline" target="_blank" {...props} />),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
