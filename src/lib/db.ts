import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Flight, Trip, Hotel, CarRental, TripDocument, MemberDocument, BoardingPass, LoyaltyCard, FlightStatus } from '@/types';

interface FamilyFlightsDB extends DBSchema {
  member_documents: {
    key: string;
    value: MemberDocument;
    indexes: { 'by-member': string; 'by-expiry': string };
  };
  trips: {
    key: string;
    value: Trip;
  };
  flights: {
    key: string;
    value: Flight;
    indexes: {
      'by-member': string;
      'by-departure': string;
      'by-trip': string;
    };
  };
  hotels: {
    key: string;
    value: Hotel;
    indexes: { 'by-trip': string };
  };
  car_rentals: {
    key: string;
    value: CarRental;
    indexes: { 'by-trip': string };
  };
  trip_documents: {
    key: string;
    value: TripDocument;
    indexes: { 'by-trip': string };
  };
  meta: {
    key: string;
    value: { key: string; value: string | number };
  };
  cached_files: {
    key: string; // '{bucket}:{path}'
    value: { key: string; cachedAt: string };
  };
  boarding_passes: {
    key: string;
    value: BoardingPass;
    indexes: { 'by-flight': string };
  };
  loyalty_cards: {
    key: string;
    value: LoyaltyCard;
    indexes: { 'by-member': string };
  };
  flight_statuses: {
    key: string; // '{flightNumber}_{date}'
    value: FlightStatus & { _key: string };
  };
}

let db: IDBPDatabase<FamilyFlightsDB> | null = null;

async function getDB(): Promise<IDBPDatabase<FamilyFlightsDB>> {
  if (db) return db;
  db = await openDB<FamilyFlightsDB>('family-flights', 7, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        const flightStore = database.createObjectStore('flights', { keyPath: 'id' });
        flightStore.createIndex('by-member', 'family_member_id');
        flightStore.createIndex('by-departure', 'departure_datetime_utc');
        database.createObjectStore('meta', { keyPath: 'key' });
      }
      if (oldVersion >= 1 && oldVersion < 2) {
        const raw = database as unknown as IDBDatabase;
        if (raw.objectStoreNames.contains('profiles')) {
          raw.deleteObjectStore('profiles');
        }
      }
      if (oldVersion < 4) {
        if (!database.objectStoreNames.contains('member_documents')) {
          const ds = database.createObjectStore('member_documents', { keyPath: 'id' });
          ds.createIndex('by-member', 'family_member_id');
          ds.createIndex('by-expiry', 'expiry_date');
        }
      }
      if (oldVersion < 3) {
        if (!database.objectStoreNames.contains('trips')) {
          database.createObjectStore('trips', { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains('hotels')) {
          const hs = database.createObjectStore('hotels', { keyPath: 'id' });
          hs.createIndex('by-trip', 'trip_id');
        }
        if (!database.objectStoreNames.contains('trip_documents')) {
          const ds = database.createObjectStore('trip_documents', { keyPath: 'id' });
          ds.createIndex('by-trip', 'trip_id');
        }
        // Add by-trip index to flights if it doesn't exist yet
        if (database.objectStoreNames.contains('flights')) {
          try {
            const raw = database as unknown as IDBDatabase;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const store = (raw as any).transaction.objectStore('flights');
            if (!store.indexNames.contains('by-trip')) {
              store.createIndex('by-trip', 'trip_id');
            }
          } catch {
            // Will be fine — the index just won't exist in offline flight-by-trip lookups
          }
        }
      }
      if (oldVersion < 5) {
        if (!database.objectStoreNames.contains('cached_files')) {
          database.createObjectStore('cached_files', { keyPath: 'key' });
        }
      }
      if (oldVersion < 6) {
        if (!database.objectStoreNames.contains('car_rentals')) {
          const cr = database.createObjectStore('car_rentals', { keyPath: 'id' });
          cr.createIndex('by-trip', 'trip_id');
        }
      }
      if (oldVersion < 7) {
        if (!database.objectStoreNames.contains('boarding_passes')) {
          const bp = database.createObjectStore('boarding_passes', { keyPath: 'id' });
          bp.createIndex('by-flight', 'flight_id');
        }
        if (!database.objectStoreNames.contains('loyalty_cards')) {
          const lc = database.createObjectStore('loyalty_cards', { keyPath: 'id' });
          lc.createIndex('by-member', 'family_member_id');
        }
        if (!database.objectStoreNames.contains('flight_statuses')) {
          database.createObjectStore('flight_statuses', { keyPath: '_key' });
        }
      }
    },
  });
  return db;
}

