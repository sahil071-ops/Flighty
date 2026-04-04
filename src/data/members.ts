export interface Member {
  id: string;
  name: string;
  colour: string;
  isApprover?: boolean; // only the designated trip approver (Sahil) sees the Requests tab
}

export const FAMILY_MEMBERS: Member[] = [
  { id: 'sahil',    name: 'Sahil',    colour: '#0ea5e9', isApprover: true },
  { id: 'manmayee', name: 'Manmayee', colour: '#10b981' },
  { id: 'kanderp',  name: 'Kanderp',  colour: '#8b5cf6' },
  { id: 'tehmina',  name: 'Tehmina',  colour: '#f59e0b' },
  { id: 'nirali',   name: 'Nirali',   colour: '#ec4899' },
  { id: 'alfonso',  name: 'Alfonso',  colour: '#ef4444' },
];

export function getMember(id: string): Member | undefined {
  return FAMILY_MEMBERS.find(m => m.id === id);
}
