import { NextResponse } from 'next/server';
import { requireAdminApi, logAdminAction } from '../../../../../../lib/admin.js';

export async function POST(request, { params }) {
  const { id: targetUserId } = await params;
  const result = await requireAdminApi('support_admin');
  if (result.error) {
    return NextResponse.json({ message: result.error.message }, { status: result.error.status });
  }

  const { admin, supabase } = result;
  const body = await request.json();
  const { new_credits, admin_note } = body;

  if (!admin_note?.trim()) {
    return NextResponse.json({ message: 'Admin note is required.' }, { status: 400 });
  }

  if (typeof new_credits !== 'number' || new_credits < 0) {
    return NextResponse.json({ message: 'Invalid credit value.' }, { status: 400 });
  }

  // Get current subscription
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('credits_total, credits_used')
    .eq('user_id', targetUserId)
    .single();

  if (!sub) {
    return NextResponse.json({ message: 'No subscription found.' }, { status: 404 });
  }

  const oldCredits = Math.max(0, (sub.credits_total || 0) - (sub.credits_used || 0));

  // Update credits - set total to new value and reset used to 0
  const { error } = await supabase
    .from('subscriptions')
    .update({ credits_total: new_credits, credits_used: 0 })
    .eq('user_id', targetUserId);

  if (error) {
    return NextResponse.json({ message: 'Failed to update credits.' }, { status: 500 });
  }

  await logAdminAction(supabase, {
    adminUserId: admin.id,
    actionType: 'credit_adjustment',
    targetUserId,
    changes: { old_credits: oldCredits, new_credits },
    adminNote: admin_note,
    request,
  });

  return NextResponse.json({ success: true });
}
