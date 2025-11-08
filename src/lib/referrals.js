import { supabase } from './supabaseClient';

export async function getMyReferralStats(wallet) {
  const addr = wallet?.toLowerCase();
  if (!addr) return { list: [], count: 0 };
  const { data, error } = await supabase
    .from('cbp_referrals')
    .select('referee_address, created_at')
    .eq('referrer_address', addr)
    .order('created_at', { ascending: false });
  return { list: data || [], count: (data || []).length, error };
}