// ── Trips ──────────────────────────────────────────────────────────────────────

export async function cacheTrips(trips: Trip[]): Promise<void> {
  const database = await getDB();
  const tx = database.transaction('trips', 'readwrite');
  await Promise.all(trips.map(t => tx.store.put(t)));
  await tx.done;
}

export async function getCachedTrips(): Promise<Trip[]> {
  const database = await getDB();
  return database.getAll('trips');
}

export async function getCachedTrip(id: string): Promise<Trip | undefined> {
  const database = await getDB();
  return database.get('trips', id);
}

export async function deleteCachedTrip(id: string): Promise<void> {
  const database = await getDB();
  await database.delete('trips', id);
}

// ── Flights ────────────────────────────────────────────────────────────────────

export async function cacheFlights(flights: Flight[]): Promise<void> {
  const database = await getDB();
  const tx = database.transaction('flights', 'readwrite');
  await Promise.all(flights.map(f => tx.store.put(f)));
  await tx.done;
}

export async function getCachedFlights(): Promise<Flight[]> {
  const database = await getDB();
  return database.getAll('flights');
}

export async function getCachedFlight(id: string): Promise<Flight | undefined> {
  const database = await getDB();
  return database.get('flights', id);
}

export async function deleteCachedFlight(id: string): Promise<void> {
  const database = await getDB();
  await database.delete('flights', id);
}

// ── Hotels ─────────────────────────────────────────────────────────────────────

export async function cacheHotels(hotels: Hotel[]): Promise<void> {
  const database = await getDB();
  const tx = database.transaction('hotels', 'readwrite');
  await Promise.all(hotels.map(h => tx.store.put(h)));
  await tx.done;
}

export async function getCachedHotels(): Promise<Hotel[]> {
  const database = await getDB();
  return database.getAll('hotels');
}

export async function getCachedHotel(id: string): Promise<Hotel | undefined> {
  const database = await getDB();
  return database.get('hotels', id);
}

// ── Car Rentals ────────────────────────────────────────────────────────────────

export async function cacheCarRentals(rentals: CarRental[]): Promise<void> {
  const database = await getDB();
  const tx = database.transaction('car_rentals', 'readwrite');
  await Promise.all(rentals.map(r => tx.store.put(r)));
  await tx.done;
}

export async function getCachedCarRentals(): Promise<CarRental[]> {
  const database = await getDB();
  return database.getAll('car_rentals');
}

export async function getCachedCarRental(id: string): Promise<CarRental | undefined> {
  const database = await getDB();
  return database.get('car_rentals', id);
}

// ── Trip Documents ─────────────────────────────────────────────────────────────

export async function cacheTripDocuments(docs: TripDocument[]): Promise<void> {
  const database = await getDB();
  const tx = database.transaction('trip_documents', 'readwrite');
  await Promise.all(docs.map(d => tx.store.put(d)));
  await tx.done;
}

export async function getCachedTripDocuments(): Promise<TripDocument[]> {
  const database = await getDB();
  return database.getAll('trip_documents');
}

// ── Member Documents ───────────────────────────────────────────────────────────

export async function cacheMemberDocuments(docs: MemberDocument[]): Promise<void> {
  const database = await getDB();
  const tx = database.transaction('member_documents', 'readwrite');
  await Promise.all(docs.map(d => tx.store.put(d)));
  await tx.done;
}

export async function getCachedMemberDocuments(): Promise<MemberDocument[]> {
  const database = await getDB();
  return database.getAll('member_documents');
}

