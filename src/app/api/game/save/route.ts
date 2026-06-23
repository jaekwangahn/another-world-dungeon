import { auth } from "@/auth";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

const saveSchema = z.object({
  payload: z.record(z.string(), z.unknown()),
});

function sessionUserId(session: unknown) {
  const user = (session as { user?: { id?: string; email?: string; name?: string } } | null)?.user;
  return user?.id ?? user?.email ?? (user?.name ? `demo-${user.name}` : undefined);
}

async function getPrisma() {
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { PrismaClient } = await import("@prisma/client");
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export async function GET() {
  const session = await auth();
  const userId = sessionUserId(session);
  if (!userId) {
    return Response.json({ error: "Login required" }, { status: 401 });
  }
  if (!process.env.DATABASE_URL) {
    return Response.json({ error: "DATABASE_URL is not configured", mode: "demo" }, { status: 503 });
  }

  const prisma = await getPrisma();
  const save = await prisma.gameSave.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  if (!save) return Response.json({ error: "No cloud save" }, { status: 404 });

  return Response.json({
    ok: true,
    mode: "database",
    payload: save.payload,
    savedAt: save.updatedAt.toISOString(),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = sessionUserId(session);
  const parsed = saveSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid save payload" }, { status: 400 });
  }
  if (!userId) {
    return Response.json({ error: "Login required" }, { status: 401 });
  }
  if (!process.env.DATABASE_URL) {
    return Response.json({
      ok: true,
      mode: "demo",
      userId,
      savedAt: new Date().toISOString(),
      note: "DATABASE_URL is not configured, so this save was acknowledged but not persisted.",
    });
  }

  const prisma = await getPrisma();
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, name: session?.user?.name, email: session?.user?.email },
  });

  const payload = parsed.data.payload as Prisma.InputJsonValue;
  const existing = await prisma.gameSave.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" } });
  const save = existing
    ? await prisma.gameSave.update({ where: { id: existing.id }, data: { payload } })
    : await prisma.gameSave.create({ data: { userId, payload } });

  return Response.json({
    ok: true,
    mode: "database",
    userId,
    savedAt: save.updatedAt.toISOString(),
  });
}
