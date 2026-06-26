import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function normalizeHost(value: string) {
  return value
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .split(",")[0]
    .trim()
    .toLowerCase();
}

function removePort(host: string) {
  return host.split(":")[0];
}

async function resolveTenant(req: Request, body: Record<string, unknown>) {
  const rawHost =
    req.headers.get("x-tenant-host") ||
    req.headers.get("x-public-domain") ||
    req.headers.get("x-forwarded-host") ||
    (typeof body.domain === "string" ? body.domain : "") ||
    (typeof body.host === "string" ? body.host : "") ||
    req.headers.get("host") ||
    "";

  const tenantCode =
    typeof body.tenantCode === "string" ? body.tenantCode.trim() : "";

  if (!rawHost && !tenantCode) {
    return null;
  }

  const cleanHost = rawHost ? normalizeHost(rawHost) : "";
  const hostWithoutPort = cleanHost ? removePort(cleanHost) : "";

  return prisma.domain.findFirst({
    where: {
      status: "ACTIVE",
      OR: [
        ...(cleanHost ? [{ host: cleanHost }] : []),
        ...(hostWithoutPort ? [{ host: hostWithoutPort }] : []),
        ...(tenantCode
          ? [
              {
                tenant: {
                  code: tenantCode,
                },
              },
            ]
          : []),
      ],
    },
    include: {
      tenant: true,
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const domain = await resolveTenant(req, body);
    const tenant = domain?.tenant;

    if (!tenant || tenant.status !== "ACTIVE") {
      return Response.json({
        success: false,
        error: "Tenant not found",
      });
    }

    if (
      !body.username ||
      !body.password ||
      !body.phone ||
      !body.bankName ||
      !body.accountName ||
      !body.accountNumber
    ) {
      return Response.json({
        success: false,
        error: "Required fields are missing",
      });
    }

    const username = String(body.username).trim();
    const email =
      typeof body.email === "string" && body.email.trim()
        ? body.email.trim()
        : null;

    const exists = await prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        username,
      },
    });

    if (exists) {
      return Response.json({
        success: false,
        error: "Username already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(String(body.password), 10);

    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        username,
        email,
        phone: String(body.phone),
        password: hashedPassword,
        role: "PLAYER",
      },
    });

    const wallet = await prisma.wallet.create({
      data: {
        userId: user.id,
      },
    });

    const bankAccount = await prisma.bankAccount.create({
      data: {
        userId: user.id,
        bankName: String(body.bankName),
        accountName: String(body.accountName),
        accountNumber: String(body.accountNumber),
      },
    });

    return Response.json({
      success: true,
      userId: user.id,
      player: {
        id: user.id,
        tenantId: user.tenantId,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isBlocked: user.isBlocked,
        createdAt: user.createdAt,
        wallet,
        bankAccount,
        tenant,
      },
    });
  } catch (error) {
    console.error("PLAYER REGISTER ERROR:", error);

    return Response.json({
      success: false,
      error: "Register failed",
    });
  }
}