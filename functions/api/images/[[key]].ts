interface Env {
  BUCKET: R2Bucket
}

export const onRequest: PagesFunction<Env> = async ({ request, params, env }) => {
  try {
    if (!env.BUCKET) {
      return new Response('R2 bucket binding not found', { status: 500 })
    }

    const keyParam = params.key
    const key = Array.isArray(keyParam) ? keyParam.join('/') : (keyParam as string)

    if (!key) {
      return new Response('Image key required', { status: 400 })
    }

    const object = await env.BUCKET.get(key)
    if (!object) {
      return new Response('Image not found', { status: 404 })
    }

    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Content-Length', String(object.size))

    let mimeType = headers.get('Content-Type')
    if (!mimeType) {
      if (key.endsWith('.png')) mimeType = 'image/png'
      else if (key.endsWith('.webp')) mimeType = 'image/webp'
      else if (key.endsWith('.gif')) mimeType = 'image/gif'
      else if (key.endsWith('.svg')) mimeType = 'image/svg+xml'
      else mimeType = 'image/jpeg'
      headers.set('Content-Type', mimeType)
    }

    if (request.method === 'HEAD') {
      return new Response(null, {
        status: 200,
        headers,
      })
    }

    return new Response(object.body, {
      status: 200,
      headers,
    })
  } catch (err: any) {
    return new Response(err.message || 'Error fetching image', { status: 500 })
  }
}

export const onRequestGet = onRequest
export const onRequestHead = onRequest
