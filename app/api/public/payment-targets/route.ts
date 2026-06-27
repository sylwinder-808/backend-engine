import { prisma } from "@/lib/prisma";

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

async function resolveTenant(req: Request) {
  const rawHost =
    req.headers.get("x-tenant-host") ||
    req.headers.get("x-public-domain") ||
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host");

  if (!rawHost) {
    return null;
  }

  const cleanHost = normalizeHost(rawHost);
  const hostWithoutPort = removePort(cleanHost);

  const domain = await prisma.domain.findFirst({
    where: {
      status: "ACTIVE",
      OR: [{ host: cleanHost }, { host: hostWithoutPort }],
    },
    include: {
      tenant: true,
    },
  });

  if (!domain || !domain.tenant) {
    return null;
  }

  if (domain.tenant.status !== "ACTIVE") {
    return null;
  }

  return domain.tenant;
}

export async function GET(req: Request) {
  try {
    const tenant = await resolveTenant(req);

    if (!tenant) {
      return Response.json({
        success: false,
        error: "Tenant not found",
      });
    }

    const targets = await prisma.paymentTarget.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
      },
      orderBy: {
        id: "desc",
      },
    });

    return Response.json({
      success: true,
      data: targets,
      targets,
      paymentTargets: targets,
    });
  } catch (error) {
    console.error("PUBLIC_PAYMENT_TARGETS_ERROR:", error);

    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed",
    });
  }
}