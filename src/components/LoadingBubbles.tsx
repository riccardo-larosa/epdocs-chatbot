
const LoadingBubbles = () => (

    <div className="bg-gray-100 rounded-lg p-4 max-w-[80%] shadow-md flex gap-2">
        <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
        <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
        <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
    </div>

);

export default LoadingBubbles;