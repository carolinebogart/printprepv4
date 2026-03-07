import { requireAdmin } from '../../../lib/admin.js';
import { createServiceClient } from '../../../lib/supabase/service.js';
import MockupAdminClient from './MockupAdminClient.jsx';

export default async function MockupsAdminPage() {
  await requireAdmin('support_admin');
  const service = createServiceClient();

  const [{ data: scenes }, { data: frames }] = await Promise.all([
    service.from('mockup_scenes').select('*').order('created_at', { ascending: false }),
    service.from('mockup_frames').select('*').order('created_at', { ascending: false }),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mockup Library</h1>
      <MockupAdminClient scenes={scenes ?? []} frames={frames ?? []} />
    </div>
  );
}
