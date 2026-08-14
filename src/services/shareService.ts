export function buildShareUrl(path: string): string {
  const base = window.location.origin
  return `${base}${path}`
}

export interface ShareTarget {
  id: string
  label: string
}

export async function shareEpisode(url: string, title: string): Promise<void> {
  if (navigator.share) {
    try {
      await navigator.share({ title, url })
      return
    } catch {
      // user cancelled or unsupported — fall through to copy
    }
  }
  await navigator.clipboard.writeText(url)
}

export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

export function whatsappUrl(url: string, text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`
}

export function facebookUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
}

export function xUrl(url: string, text: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
}

export function linkedinUrl(url: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
}

export function setPageTitle(title: string): void {
  document.title = title ? `${title} — Inkhel` : 'Inkhel — Competitive Quiz Platform'
}

export function setMetaDescription(description: string): void {
  const el = document.querySelector('meta[name="description"]')
  if (el) el.setAttribute('content', description)
}
