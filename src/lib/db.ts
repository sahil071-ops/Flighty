import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Flight } from '@/types';

interface FamilyFlightsDB extends DBSchema {
  flights: {
    key: string;
    value: Flight;
    indexes: {
      'by-member': string;
      'by-departure': string;
    };
  };
  meta: {
    key: string;
    value: { key: string; value: string | number };
  };
}

let db: IDBPDatabase<FamilyFlightsDB> | null = null;

async function getDB(): Promise<IDBPDatabase<FamilyFlightsDB>> {
  if (db) return db;
  db = await openDB<FamilyFlightsDB>('family-flights', 2, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        const flightStore = database.createObjectStore('flights', { keyPath: 'id' });
        flightStore.createIndex('by-member', 'family_member_id');
        flightStore.createIndex('by-departure', 'departure_datetime_utc');
        database.createObjectStore('meta', { keyPath: 'key' });
      }
      if (oldVersion >= 1 && oldVersion < 2) {
        // Remove profiles store — no longer needed after auth removal
        // Cast to any to bypass typed schema for legacy store name
        const db = database as unknown as IDBDatabase;
        if (db.objectStoreNames.contains('profiles')) {
          db.deleteObjectStore('profiles');
        }
      }
    },
  });
  return db;
}

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

export async function clearAllCache(): Promise<void> {
  const database = await getDB();
  await Promise.all([
    database.clear('flights'),
    database.clear('meta'),
  ]);
}
