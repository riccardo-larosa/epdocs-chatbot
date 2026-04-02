'use client'

import { usePathname } from 'next/navigation'

const PromptSuggestions = ({ onPromptClick }: { onPromptClick: (prompt: string) => void }) => {
    const pathname = usePathname()
    let prompts = [];
    
    // Check if we're on the RFP page
    const isRfpPage = pathname?.includes('/rfp');
    
    if (isRfpPage) {
        prompts = [
            "What are Elastic Path's pricing options and licensing models?",
            "What is the implementation timeline for Elastic Path Commerce Cloud?",
            "What security certifications and compliance standards does Elastic Path meet?",
            "How does Elastic Path handle high-volume traffic and scalability?",
            "What integration capabilities does Elastic Path offer with third-party systems?",
            "What support and maintenance services are included?",
            "What are the key differentiators of Elastic Path's composable commerce platform?",
            "How does Elastic Path handle B2B and B2C commerce requirements?"
        ];
    } else if (process.env.NEXT_PUBLIC_SITE?.includes('EPSM')) {
        prompts = [
            "What is included in version 8.6?",
            "What is Extension Point Framework and why would I use it?",
            "How do I add an item to the cart using cortex?",
            "How do I create a new Commerce Manager user?",
            "What authentication methods are supported by Cortex?"
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