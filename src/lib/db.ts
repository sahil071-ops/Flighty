import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Flight, Trip, Hotel, TripDocument } from '@/types';

interface FamilyFlightsDB extends DBSchema {
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
  trip_documents: {
    key: string;
    value: TripDocument;
    indexes: { 'by-trip': string };
  };
  meta: {
    key: string;
    value: { key: string; value: string | number };
  };
}

let db: IDBPDatabase<FamilyFlightsDB> | null = null;

async function getDB(): Promise<IDBPDatabase<FamilyFlightsDB>> {
  if (db) return db;
  db = await openDB<FamilyFlightsDB>('family-flights', 3, {
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
            // Access upgrade transaction via the db's transaction list
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

// ── Clear all ──────────────────────────────────────────────────────────────────

export async function clearAllCache(): Promise<void> {
  const database = await getDB();
  await Promise.all([
    database.clear('trips'),
    database.clear('flights'),
    database.clear('hotels'),
    database.clear('trip_documents'),
    database.clear('meta'),
  ]);
}
