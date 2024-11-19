
const PromptSuggestions = ({ onPromptClick }: { onPromptClick: (prompt: string) => void }) => {
    const prompts = [
        "What is PXM?",
        "Explain the difference between Node and Hierarchy",
        "What tools or frameworks can I integrate with MongoDB?",
        "Show examples of how to use vector search in MongoDB",
        "Where can I find MongoDB-related forums and communities?",
    ];

    return (
        <div className="mb-8">
            <p className="text-sm text-gray-600 mb-3">Suggested Prompts</p>
            <div className="flex flex-col gap-2">
                {prompts.map((prompt, index) => (
                    <button
                        key={index}
                        onClick={() => onPromptClick(prompt)}
                        className="text-left px-4 py-2 rounded-full border border-blue-200 hover:border-blue-800 hover:bg-grey-100 text-sm"
                    >
                        {prompt}
                    </button>
                ))}
            </div>
        </div>
    )
}

export default PromptSuggestions;