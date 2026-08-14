interface Env {
  BUCKET: R2Bucket
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    if (!env.BUCKET) {
      return new Response(JSON.stringify({ error: 'R2 bucket binding (BUCKET) not found' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const contentType = request.headers.get('content-type') || ''
    let fileBuffer: ArrayBuffer
    let mimeType = 'image/jpeg'
    let extension = 'jpg'

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      if (!file) {
        return new Response(JSON.stringify({ error: 'No file provided in form data' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      fileBuffer = await file.arrayBuffer()
      mimeType = file.type || 'image/jpeg'
      const extMatch = file.name.split('.').pop()
      if (extMatch) extension = extMatch.toLowerCase()
    } else {
      fileBuffer = await request.arrayBuffer()
      mimeType = contentType || 'image/jpeg'
      if (mimeType.includes('png')) extension = 'png'
      else if (mimeType.includes('webp')) extension = 'webp'
      else if (mimeType.includes('gif')) extension = 'gif'
      else if (mimeType.includes('svg')) extension = 'svg'
    }

    if (fileBuffer.byteLength === 0) {
      return new Response(JSON.stringify({ error: 'File is empty' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Limit to 10MB
    if (fileBuffer.byteLength > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'File size exceeds 10MB limit' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const randomStr = Math.random().toString(36).substring(2, 10)
    const key = `img_${Date.now()}_${randomStr}.${extension}`

    await env.BUCKET.put(key, fileBuffer, {
      httpMetadata: {
        contentType: mimeType,
      },
    })

    const url = `/api/images/${key}`
    return new Response(
      JSON.stringify({
        success: true,
        key,
        url,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Upload failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
