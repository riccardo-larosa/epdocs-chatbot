import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { OpenAIEmbeddings } from '@langchain/openai'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { requireAdmin } from '@/lib/adminAuth'
import { trackRfpUpload } from '@/lib/crawlConfig'

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    const allowedTypes = ['.md', '.mdx', '.txt']
    const results: { filename: string; chunks: number; error?: string }[] = []

    const client = new MongoClient(process.env.MONGODB_CONNECTION_URI!)
    await client.connect()
    const db = client.db(process.env.MONGODB_DATABASE_NAME!)
    const collectionName = process.env.MONGODB_RFP_COLLECTION_NAME || 'rfp_docs_prod'
    const collection = db.collection(collectionName)

    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY!,
      modelName: 'text-embedding-3-small',
    })

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    })

    for (const file of files) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!allowedTypes.includes(ext)) {
        results.push({ filename: file.name, chunks: 0, error: `Unsupported file type: ${ext}` })
        continue
      }

      try {
        const text = await file.text()

        // Strip frontmatter if present
        let content = text
        if (text.startsWith('---')) {
          const endIdx = text.indexOf('---', 3)
          if (endIdx !== -1) {
            content = text.slice(endIdx + 3).trim()
          }
        }

        const chunks = await textSplitter.splitText(content)

        // Track the upload and get its ID
        const uploadId = await trackRfpUpload({
          filename: file.name,
          originalName: file.name,
          fileSize: file.size,
          chunksCreated: chunks.length,
          uploadedBy: 'admin',
          uploadedAt: new Date().toISOString(),
        })

        // Remove existing docs for this file
        await collection.deleteMany({ 'metadata.source': file.name })

        for (let i = 0; i < chunks.length; i++) {
          const embedding = await embeddings.embedQuery(chunks[i])
          await collection.insertOne({
            pageContent: chunks[i],
            metadata: {
              source: file.name,
              _id: `${file.name}:${i}`,
              id: `${file.name}:${i}`,
              uploadId,
              uploadedAt: new Date().toISOString(),
              chunk: i,
              totalChunks: chunks.length,
            },
            embedding,
          })
        }

        results.push({ filename: file.name, chunks: chunks.length })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        results.push({ filename: file.name, chunks: 0, error: msg })
      }
    }

    await client.close()

    return NextResponse.json({ ok: true, results })
  } catch (err) {
    console.error('[admin/rfp/upload POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
