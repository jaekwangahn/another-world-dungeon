import { auth } from "@/auth";
import { z } from "zod";

const saveSchema = z.object({
  character: z.unknown(),
  inventory: z.array(z.unknown()).default([]),
  dungeon: z.array(z.unknown()).default([]),
  quests: z.array(z.unknown()).default([]),
  achievements: z.array(z.unknown()).default([]),
});

export async function POST(request: Request) {
  const session = await auth();
  const payload = saveSchema.safeParse(await request.json());
  if (!payload.success) {
    return Response.json({ error: "Invalid save payload" }, { status: 400 });
  }

  return Response.json({
    ok: true,
    mode: "local-first",
    userId: session?.user?.id ?? "anonymous-demo",
    savedAt: new Date().toISOString(),
    note: "Prisma persistence is designed in prisma/schema.prisma. Wire this route to GameSave once PostgreSQL is configured.",
  });
}
