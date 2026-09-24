export interface PushPayload {
  title: string
  message: string
  url?: string
}

export async function sendPushNotification({
  title,
  message,
  url = 'https://quiz.inkhel.com/rounds',
}: PushPayload): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const response = await fetch('/api/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        message,
        url,
      }),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok || !data.success) {
      throw new Error(data.error || `Push request failed with status ${response.status}`)
    }

    return { success: true, id: data.id }
  } catch (error: any) {
    console.error('Failed to send push notification:', error)
    return { success: false, error: error.message || 'Failed to dispatch push notification' }
  }
}

export interface SubscriberStats {
  totalSubscribers: number
  activeSubscribers: number
}

export async function getPushSubscribersCount(): Promise<SubscriberStats> {
  try {
    const res = await fetch('/api/push')
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.error('Failed to fetch push subscribers:', err)
  }
  return { totalSubscribers: 0, activeSubscribers: 0 }
}
