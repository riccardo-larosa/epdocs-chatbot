import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { listRfpUploads, deleteRfpUpload } from '@/lib/crawlConfig'

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const uploads = await listRfpUploads()
    return NextResponse.json({ uploads })
  } catch (err) {
    console.error('[admin/rfp/documents GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = await request.json()
    const { id } = body ?? {}

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const deleted = await deleteRfpUpload(id)
    if (!deleted) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, message: 'Upload and associated documents deleted' })
  } catch (err) {
    console.error('[admin/rfp/documents DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
