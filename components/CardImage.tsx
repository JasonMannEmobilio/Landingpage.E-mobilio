import React from 'react';
import { PartnerConfig } from '../lib/types';
import Image from 'next/image';

interface CardImageProps {
  config: PartnerConfig;
  className?: string;
}

export function CardImage({ config, className = '' }: CardImageProps) {
  return (
    <div className={`relative w-full aspect-[400/252] ${className}`}>
      <Image
        src={config.card.image}
        alt={config.card.alt}
        fill
        className="object-contain"
      />
    </div>
  );
}
