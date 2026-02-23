import { redirect } from 'next/navigation';

// Download page is now merged into the history page.
// Redirect any old bookmarks/links to history with the image highlighted.
export default async function DownloadPage({ searchParams }) {
  const { imageId } = await searchParams;

  if (imageId) {
    redirect(`/history?new=${imageId}`);
  }

  redirect('/history');
}
