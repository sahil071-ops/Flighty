import { useState, useRef } from 'react';

interface AvatarProps {
  name: string;
  colour: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  memberId?: string;       // if provided, shows/saves profile photo
  editable?: boolean;      // if true, shows camera icon on hover for photo change
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[9px] font-bold',
  sm: 'w-7 h-7 text-[10px] font-bold',
  md: 'w-9 h-9 text-xs font-bold',
  lg: 'w-12 h-12 text-sm font-bold',
  xl: 'w-16 h-16 text-lg font-bold',
};

function photoKey(memberId: string) {
  return `ff_photo_${memberId}`;
}

export function getStoredPhoto(memberId: string): string | null {
  return localStorage.getItem(photoKey(memberId));
}

export function Avatar({ name, colour, size = 'md', className = '', memberId, editable = false }: AvatarProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const [photo, setPhoto] = useState<string | null>(
    memberId ? getStoredPhoto(memberId) : null
  );
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !memberId) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      localStorage.setItem(photoKey(memberId), dataUrl);
      setPhoto(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  const base = (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center tracking-tight text-white flex-shrink-0 overflow-hidden relative ${className}`}
      style={{ backgroundColor: photo ? undefined : colour }}
      aria-label={name}
    >
      {photo ? (
        <img src={photo} alt={name} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
      {editable && (
        <div
          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer rounded-full"
          onClick={() => inputRef.current?.click()}
        >
          <svg className="w-1/3 h-1/3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      )}
    </div>
  );

  if (!editable) return base;

  return (
    <>
      {base}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}
