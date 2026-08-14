export interface UploadResult {
  success: boolean
  url: string
  key: string
}

export async function uploadImageToR2(file: File): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('file', file)

  const token = localStorage.getItem('inkhel_admin_token')
  const headers: Record<string, string> = {}
  if (token) {
    headers['X-Admin-Token'] = token
  }

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to upload image to R2')
  }

  return res.json()
}
