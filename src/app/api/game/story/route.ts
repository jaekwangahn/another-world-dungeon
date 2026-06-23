import OpenAI from "openai";
import { z } from "zod";

const storyRequestSchema = z.object({
  character: z.object({
    name: z.string(),
    job: z.string(),
    level: z.number(),
    fate: z.object({
      zodiac: z.string(),
      element: z.string(),
      temperament: z.string(),
      talent: z.string(),
    }),
  }),
  room: z.object({
    kind: z.string(),
    title: z.string(),
    description: z.string(),
  }),
});

export async function POST(request: Request) {
  const parsed = storyRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid story request" }, { status: 400 });
  }

  const { character, room } = parsed.data;
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({
      story: fallbackStory(character.name, character.job, room.kind, character.fate.temperament),
      provider: "local-fallback",
    });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: "gpt-5-mini",
    input: [
      {
        role: "system",
        content:
          "You write concise Korean dark fantasy text RPG room narration. Avoid copyrighted references. Output 2-3 vivid sentences and one subtle gameplay hint.",
      },
      {
        role: "user",
        content: JSON.stringify({
          player: character,
          room,
          style: "modern dark fantasy web RPG",
        }),
      },
    ],
  });

  return Response.json({ story: response.output_text, provider: "openai" });
}

function fallbackStory(name: string, job: string, roomKind: string, temperament: string) {
  return `${name}의 목걸이가 ${roomKind}의 공기를 얇게 가른다. ${job}의 감각과 ${temperament}의 본능이 겹치며, 바닥의 흠집 하나가 다음 선택의 위험도를 알려준다. 서두르지 않으면 작은 보상을 더 찾을 수 있다.`;
}
