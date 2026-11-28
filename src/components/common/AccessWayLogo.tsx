import React from 'react';

interface AccessWayLogoProps {
  variant?: 'full' | 'compact' | 'icon';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  className?: string;
  onClick?: () => void;
  darkContrast?: boolean;
}

export const AccessWayLogo: React.FC<AccessWayLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
  onClick,
  darkContrast = false,
}) => {
  // Sizing definitions - ensure clear visibility and aspect-ratio preservation
  const sizeClasses = {
    xs: variant === 'icon' ? 'h-6 w-6' : 'h-7',
    sm: variant === 'icon' ? 'h-8 w-8' : 'h-8 sm:h-9',
    md: variant === 'icon' ? 'h-10 w-10' : 'h-10 sm:h-11',
    lg: variant === 'icon' ? 'h-14 w-14' : 'h-14 sm:h-16',
    xl: variant === 'icon' ? 'h-20 w-20' : 'h-20 sm:h-24',
    custom: '',
  };

  if (variant === 'icon') {
    return (
      <div
        onClick={onClick}
        className={`inline-flex items-center justify-center shrink-0 ${sizeClasses[size]} ${className}`}
      >
        <svg
          viewBox="0 0 170 170"
          className="w-full h-full drop-shadow-xs overflow-visible select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="iconOrangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF8500" />
              <stop offset="60%" stopColor="#FF6200" />
              <stop offset="100%" stopColor="#F54900" />
            </linearGradient>

            <linearGradient id="iconBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0072E5" />
              <stop offset="50%" stopColor="#0058C6" />
              <stop offset="100%" stopColor="#003D9E" />
            </linearGradient>

            <linearGradient id="iconGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3BD16F" />
              <stop offset="60%" stopColor="#22B14C" />
              <stop offset="100%" stopColor="#148C36" />
            </linearGradient>
          </defs>

          <g transform="translate(6, 6)">
            {/* Ground Shadow */}
            <ellipse cx="68" cy="148" rx="36" ry="7" fill="#94A3B8" opacity="0.45" />

            {/* Orange Top Dome */}
            <path
              d="M68 12 C30 12, 18 42, 18 72 C18 96, 42 124, 68 148 C94 124, 118 96, 118 72 C118 42, 106 12, 68 12 Z"
              fill="url(#iconOrangeGrad)"
            />

            {/* Green Right Section */}
            <path
              d="M68 12 C88 12, 118 36, 118 72 C118 96, 94 124, 68 148 C72 130, 88 106, 114 74 C116 52, 98 22, 68 12 Z"
              fill="url(#iconGreenGrad)"
            />

            {/* Blue Road */}
            <path
              d="M68 148 C52 130, 22 96, 22 74 C22 56, 32 40, 48 30 C58 38, 86 52, 114 74 C94 124, 76 140, 68 148 Z"
              fill="url(#iconBlueGrad)"
            />

            {/* Road Dashes */}
            <path
              d="M48 98 L50 90 M56 78 L60 70 M68 60 L74 54 M84 46 L92 41"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeDasharray="5 5"
            />

            {/* Wheelchair User */}
            <circle cx="50" cy="40" r="5" fill="#FFFFFF" />
            <path
              d="M50 47 L50 63 L66 63"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M58 63 L68 63 L74 77"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="53" cy="69" r="14" fill="none" stroke="#FFFFFF" strokeWidth="4" />
            <circle cx="53" cy="69" r="2.5" fill="#FFFFFF" />

            {/* Wifi Waves */}
            <g stroke="#0072E5" strokeWidth="4" fill="none" strokeLinecap="round">
              <path d="M106 32 C114 26, 122 26, 128 32" />
              <path d="M108 20 C120 12, 132 12, 142 20" />
              <path d="M110 8 C126 -2, 142 -2, 156 8" />
            </g>
          </g>
        </svg>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center shrink-0 ${sizeClasses[size]} ${className}`}
    >
      <svg
        viewBox="0 0 570 170"
        className="h-full w-auto max-w-full drop-shadow-xs select-none overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="fullOrangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF8500" />
            <stop offset="60%" stopColor="#FF6200" />
            <stop offset="100%" stopColor="#F54900" />
          </linearGradient>

          <linearGradient id="fullBlueRoadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0072E5" />
            <stop offset="50%" stopColor="#0058C6" />
            <stop offset="100%" stopColor="#003D9E" />
          </linearGradient>

          <linearGradient id="fullGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3BD16F" />
            <stop offset="60%" stopColor="#22B14C" />
            <stop offset="100%" stopColor="#148C36" />
          </linearGradient>

          {/* Light Theme Text Gradients */}
          <linearGradient id="fullBlueTextGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0260C4" />
            <stop offset="100%" stopColor="#00458C" />
          </linearGradient>

          <linearGradient id="fullGreenTextGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2BB84E" />
            <stop offset="100%" stopColor="#188C35" />
          </linearGradient>

          {/* Dark-Theme High-Contrast Text Gradients */}
          <linearGradient id="darkBlueTextGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>

          <linearGradient id="darkGreenTextGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4ADE80" />
            <stop offset="100%" stopColor="#16A34A" />
          </linearGradient>
        </defs>

        {/* 1. ICON PIN GROUP */}
        <g transform="translate(10, 8)">
          <ellipse cx="68" cy="148" rx="36" ry="7" fill="#94A3B8" opacity="0.4" />

          {/* Orange Top Pin Section */}
          <path
            d="M68 12 C30 12, 18 42, 18 72 C18 96, 42 124, 68 148 C94 124, 118 96, 118 72 C118 42, 106 12, 68 12 Z"
            fill="url(#fullOrangeGrad)"
          />

          {/* Green Right Crescent */}
          <path
            d="M68 12 C88 12, 118 36, 118 72 C118 96, 94 124, 68 148 C72 130, 88 106, 114 74 C116 52, 98 22, 68 12 Z"
            fill="url(#fullGreenGrad)"
          />

          {/* Blue Roadway */}
          <path
            d="M68 148 C52 130, 22 96, 22 74 C22 56, 32 40, 48 30 C58 38, 86 52, 114 74 C94 124, 76 140, 68 148 Z"
            fill="url(#fullBlueRoadGrad)"
          />

          {/* Road Markings */}
          <path
            d="M48 98 L50 90 M56 78 L60 70 M68 60 L74 54 M84 46 L92 41"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeDasharray="6 6"
          />

          {/* Wheelchair User Figure */}
          <circle cx="50" cy="40" r="5" fill="#FFFFFF" />
          <path
            d="M50 47 L50 63 L66 63"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M58 63 L68 63 L74 77"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="53" cy="69" r="14" fill="none" stroke="#FFFFFF" strokeWidth="4" />
          <circle cx="53" cy="69" r="2.5" fill="#FFFFFF" />

          {/* Blue Wireless / Signal Arcs */}
          <g stroke="#0072E5" strokeWidth="4" fill="none" strokeLinecap="round">
            <path d="M106 32 C114 26, 122 26, 128 32" />
            <path d="M108 20 C120 12, 132 12, 142 20" />
            <path d="M110 8 C126 -2, 142 -2, 156 8" />
          </g>
        </g>

        {/* 2. TYPOGRAPHY "AccessWay" - Combined in single text node for flawless alignment */}
        <g transform="translate(180, 108)">
          <text
            x="0"
            y="0"
            fontFamily="'Playfair Display', Georgia, serif"
            fontSize="84"
            fontWeight="900"
            fontStyle="italic"
            letterSpacing="-1.5"
          >
            {/* Access in Royal Blue */}
            <tspan fill={darkContrast ? "url(#darkBlueTextGrad)" : "url(#fullBlueTextGrad)"} className="dark:fill-[url(#darkBlueTextGrad)]">
              Access
            </tspan>
            {/* Way in Fresh Green */}
            <tspan dx="2" fill={darkContrast ? "url(#darkGreenTextGrad)" : "url(#fullGreenTextGrad)"} className="dark:fill-[url(#darkGreenTextGrad)]">
              Way
            </tspan>
          </text>
        </g>

        {/* 3. SUBTITLE "Sugamya" WITH TAPERED WINGS */}
        {variant !== 'icon' && (
          <g transform="translate(180, 124)">
            {/* Left Orange Tapered Wing */}
            <path d="M2 13 C40 13, 80 11, 115 9 C80 14, 40 16, 2 16 Z" fill="#F95700" />

            {/* "Sugamya" Wordmark in center */}
            <text
              x="126"
              y="18"
              fontFamily="'Playfair Display', Georgia, serif"
              fontSize="32"
              fontWeight="800"
              fill="#F95700"
              letterSpacing="0.5"
            >
              Sugamya
            </text>

            {/* Right Green Tapered Wing */}
            <path d="M268 9 C302 11, 336 13, 370 13 C336 16, 302 14, 268 12 Z" fill="#22B14C" />
          </g>
        )}
      </svg>
    </div>
  );
};

