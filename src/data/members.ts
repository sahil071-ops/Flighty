export interface Member {
  id: string;
  name: string;
  colour: string;
  isAdmin: boolean;
}

export const FAMILY_MEMBERS: Member[] = [
  { id: 'sahil',    name: 'Sahil',    colour: '#0ea5e9', isAdmin: false },
  { id: 'manmayee', name: 'Manmayee', colour: '#10b981', isAdmin: false },
  { id: 'kanderp',  name: 'Kanderp',  colour: '#8b5cf6', isAdmin: false },
  { id: 'tehmina',  name: 'Tehmina',  colour: '#f59e0b', isAdmin: false },
  { id: 'nirali',   name: 'Nirali',   colour: '#ec4899', isAdmin: false },
  { id: 'alfonso',  name: 'Alfonso',  colour: '#ef4444', isAdmin: false },
  { id: 'admin',    name: 'Admin',    colour: '#64748b', isAdmin: true  },
];

export function getMember(id: string): Member | undefined {
  return FAMILY_MEMBERS.find(m => m.id === id);
}
