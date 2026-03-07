import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRatiosForOrientation, PORTRAIT_RATIOS, LANDSCAPE_RATIOS } from '@/lib/output-sizes';
import CropTool from '@/components/CropTool';

export const dynamic = 'force-dynamic';

function buildRatioList(ratiosObj) {
  return Object.entries(ratiosObj).map(([key, val]) => ({
    key,
    name: val.name,
    ratio: val.ratio,
    sizes: val.sizes.map((s, i, arr) => ({ ...s, selected: i === arr.length - 1 })),
  }));
}

export default async function CropPage({ searchParams }) {
  const { imageId } = await searchParams;
  if (!imageId) redirect('/');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/crop');

  // Fetch image record
  const { data: image, error } = await supabase
    .from('images')
    .select('*')
    .eq('id', imageId)
    .eq('user_id', user.id)
    .single();

  if (error || !image) redirect('/');

  // Get signed URL for the image
  const { data: signedUrlData } = await supabase.storage
    .from('printprep-images')
    .createSignedUrl(image.storage_path, 3600); // 1 hour

  if (!signedUrlData?.signedUrl) redirect('/');

  // Build both ratio lists
  const portraitRatios = buildRatioList(PORTRAIT_RATIOS);
  const landscapeRatios = buildRatioList(LANDSCAPE_RATIOS);

  return (
    <div className="h-[calc(100vh-8rem)] my-4">
      <CropTool
        imageId={image.id}
        imageUrl={signedUrlData.signedUrl}
        originalFilename={image.original_filename}
        originalWidth={image.width}
        originalHeight={image.height}
        originalRatio={image.aspect_ratio}
        orientation={image.orientation}
        portraitRatios={portraitRatios}
        landscapeRatios={landscapeRatios}
      />
    </div>
  );
}
