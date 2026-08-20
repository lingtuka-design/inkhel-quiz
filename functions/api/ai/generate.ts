import { Env, json, err, handleOptions } from '../_db'

export const onRequestOptions: PagesFunction = async () => handleOptions()

const FALLBACK_KEY_B64 = 'QVEuQWI4Uk42SjFHT09sYW9GQlZHTzAwSGxtUmd6a3NSU0NzMG9kRW1pRFZQWnNlV2tsSEE='

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body: any = await request.json()
    const { prompt, count = 10, apiKey: clientKey, type = 'quiz' } = body

    if (!prompt || !prompt.trim()) {
      return err('Prompt / topic is required', 400)
    }

    let defaultKey = ''
    try {
      defaultKey = atob(FALLBACK_KEY_B64)
    } catch {}

    const apiKey = clientKey?.trim() || (env as any).GEMINI_API_KEY || defaultKey
    if (!apiKey) {
      return err('Gemini API key not configured', 500)
    }

    let promptText = ''

    if (type === 'poll') {
      promptText = `You are an expert football and sports content creator specializing in natural, fluent Mizo language.
Generate a captivating, viral football or sports opinion poll based on the following topic or theme:

"${prompt.trim()}"

STRICT INSTRUCTIONS:
1. The poll question and all option texts MUST be in natural, engaging Mizo language.
2. Provide between 2 to 4 distinct, engaging voting options.
3. Return ONLY a valid JSON object matching this exact schema without markdown fences:
{
  "question": "Eng club nge kumin Premier League Champion tur?",
  "description": "2026/27 Season Champion tur i ngaihdan thlang rawh le.",
  "category": "football",
  "options": [
    { "text": "Arsenal" },
    { "text": "Manchester City" },
    { "text": "Liverpool" },
    { "text": "Chelsea" }
  ]
}`
    } else {
      promptText = `You are an expert football and sports trivia creator specializing in natural, fluent Mizo language.
Generate exactly ${count} engaging, factually accurate multiple-choice quiz questions based on the following topic, theme, or article:

"${prompt.trim()}"

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
    }

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

        const data: any = await response.json()
        const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (!rawJson) {
          continue
        }

        const parsed = JSON.parse(rawJson)
        if (type === 'poll') {
          if (parsed && parsed.question && Array.isArray(parsed.options)) {
            return json({ poll: parsed })
          }
        } else {
          if (Array.isArray(parsed) && parsed.length > 0) {
            return json({ questions: parsed })
          }
        }
      } catch (e: any) {
        lastError = e.message || 'Generation error'
      }
    }

    return err(`Gemini generation failed: ${lastError}`, 500)
  } catch (e: any) {
    return err(e.message || 'Server error', 500)
  }
}
