import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSteam, faXbox } from '@fortawesome/free-brands-svg-icons';

interface IconProps {
  className?: string;
}

export function SteamIcon({ className }: IconProps) {
  return <FontAwesomeIcon icon={faSteam} className={className} />;
}

export function XboxIcon({ className }: IconProps) {
  return <FontAwesomeIcon icon={faXbox} className={className} />;
}

export function GOGIcon({ className }: IconProps) {
  return (
    <svg 
      className={className}
      fill="currentColor" 
      viewBox="0 0 32 32" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M9.531 20.317h-3.719c-0.291 0-0.531 0.24-0.531 0.537v2.667c0 0.281 0.24 0.531 0.531 0.531h3.735v1.76h-4.667c-0.744 0-1.359-0.615-1.359-1.375v-4.516c0-0.749 0.615-1.359 1.375-1.359h4.635zM10.88 15.385c0 0.776-0.625 1.401-1.401 1.401h-5.973v-1.803h5.041c0.297 0 0.532-0.235 0.532-0.531v-5.932c0-0.297-0.235-0.537-0.532-0.537h-2.692c-0.303-0.005-0.548 0.235-0.548 0.537v2.692c0 0.308 0.24 0.532 0.532 0.532h2.161v1.801h-3.093c-0.771 0-1.401-0.615-1.401-1.385v-4.588c0-0.761 0.631-1.385 1.401-1.385h4.563c0.771 0 1.395 0.624 1.395 1.385v7.812zM28.479 25.812h-1.76v-5.495h-1.24c-0.291 0-0.531 0.24-0.531 0.537v4.957h-1.776v-5.495h-1.24c-0.292 0-0.531 0.24-0.531 0.537v4.957h-1.776v-5.891c0-0.749 0.615-1.359 1.375-1.359h7.479zM28.495 15.385c0 0.776-0.631 1.401-1.401 1.401h-5.973v-1.803h5.041c0.292 0 0.532-0.235 0.532-0.531v-5.932c0-0.297-0.24-0.537-0.532-0.537h-2.708c-0.297 0-0.532 0.24-0.532 0.537v2.692c0 0.308 0.24 0.532 0.532 0.532h2.161v1.801h-3.084c-0.771 0-1.395-0.615-1.395-1.385v-4.588c0-0.761 0.624-1.385 1.395-1.385h4.573c0.776 0 1.401 0.624 1.401 1.385v7.812zM18.292 6.188h-4.584c-0.776 0-1.391 0.624-1.391 1.385v4.588c0 0.771 0.615 1.385 1.391 1.385h4.584c0.76 0 1.391-0.615 1.391-1.385v-4.588c0-0.761-0.631-1.385-1.391-1.385zM17.896 8.521v2.692c0 0.297-0.24 0.532-0.536 0.532h-2.709c-0.291 0-0.531-0.235-0.531-0.532v-2.683c0-0.291 0.229-0.531 0.531-0.531h2.683c0.307 0 0.531 0.24 0.531 0.531zM16.839 18.563h-4.521c-0.755 0-1.369 0.609-1.369 1.359v4.516c0 0.76 0.615 1.375 1.369 1.375h4.521c0.76 0 1.375-0.615 1.375-1.375v-4.516c0-0.749-0.615-1.359-1.375-1.359zM16.437 20.855v2.667c0 0.291-0.235 0.531-0.531 0.531v-0.011h-2.652c-0.296 0-0.536-0.239-0.536-0.536v-2.651c0-0.292 0.24-0.537 0.536-0.537h2.667c0.292 0 0.532 0.245 0.532 0.537zM31.317 1.469c-0.432-0.448-1.031-0.693-1.651-0.699h-27.333c-1.292-0.005-2.339 1.041-2.333 2.333v25.792c-0.005 1.292 1.041 2.339 2.333 2.333h27.333c1.292 0.005 2.339-1.041 2.333-2.333v-25.792c0-0.635-0.265-1.224-0.683-1.651zM31.317 28.896c0.011 0.911-0.733 1.656-1.651 1.651h-27.333c-0.921 0.016-1.672-0.735-1.667-1.651v-25.792c-0.005-0.911 0.74-1.656 1.651-1.651h27.333c0.917 0 1.656 0.74 1.656 1.651v25.792z"/>
    </svg>
  );
}

export function EpicIcon({ className }: IconProps) {
  return (
    <svg 
      className={className}
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 48 48"
      fill="none"
    >
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="M38.5 5.5h-29a2 2 0 0 0-2 2v27.747a2 2 0 0 0 1.128 1.8L24 44.5l15.373-7.453a2 2 0 0 0 1.127-1.8V7.5a2 2 0 0 0-2-2M17.925 38.298h12.15"/>
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" d="M16.512 28h-4V12h4m19 5v-3a2 2 0 0 0-2-2h-1a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3m-16 5V12h3a2 2 0 0 1 2 2v3.967a2 2 0 0 1-2.032 2l-2.968-.065M12.488 20h4m11.024-8v16"/>
    </svg>
  );
}

export function AmazonIcon({ className }: IconProps) {
  return (
    <div className={`${className} font-bold text-center flex items-center justify-center`}>
      A
    </div>
  );
}

// Helper function to get the appropriate icon component for a platform
export function getPlatformIcon(platformName: string, className?: string) {
  switch (platformName) {
    case 'Steam':
      return <SteamIcon className={className} />;
    case 'Xbox':
      return <XboxIcon className={className} />;
    case 'GOG':
      return <GOGIcon className={className} />;
    case 'Epic Games':
      return <EpicIcon className={className} />;
    case 'Amazon Games':
      return <AmazonIcon className={className} />;
    default:
      return null;
  }
}
