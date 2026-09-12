import React, { useEffect, useRef } from 'react'
import { Sparkles } from 'lucide-react'

interface AdBannerProps {
  slot?: string
  format?: 'auto' | 'rectangle' | 'horizontal'
  className?: string
  label?: string
}

export const AdBanner: React.FC<AdBannerProps> = ({
  slot = 'default',
  format = 'auto',
  className = '',
  label = 'Sponsored',
}) => {
  const adRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
        ;((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({})
      }
    } catch {
      // Ignored if ads are blocked or already pushed
    }
  }, [])

  return (
    <div className={`my-6 flex flex-col items-center justify-center w-full ${className}`}>
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent p-3 text-center shadow-lg backdrop-blur-sm">
        <div className="mb-2 flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
          <Sparkles className="h-3 w-3 text-violet-400" />
          <span>{label}</span>
        </div>

        {/* Ad Container */}
        <div ref={adRef} className="flex min-h-[90px] w-full items-center justify-center overflow-hidden rounded-xl bg-black/20">
          {/* Google AdSense Responsive Unit */}
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', minHeight: '90px' }}
            data-ad-client="ca-pub-2343866392435128"
            data-ad-slot={slot !== 'default' ? slot : undefined}
            data-ad-format={format}
            data-full-width-responsive="true"
          />
        </div>
      </div>
    </div>
  )
}
