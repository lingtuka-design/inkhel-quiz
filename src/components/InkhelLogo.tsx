import React from 'react'

export function InkhelLogoIcon({ className = 'w-6 h-6', ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Head Circle */}
      <circle
        cx="51"
        cy="22"
        r="11.5"
        stroke="white"
        strokeWidth="9"
        fill="none"
      />
      {/* Dynamic Runner Torso */}
      <path
        d="M51 36 L36 47 L46 51.5 L46 66 L52 90 L61 28 Z"
        stroke="white"
        strokeWidth="9"
        strokeLinejoin="miter"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
