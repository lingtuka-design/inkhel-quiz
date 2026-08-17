import React from 'react'

export function InkhelLogoIcon({ className = 'w-10 h-10', ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <linearGradient id="inkhelGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      {/* Gradient Rounded Square Container */}
      <rect width="100" height="100" rx="26" fill="url(#inkhelGrad)" />
      
      {/* White Logo Runner Figure */}
      {/* Head Circle */}
      <circle
        cx="51.5"
        cy="26"
        r="11.5"
        stroke="white"
        strokeWidth="6.5"
        fill="none"
      />
      {/* Dynamic Runner Body */}
      <path
        d="M51.5 38.5 L38 48 L46.5 52 L46.5 65.5 L51.5 87 L60.5 29 Z"
        stroke="white"
        strokeWidth="6.5"
        strokeLinejoin="miter"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
