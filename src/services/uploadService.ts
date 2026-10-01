export interface UploadResult {
  success: boolean
  url: string
  key: string
}

async function compressImageIfNeeded(file: File): Promise<File> {
  // If not an image or SVG/GIF, return as is
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file
  }

  // If already under 250KB, return as is
  if (file.size <= 250 * 1024) {
    return file
  }

  return new Promise((resolve) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.src = e.target?.result as string
    }

    img.onload = () => {
      const maxDim = 1200
      let { width, height } = img

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width)
          width = maxDim
        } else {
          width = Math.round((width * maxDim) / height)
          height = maxDim
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file)
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
          })
          resolve(compressedFile)
        },
        'image/jpeg',
        0.82,
      )
    }

    img.onerror = () => resolve(file)
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}

export async function uploadImageToR2(file: File): Promise<UploadResult> {
  const optimizedFile = await compressImageIfNeeded(file)
  const formData = new FormData()
  formData.append('file', optimizedFile)

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
