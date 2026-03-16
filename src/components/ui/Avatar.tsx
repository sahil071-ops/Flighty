interface AvatarProps {
  name: string;
  colour: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[9px] font-bold',
  sm: 'w-7 h-7 text-[10px] font-bold',
  md: 'w-9 h-9 text-xs font-bold',
  lg: 'w-12 h-12 text-sm font-bold',
  xl: 'w-16 h-16 text-lg font-bold',
};

export function Avatar({ name, colour, size = 'md', className = '' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center tracking-tight text-white flex-shrink-0 ${className}`}
      style={{ backgroundColor: colour }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
