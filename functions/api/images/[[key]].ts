interface Env {
  BUCKET: R2Bucket
}

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
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

    if (!headers.get('Content-Type')) {
      if (key.endsWith('.png')) headers.set('Content-Type', 'image/png')
      else if (key.endsWith('.webp')) headers.set('Content-Type', 'image/webp')
      else if (key.endsWith('.gif')) headers.set('Content-Type', 'image/gif')
      else if (key.endsWith('.svg')) headers.set('Content-Type', 'image/svg+xml')
      else headers.set('Content-Type', 'image/jpeg')
    }

    return new Response(object.body, {
      status: 200,
      headers,
    })
  } catch (err: any) {
    return new Response(err.message || 'Error fetching image', { status: 500 })
  }
}