export async function getCachedMemberDocument(id: string): Promise<MemberDocument | undefined> {
  const database = await getDB();
  return database.get('member_documents', id);
}

export async function deleteCachedMemberDocument(id: string): Promise<void> {
  const database = await getDB();
  await database.delete('member_documents', id);
}

// ── File cache manifest ─────────────────────────────────────────────────────────
// Tracks which files have been downloaded to the Cache API.
// Key format: '{bucket}:{path}'

export function fileCacheManifestKey(bucket: string, path: string): string {
  return `${bucket}:${path}`;
}

export async function markFileCached(bucket: string, path: string): Promise<void> {
  try {
    const database = await getDB();
    const key = fileCacheManifestKey(bucket, path);
    await database.put('cached_files', { key, cachedAt: new Date().toISOString() });
  } catch {
    // Non-critical — manifest is a hint, not ground truth
  }
}

export async function isFileManifested(bucket: string, path: string): Promise<boolean> {
  try {
    const database = await getDB();
    return !!(await database.get('cached_files', fileCacheManifestKey(bucket, path)));
  } catch {
    return false;
  }
}

export async function getAllManifestedKeys(): Promise<string[]> {
  try {
    const database = await getDB();
    const all = await database.getAll('cached_files');
    return all.map(r => r.key);
  } catch {
    return [];
  }
}

// ── Boarding Passes ────────────────────────────────────────────────────────────

export async function cacheBoardingPasses(passes: BoardingPass[]): Promise<void> {
  const database = await getDB();
  const tx = database.transaction('boarding_passes', 'readwrite');
  await Promise.all(passes.map(p => tx.store.put(p)));
  await tx.done;
}

export async function getCachedBoardingPassForFlight(flightId: string): Promise<BoardingPass | undefined> {
  const database = await getDB();
  const all = await database.getAllFromIndex('boarding_passes', 'by-flight', flightId);
  return all[0];
}

export async function deleteCachedBoardingPass(id: string): Promise<void> {
  const database = await getDB();
  await database.delete('boarding_passes', id);
}

// ── Loyalty Cards ──────────────────────────────────────────────────────────────

export async function cacheLoyaltyCards(cards: LoyaltyCard[]): Promise<void> {
  const database = await getDB();
  const tx = database.transaction('loyalty_cards', 'readwrite');
  await Promise.all(cards.map(c => tx.store.put(c)));
  await tx.done;
}

export async function getCachedLoyaltyCardsForMember(memberId: string): Promise<LoyaltyCard[]> {
  const database = await getDB();
  return database.getAllFromIndex('loyalty_cards', 'by-member', memberId);
}

export async function getCachedAllLoyaltyCards(): Promise<LoyaltyCard[]> {
  const database = await getDB();
  return database.getAll('loyalty_cards');
}

export async function deleteCachedLoyaltyCard(id: string): Promise<void> {
  const database = await getDB();
  await database.delete('loyalty_cards', id);
}

// ── Flight Status Cache ────────────────────────────────────────────────────────

export async function cacheFlightStatus(status: FlightStatus): Promise<void> {
  const database = await getDB();
  const key = `${status.flight_number}_${status.date}`;
  await database.put('flight_statuses', { ...status, _key: key });
}

export async function getCachedFlightStatus(flightNumber: string, date: string): Promise<FlightStatus | undefined> {
  const database = await getDB();
  const key = `${flightNumber}_${date}`;
  const record = await database.get('flight_statuses', key);
  if (!record) return undefined;
  const { _key, ...status } = record;
  return status as FlightStatus;
}

// ── Clear all ──────────────────────────────────────────────────────────────────

export async function clearAllCache(): Promise<void> {
  const database = await getDB();
  await Promise.all([
    database.clear('member_documents'),
    database.clear('trips'),
    database.clear('flights'),
    database.clear('hotels'),
    database.clear('car_rentals'),
    database.clear('trip_documents'),
    database.clear('meta'),
    database.clear('cached_files'),
    database.clear('boarding_passes'),
    database.clear('loyalty_cards'),
    database.clear('flight_statuses'),
  ]);
}
