import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createServerClient } from '../../lib/supabase/server.js';
import HistoryGrid from '../../components/HistoryGrid.jsx';

export default async function HistoryPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/history');

  // Fetch images (most recent first, limit 50)
  const { data: images } = await supabase
    .from('images')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!images || images.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Image History</h1>
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">No images yet.</p>
          <a href="/" className="btn-primary">Upload Your First Image</a>
        </div>
      </div>
    );
  }

  // Batch-fetch all outputs for these images (avoid N+1)
  const imageIds = images.map((img) => img.id);
  const { data: allOutputs } = await supabase
    .from('processed_outputs')
    .select('*')
    .in('image_id', imageIds)
    .order('created_at', { ascending: true });

  // Group outputs by image_id
  const outputsByImage = {};
  (allOutputs || []).forEach((out) => {
    if (!outputsByImage[out.image_id]) outputsByImage[out.image_id] = [];
    outputsByImage[out.image_id].push(out);
  });

  // Generate signed URLs for originals
  const signedOriginals = await supabase.storage
    .from('printprep-images')
    .createSignedUrls(
      images.map((img) => img.storage_path),
      3600
    );
  const originalUrlMap = {};
  (signedOriginals.data || []).forEach((item, i) => {
    if (item.signedUrl) originalUrlMap[images[i].id] = item.signedUrl;
  });

  // Generate signed URLs for all outputs
  const allOutputPaths = (allOutputs || []).map((out) => out.storage_path);
  let outputUrlMap = {};
  if (allOutputPaths.length > 0) {
    const signedOutputs = await supabase.storage
      .from('printprep-images')
      .createSignedUrls(allOutputPaths, 3600);
    (signedOutputs.data || []).forEach((item, i) => {
      if (item.signedUrl) outputUrlMap[(allOutputs)[i].id] = item.signedUrl;
    });
  }

  // Merge
  const imagesWithOutputs = images.map((img) => ({
    ...img,
    previewUrl: originalUrlMap[img.id] || null,
    outputs: (outputsByImage[img.id] || []).map((out) => ({
      ...out,
      previewUrl: outputUrlMap[out.id] || null,
    })),
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Image History</h1>
        <a href="/" className="btn-primary text-sm">Upload New Image</a>
      </div>
      <Suspense fallback={<div className="text-sm text-gray-500 text-center py-8">Loading...</div>}>
        <HistoryGrid images={imagesWithOutputs} />
      </Suspense>
    </div>
  );
}
