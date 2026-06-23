import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/jwt";

export async function POST(req: Request) {
  const body = await req.json();

  // 1. ambil host dari domain
  const host = req.headers.get("host")?.split(":")[0];

  // 2. cari domain → tenant
  const domain = await prisma.domain.findUnique({
    where: { host },
    include: { tenant: true },
  });

  const tenant = domain?.tenant;

  if (!tenant) {
    return Response.json({ success: false, error: "Invalid Credentials" });
  }

  // 3. cari user berdasarkan tenant + username
  const user = await prisma.user.findFirst({
    where: {
      username: body.username,
      tenantId: tenant.id,
      role: "PLAYER",
    },
  });

  if (!user) {
    return Response.json({ success: false, error: "Player not found" });
  }

  // 4. cek password
  const valid = await bcrypt.compare(body.password, user.password);

  if (!valid) {
    return Response.json({ success: false, error: "Wrong password" });
  }

  // 5. token
  const token = signToken({
    id: user.id,
    role: user.role,
    tenantId: user.tenantId,
  });

  return Response.json({ success: true, token });
}