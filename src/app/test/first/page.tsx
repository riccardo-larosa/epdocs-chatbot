// app/first/page.tsx
import QuestionForm from '@/app/test/components/QuestionForm';
import { Suspense } from 'react';

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">
          AI Document Question Answering
        </h1>
        <Suspense fallback={<div>Loading...</div>}>
          <QuestionForm />
        </Suspense>
      </div>
    </main>
  );
}