import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ConvertTool from '@/components/ConvertTool';

export const metadata = {
  title: 'Convert — PrintPrep',
  description: 'Convert images between formats: JPG, PNG, TIFF, WebP, GIF, and PDF. Free for all users.',
};

export default async function ConvertPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?next=/convert');
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Convert</h1>
        <p className="mt-2 text-gray-600">
          Convert images between formats — JPG, PNG, TIFF, WebP, GIF, and PDF.
          Free, no credits required.
        </p>
      </div>
      <ConvertTool />
    </div>
  );
}
