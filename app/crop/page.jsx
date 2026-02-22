import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRatiosForOrientation } from '@/lib/output-sizes';
import CropTool from '@/components/CropTool';

export const dynamic = 'force-dynamic';

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

  // Get available ratios
  const ratios = getRatiosForOrientation(image.orientation);
  const ratioList = Object.entries(ratios).map(([key, val]) => ({
    key,
    name: val.name,
    ratio: val.ratio,
    sizes: val.sizes.map((s, i, arr) => ({ ...s, selected: i === arr.length - 1 })),
  }));

  return (
    <div className="h-[calc(100vh-4rem)]">
      <CropTool
        imageId={image.id}
        imageUrl={signedUrlData.signedUrl}
        originalWidth={image.width}
        originalHeight={image.height}
        originalRatio={image.aspect_ratio}
        orientation={image.orientation}
        ratios={ratioList}
      />
    </div>
  );
}
