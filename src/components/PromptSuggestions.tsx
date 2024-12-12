
const PromptSuggestions = ({ onPromptClick }: { onPromptClick: (prompt: string) => void }) => {
    let prompts = [];
    if (process.env.NEXT_PUBLIC_SITE?.includes('EPSM')) {
        prompts = [
            "What is included in version 8.6?",
            "What is Extension Point Framework and why would I use it?",
            "How do I add an item to the cart using cortex?",
        ];
    } else {
        prompts = [
            "What is PXM?",
            "Explain the difference between Node and Hierarchy",
            "Provide an example of where to use a custom API",
            "How do I build a promotion for 20% off when the cart total is $100 using rule promotions?",
            "How can I add a custom attribute to a product?",
            "How do I create a product via the API?",
            "How do I create an account and account membership via the API?",
        ];
    }

    return (
        <div className="mb-8">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Suggested Prompts</p>
            <div className="flex flex-col gap-2">
                {prompts.map((prompt, index) => (
                    <button
                        key={index}
                        onClick={() => onPromptClick(prompt)}
                        className="text-left px-4 py-2 rounded-full border border-slate-600 hover:border-slate-900 hover:bg-grey-100 text-sm"
                    >
                        {prompt}
                    </button>
                ))}
            </div>
        </div>
    )
}

export default PromptSuggestions;