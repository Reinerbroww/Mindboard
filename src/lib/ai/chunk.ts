export const MAX_MATERIAL_CHARS = 16_000;

export function splitIntoSentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?])\s+/);
  return parts.map((part) => part.trim()).filter(Boolean);
}

export function chunkText(text: string, maxChars: number): string[] {
  const sentences = splitIntoSentences(text);
  const chunks: string[] = [];
  let current = "";

  const push = (sentence: string) => {
    if (!sentence) return;
    if (current && current.length + sentence.length + 1 > maxChars) {
      chunks.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  };

  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      push(current);
      current = "";
      let rest = sentence;
      while (rest.length > maxChars) {
        chunks.push(rest.slice(0, maxChars));
        rest = rest.slice(maxChars);
      }
      current = rest;
    } else {
      push(sentence);
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

/**
 * Picks a sentence-aligned, representative sample of a large document so the
 * AI request stays within its token burst capacity without losing the shape
 * of the whole material (head + middle sections + tail).
 */
export function selectRepresentativeSample(
  text: string,
  budget = MAX_MATERIAL_CHARS,
): string {
  if (!text) return "";
  if (text.length <= budget) return text;

  const chunkSize = Math.floor(budget / 5);
  const chunks = chunkText(text, chunkSize);

  if (chunks.length <= 1) return chunks[0].slice(0, budget);

  const selected: string[] = [chunks[0]];
  const middle = chunks.slice(1, -1);
  const takeCount = Math.max(1, Math.min(3, middle.length));
  const step = middle.length / (takeCount + 1);
  for (let i = 1; i <= takeCount; i++) {
    const index = Math.min(middle.length - 1, Math.floor(i * step));
    selected.push(middle[index]);
  }
  selected.push(chunks[chunks.length - 1]);

  const joined = selected.filter(Boolean).join("\n\n");
  return joined.slice(0, budget);
}