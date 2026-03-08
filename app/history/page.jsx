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
          <a href="/printprep" className="btn-primary">Upload Your First Image</a>
        </div>
      </div>
    );
  }

  const activeImages = images.filter((img) => !img.expired_at);
  const expiredImages = images.filter((img) => img.expired_at);

  // Batch-fetch outputs only for active images (expired ones have no live files)
  const activeImageIds = activeImages.map((img) => img.id);
  let allOutputs = [];
  if (activeImageIds.length > 0) {
    const { data: outputs } = await supabase
      .from('processed_outputs')
      .select('*')
      .in('image_id', activeImageIds)
      .order('created_at', { ascending: true });
    allOutputs = outputs || [];
  }

  // Group outputs by image_id
  const outputsByImage = {};
  allOutputs.forEach((out) => {
    if (!outputsByImage[out.image_id]) outputsByImage[out.image_id] = [];
    outputsByImage[out.image_id].push(out);
  });

  // Signed URLs for active image originals (1h expiry — only for preview in the card)
  const originalUrlMap = {};
  if (activeImages.length > 0) {
    const signedOriginals = await supabase.storage
      .from('printprep-images')
      .createSignedUrls(
        activeImages.map((img) => img.storage_path).filter(Boolean),
        3600
      );
    (signedOriginals.data || []).forEach((item, i) => {
      if (item.signedUrl) originalUrlMap[activeImages[i].id] = item.signedUrl;
    });
  }

  // Signed URLs for thumbnails of expired images (thumbnails persist past expiry)
  const thumbnailUrlMap = {};
  const expiredWithThumb = expiredImages.filter((img) => img.thumbnail_path);
  if (expiredWithThumb.length > 0) {
    const signedThumbs = await supabase.storage
      .from('printprep-images')
      .createSignedUrls(
        expiredWithThumb.map((img) => img.thumbnail_path),
        3600
      );
    (signedThumbs.data || []).forEach((item, i) => {
      if (item.signedUrl) thumbnailUrlMap[expiredWithThumb[i].id] = item.signedUrl;
    });
  }

  // Signed URLs for all active outputs
  const allOutputPaths = allOutputs.map((out) => out.preview_path || out.storage_path);
  let outputUrlMap = {};
  if (allOutputPaths.length > 0) {
    const signedOutputs = await supabase.storage
      .from('printprep-images')
      .createSignedUrls(allOutputPaths, 3600);
    (signedOutputs.data || []).forEach((item, i) => {
      if (item.signedUrl) outputUrlMap[allOutputs[i].id] = item.signedUrl;
    });
  }

  // Batch-fetch mockup outputs for active images
  let allMockups = [];
  if (activeImageIds.length > 0) {
    const { data: mockups } = await supabase
      .from('mockup_outputs')
      .select('id, image_id, storage_path, scene_id, created_at')
      .in('image_id', activeImageIds)
      .order('created_at', { ascending: false });
    allMockups = mockups || [];
  }

  // Signed URLs for mockup outputs
  const allMockupPaths = allMockups.map((m) => m.storage_path);
  let mockupUrlMap = {};
  if (allMockupPaths.length > 0) {
    const signedMockups = await supabase.storage
      .from('printprep-images')
      .createSignedUrls(allMockupPaths, 3600);
    (signedMockups.data || []).forEach((item, i) => {
      if (item.signedUrl) mockupUrlMap[allMockups[i].id] = item.signedUrl;
    });
  }

  // Group mockups by image_id
  const mockupsByImage = {};
  allMockups.forEach((m) => {
    if (!mockupsByImage[m.image_id]) mockupsByImage[m.image_id] = [];
    mockupsByImage[m.image_id].push({ ...m, previewUrl: mockupUrlMap[m.id] || null });
  });

  // Merge everything
  const imagesWithOutputs = images.map((img) => ({
    ...img,
    previewUrl: img.expired_at
      ? (thumbnailUrlMap[img.id] || null)
      : (originalUrlMap[img.id] || null),
    outputs: img.expired_at
      ? [] // no live files
      : (outputsByImage[img.id] || []).map((out) => ({
          ...out,
          previewUrl: outputUrlMap[out.id] || null,
        })),
    mockups: img.expired_at ? [] : (mockupsByImage[img.id] || []),
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Image History</h1>
        <a href="/printprep" className="btn-primary text-sm">Upload New Image</a>
      </div>
      <Suspense fallback={<div className="text-sm text-gray-500 text-center py-8">Loading...</div>}>
        <HistoryGrid images={imagesWithOutputs} />
      </Suspense>
    </div>
  );
}
