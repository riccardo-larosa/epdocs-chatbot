# EP Docs Chatbot

An AI-powered chatbot that helps users find and understand Elastic Path documentation. Built with Next.js 13, OpenAI GPT-4, and MongoDB Vector Search.

## Features

- 🤖 Natural language interactions with documentation
- 🔍 Semantic search across EP Commerce Cloud (EPCC) and Subscription Management (EPSM) docs
- 🛠️ Built-in tools for API reference and technical content retrieval
- 📊 DataDog integration for LLM observability
- ⚡ Real-time streaming responses
- 🎨 Clean, modern UI with syntax highlighting

## Tech Stack

- **Framework**: Next.js 13 (App Router)
- **Language**: TypeScript
- **AI/LLM**: OpenAI GPT-4
- **Database**: MongoDB Atlas (Vector Search)
- **Styling**: Tailwind CSS
- **Monitoring**: DataDog

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/elasticpath/ep-docs-chatbot.git
cd ep-docs-chatbot
```

2. Install dependencies:

```bash
npm install
```

3. Set up your environment variables:

```bash
cp .env.example .env
```

4. Add your API keys to the `.env` file:

```bash
OPENAI_API_KEY=your_openai_api_key
MONGODB_URI=your_mongodb_connection_string
NEXT_PUBLIC_SITE=EPCC
DD_API_KEY=your_datadog_api_key
```

5. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start chatting!

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key
- `MONGODB_URI`: MongoDB connection string
- `NEXT_PUBLIC_SITE`: Site to search ('EPCC' or 'EPSM')
- `DD_API_KEY`: DataDog API key (optional)

## Updating Documentation Database

To update the chatbot's knowledge base with new documentation:

```bash
# Test database connection
npm run db:test

# Update general documentation 
npm run update-docs

# Update API documentation
npm run update-api-docs
```

For detailed instructions, see [DATABASE_UPDATE_GUIDE.md](DATABASE_UPDATE_GUIDE.md).

## Contributing

1. Create a new branch
2. Make your changes
3. Submit a pull request

## License

[MIT License](LICENSE)
