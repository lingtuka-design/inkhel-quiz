const ONESIGNAL_APP_ID = '656af57b-8a86-471a-a8d3-5dd3d5406dc7'
const FALLBACK_KEY_B64 = 'b3NfdjJfYXBwX212dnBrNjRrcXpkcnZrZ3RseGo1a3Fkbnk1bzZ0bXprMjVuZXJibWltZzNrdHZiZDRmdmViYms3M3RrM2I3eTJtcGhpYnl0ejdubTMzaXpwaHJrd2VucGZzcGtreGIzNWE3Y3Fta3k='

export async function onRequestPost({ request, env }: { request: Request; env: any }) {
  try {
    const body: any = await request.json()
    const { title, message, url = 'https://quiz.inkhel.com/rounds' } = body

    if (!title || !message) {
      return new Response(JSON.stringify({ error: 'Title and message are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const apiKey = env?.ONESIGNAL_API_KEY || atob(FALLBACK_KEY_B64)

    const pushRes = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Key ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        included_segments: ['Total Subscriptions'],
        headings: { en: title },
        contents: { en: message },
        web_url: url,
      }),
    })

    const data: any = await pushRes.json().catch(() => ({}))

    if (!pushRes.ok) {
      return new Response(JSON.stringify({ success: false, error: data?.errors?.[0] || 'OneSignal push failed' }), {
        status: pushRes.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'Push dispatch failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function onRequestGet({ env }: { env: any }) {
  try {
    const apiKey = env?.ONESIGNAL_API_KEY || atob(FALLBACK_KEY_B64)
    const res = await fetch(`https://onesignal.com/api/v1/apps/${ONESIGNAL_APP_ID}`, {
      headers: {
        'Authorization': `Key ${apiKey}`,
      },
    })

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch OneSignal app details' }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data: any = await res.json()
    return new Response(
      JSON.stringify({
        totalSubscribers: data.players || 0,
        activeSubscribers: data.messageable_players || 0,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      },
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Failed to fetch subscriber count' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
