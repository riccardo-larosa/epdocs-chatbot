import { NextResponse } from 'next/server';
import { testMongoDBConnection } from '@/utils/mongoDbTest';

export async function GET() {
  try {
    const result = await testMongoDBConnection();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}