import ReactMarkdown from "react-markdown";
import React from "react";

export default function FormatResponse({ content }: { content: string }) {
    return (
        <div className="bg-gray-100 rounded-lg p-4 max-w-[80%] shadow-md">
            <ReactMarkdown
                components={{
                    h1: ({ ...props }) => <h1 className="text-2xl font-bold my-3" {...props} />,
                    h2: ({ ...props }) => <h2 className="text-xl font-bold my-2" {...props} />,
                    h3: ({ ...props }) => <h3 className="text-lg font-bold my-1" {...props} />,
                    ul: ({ ...props }) => <ul className="list-disc ml-4 my-1" {...props} />,
                    ol: ({ ...props }) => <ol className="list-decimal ml-4 my-1" {...props} />,
                    //li: ({ node, children, ...props }) => <li className="" {...props} />,
                    li: ({ children, ...props }) => {
                        // If children is wrapped in a p tag, get its children instead
                        const content = React.Children.map(children, child => {
                            if (React.isValidElement(child) && child.type === 'p') {
                                return child.props.children;
                            }
                            return child;
                        });
                        return <li className="" {...props}>{content}</li>;
                    },
                    a: ({ ...props }) => (
                        <a className="text-blue-600 hover:text-blue-800 underline" {...props} />
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
