
const PromptSuggestions = ({ onPromptClick }: { onPromptClick: (prompt: string) => void }) => {
    let prompts = [];
    if (process.env.NEXT_PUBLIC_SITE?.includes('EPSM')) {
        prompts = [
            "What is included in version 8.6?",
            
        ];
    } else {
        prompts = [
            "What is PXM?",
            "Explain the difference between Node and Hierarchy",
            "Give me an example on where to use custom api",
            "How do I build a promotion for 20% when cart total is $100 using rule promotion",
            "How can I add a custom attribute to a product?",
        ];
    }

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