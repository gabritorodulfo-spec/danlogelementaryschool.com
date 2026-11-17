import { useState } from 'react';
import { Compass } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  title?: string;
  className?: string;
  containerClassName?: string;
}

export function ResilientImage({
  src,
  alt,
  title,
  className = 'w-full h-full object-cover',
  containerClassName = '',
}: ResilientImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#EAEDF1] border border-[#DCE0E6] text-[#525866] p-6 text-center ${containerClassName}`}
        role="img"
        aria-label={alt}
      >
        <Compass className="w-6 h-6 mb-2 text-[#1D4ED8]" strokeWidth={1.5} />
        <p className="text-sm font-medium text-[#111315]">{title || alt}</p>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
