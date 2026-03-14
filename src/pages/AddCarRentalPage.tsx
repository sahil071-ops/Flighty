import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useOffline } from '@/context/OfflineContext';
import { supabase } from '@/lib/supabase';
import { FAMILY_MEMBERS } from '@/data/members';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { CarRentalForm } from '@/components/cars/CarRentalForm';
import type { CarRentalFormData } from '@/types';

export function AddCarRentalPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { currentMember } = useApp();
  const { isOnline } = useOffline();

  if (!isOnline) {
    return (
      <Layout title="Add car rental" hideNav>
        <div className="px-4 py-8 text-center">
          <p className="text-slate-400">You're offline. Adding car rentals requires a connection.</p>
          <Button variant="ghost" className="mt-4" onClick={() => navigate(-1)}>Go back</Button>
        </div>
      </Layout>
    );
  }

  async function handleSubmit(data: CarRentalFormData, voucherFile?: File) {
    // Postgres rejects "" for time/date columns — convert all empty strings to null
    const payload = Object.fromEntries(
      Object.entries({ ...data, trip_id: tripId }).map(([k, v]) => [k, v === '' ? null : v])
    );
    const { data: inserted, error } = await supabase
      .from('car_rentals')
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(error.message);

    if (voucherFile && inserted) {
      const ext = voucherFile.name.split('.').pop() ?? 'jpg';
      const path = `car-rentals/${tripId}/${inserted.id}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('vouchers')
        .upload(path, voucherFile, { upsert: true });
      if (!uploadErr) {
        await supabase.from('car_rentals').update({ voucher_url: path }).eq('id', inserted.id);
      }
    }

    navigate(`/trips/${tripId}`);
  }

  return (
    <Layout
      title="Add car rental"
      hideNav
      headerRight={
        <button
          onClick={() => navigate(-1)}
          className="text-slate-400 hover:text-white p-3 -mr-3 flex items-center justify-center"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      }
    >
      <div className="px-4 py-4">
        <CarRentalForm
          members={FAMILY_MEMBERS}
          currentUserId={currentMember?.id ?? ''}
          onSubmit={handleSubmit}
          submitLabel="Save car rental"
        />
      </div>
    </Layout>
  );
}
