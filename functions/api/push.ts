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
        url: url,
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
