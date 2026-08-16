import type { OptionKey, QuestionDraft } from '../types'

const STORAGE_KEY = 'inkhel_gemini_api_key'
const FALLBACK_KEY_B64 = 'QVEuQWI4Uk42SjFHT09sYW9GQlZHTzAwSGxtUmd6a3NSU0NzMG9kRW1pRFZQWnNlV2tsSEE='

export function getGeminiApiKey(): string {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) return stored
  try {
    return atob(FALLBACK_KEY_B64)
  } catch {
    return ''
  }
}

export function saveGeminiApiKey(key: string) {
  if (key && key.trim()) {
    localStorage.setItem(STORAGE_KEY, key.trim())
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export interface GeneratedQuizQuestion {
  text: string
  options: { key: OptionKey; text: string }[]
  correctKey: OptionKey
}

export async function generateQuizQuestionsWithGemini(
  topicOrNews: string,
  count: number = 10,
  customApiKey?: string,
): Promise<QuestionDraft[]> {
  const apiKey = customApiKey?.trim() || getGeminiApiKey()

  // First try backend proxy endpoint
  try {
    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: topicOrNews,
        count,
        apiKey: apiKey || undefined,
      }),
    })

    if (res.ok) {
      const data: any = await res.json()
      if (data?.questions && Array.isArray(data.questions)) {
        return mapRawToDrafts(data.questions)
      }
    }
  } catch {}

  // Fallback to direct client Gemini call if backend is unavailable or running locally without pages dev
  if (!apiKey) {
    throw new Error('Gemini API key is missing. Please provide a key.')
  }

  const promptText = `You are an expert football and sports trivia creator specializing in natural, fluent Mizo language.
Generate exactly ${count} engaging, factually accurate multiple-choice quiz questions based on the following topic, theme, or article:

"${topicOrNews.trim()}"

STRICT INSTRUCTIONS:
1. Every question and all option texts MUST be written in natural, fluent, grammatically correct Mizo.
2. Provide exactly 4 options (A, B, C, D) for each question.
3. Exactly ONE option must be factually correct.
4. Mark the correct answer in "correctKey" (must be "A", "B", "C", or "D").
5. Randomize the correct answer keys evenly across questions so that the answer is not always the same letter.
6. Return ONLY a valid JSON array matching this exact schema without markdown fences:
[
  {
    "text": "Zawhna thu Mizo tawngin?",
    "options": [
      { "key": "A", "text": "Option A" },
      { "key": "B", "text": "Option B" },
      { "key": "C", "text": "Option C" },
      { "key": "D", "text": "Option D" }
    ],
    "correctKey": "A"
  }
]`

  const models = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3-flash-preview']
  let lastError = ''

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.7,
            },
          }),
        },
      )

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}))
        lastError = (errJson as any)?.error?.message || `HTTP ${response.status}`
        continue
      }

      const data = await response.json()
      const rawJson = (data as any)?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!rawJson) {
        continue
      }

      const parsed: GeneratedQuizQuestion[] = JSON.parse(rawJson)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return mapRawToDrafts(parsed)
      }
    } catch (e: any) {
      lastError = e.message || 'Unknown generation error'
    }
  }

  throw new Error(`Gemini generation failed: ${lastError}`)
}

function mapRawToDrafts(parsed: GeneratedQuizQuestion[]): QuestionDraft[] {
  return parsed.map((q, idx) => {
    const validOptions = ['A', 'B', 'C', 'D'].map((key) => {
      const found = q.options?.find((o) => o.key?.toUpperCase() === key)
      return {
        key: key as OptionKey,
        text: found ? found.text.trim() : '',
      }
    })

    const correct = ['A', 'B', 'C', 'D'].includes(q.correctKey?.toUpperCase())
      ? (q.correctKey.toUpperCase() as OptionKey)
      : 'A'

    return {
      id: null,
      text: q.text.trim(),
      order: idx + 1,
      options: validOptions,
      correctKey: correct,
    }
  })
}
