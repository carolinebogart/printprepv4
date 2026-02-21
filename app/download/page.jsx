import { createServerClient } from '../../lib/supabase/server.js';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function DownloadPage({ searchParams }) {
  const { imageId } = await searchParams;

  if (!imageId) {
    redirect('/');
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?next=/download?imageId=' + imageId);
  }

  // Fetch image
  const { data: image } = await supabase
    .from('images')
    .select('*')
    .eq('id', imageId)
    .eq('user_id', user.id)
    .single();

  if (!image) {
    redirect('/');
  }

  // Fetch outputs
  const { data: outputs } = await supabase
    .from('processed_outputs')
    .select('*')
    .eq('image_id', imageId)
    .order('created_at', { ascending: true });

  const hasOutputs = outputs && outputs.length > 0;

  // Group outputs by ratio
  const groupedOutputs = {};
  if (hasOutputs) {
    for (const output of outputs) {
      const key = output.ratio_key || 'other';
      if (!groupedOutputs[key]) groupedOutputs[key] = [];
      groupedOutputs[key].push(output);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Files Are Ready</h1>
          <p className="text-gray-600 mt-1">
            {hasOutputs
              ? `${outputs.length} file${outputs.length !== 1 ? 's' : ''} generated from ${image.original_filename}`
              : 'No files generated yet'}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/" className="btn-secondary">
            Process Another Image
          </Link>
          {hasOutputs && (
            <a
              href={`/api/download-zip/${imageId}`}
              className="btn-primary"
            >
              Download All as ZIP
            </a>
          )}
        </div>
      </div>

      {!hasOutputs ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No outputs found for this image.</p>
          <Link href="/" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
            Upload a new image
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedOutputs).map(([ratioKey, ratioOutputs]) => (
            <div key={ratioKey}>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 capitalize">
                {ratioKey.replace(/_/g, ' ')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ratioOutputs.map((output) => (
                  <OutputCard key={output.id} output={output} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OutputCard({ output }) {
  const ext = output.format === 'png' ? 'PNG' : 'JPEG';

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4">
        <p className="text-sm font-medium text-gray-900 truncate" title={output.filename}>
          {output.filename}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
            {ext}
          </span>
          {output.size_label && (
            <span className="text-xs text-gray-500">{output.size_label}</span>
          )}
          {output.ratio_key && (
            <span className="text-xs text-gray-400">{output.ratio_key}</span>
          )}
        </div>
        <a
          href={`/api/download/${output.id}`}
          className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Download →
        </a>
      </div>
    </div>
  );
}
