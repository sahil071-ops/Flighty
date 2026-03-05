import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useOffline } from '@/context/OfflineContext';
import { supabase } from '@/lib/supabase';
import { FAMILY_MEMBERS } from '@/data/members';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { HotelForm } from '@/components/hotels/HotelForm';
import type { HotelFormData } from '@/types';

export function AddHotelPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { currentMember } = useApp();
  const { isOnline } = useOffline();

  if (!isOnline) {
    return (
      <Layout title="Add hotel" hideNav>
        <div className="px-4 py-8 text-center">
          <p className="text-slate-400">You're offline. Adding hotels requires a connection.</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate(-1)}>Go back</Button>
        </div>
      </Layout>
    );
  }

  async function handleSubmit(data: HotelFormData, voucherFile?: File) {
    const { data: inserted, error } = await supabase
      .from('hotels')
      .insert({ ...data, trip_id: tripId })
      .select()
      .single();

    if (error) throw new Error(error.message);

    if (voucherFile && inserted) {
      const ext = voucherFile.name.split('.').pop() ?? 'jpg';
      const path = `vouchers/${tripId}/${inserted.id}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('vouchers')
        .upload(path, voucherFile, { upsert: true });
      if (!uploadErr) {
        await supabase.from('hotels').update({ voucher_url: path }).eq('id', inserted.id);
      }
    }

    navigate(`/trips/${tripId}`);
  }

  return (
    <Layout
      title="Add hotel"
      hideNav
      headerRight={
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white p-2 -mr-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      }
    >
      <div className="px-4 py-4">
        <HotelForm
          members={FAMILY_MEMBERS.filter(m => m.id !== 'admin')}
          currentUserId={currentMember?.id ?? ''}
          onSubmit={handleSubmit}
          submitLabel="Save hotel"
        />
      </div>
    </Layout>
  );
}
