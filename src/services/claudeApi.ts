import type { ParsedReceipt } from '../types';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-opus-4-6';

const SYSTEM_PROMPT = `You are a receipt parser. When given an image of a receipt, extract all line items with their prices. Return ONLY valid JSON matching this exact schema:
{
  "items": [{"name": "string", "price": number}],
  "subtotal": number | null,
  "taxAmount": number | null,
  "tipAmount": number | null,
  "confidence": "high" | "medium" | "low"
}
Rules:
- Prices are in dollars as decimals (e.g. 12.50)
- Exclude taxes, tips, subtotals, and grand totals from the items array — those go in the dedicated fields
- If a field cannot be determined from the image, use null
- confidence is "high" if all items are clearly readable, "medium" if some items are unclear, "low" if image quality is poor
- Output ONLY the JSON object, no other text`;

export async function parseReceiptImage(
  base64Image: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp',
  apiKey: string
): Promise<ParsedReceipt> {
  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: 'Parse this receipt and return only the JSON.',
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text: string = data?.content?.[0]?.text ?? '';

  // Strip markdown code fences if present
  const cleaned = text
    .replace(/^```json\s*/m, '')
    .replace(/^```\s*/m, '')
    .replace(/```\s*$/m, '')
    .trim();

  try {
    return JSON.parse(cleaned) as ParsedReceipt;
  } catch {
    throw new Error(`Could not parse Claude response as JSON:\n${text}`);
  }
}
