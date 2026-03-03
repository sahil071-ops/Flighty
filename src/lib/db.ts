import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Flight, Profile } from '@/types';

interface FamilyFlightsDB extends DBSchema {
  flights: {
    key: string;
    value: Flight;
    indexes: {
      'by-group': string;
      'by-member': string;
      'by-departure': string;
    };
  };
  profiles: {
    key: string;
    value: Profile;
    indexes: { 'by-group': string };
  };
  meta: {
    key: string;
    value: { key: string; value: string | number };
  };
}

let db: IDBPDatabase<FamilyFlightsDB> | null = null;

async function getDB(): Promise<IDBPDatabase<FamilyFlightsDB>> {
  if (db) return db;
  db = await openDB<FamilyFlightsDB>('family-flights', 1, {
    upgrade(database) {
      const flightStore = database.createObjectStore('flights', { keyPath: 'id' });
      flightStore.createIndex('by-group', 'group_id');
      flightStore.createIndex('by-member', 'family_member_id');
      flightStore.createIndex('by-departure', 'departure_datetime_utc');

      const profileStore = database.createObjectStore('profiles', { keyPath: 'id' });
      profileStore.createIndex('by-group', 'group_id');

      database.createObjectStore('meta', { keyPath: 'key' });
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

export async function cacheProfiles(profiles: Profile[]): Promise<void> {
  const database = await getDB();
  const tx = database.transaction('profiles', 'readwrite');
  await Promise.all(profiles.map(p => tx.store.put(p)));
  await tx.done;
}

export async function getCachedProfiles(): Promise<Profile[]> {
  const database = await getDB();
  return database.getAll('profiles');
}

export async function clearAllCache(): Promise<void> {
  const database = await getDB();
  await Promise.all([
    database.clear('flights'),
    database.clear('profiles'),
    database.clear('meta'),
  ]);
}
