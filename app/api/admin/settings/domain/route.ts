import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { z } from "zod";

const MAX_DOMAINS = 4;

const createDomainSchema = z.object({
  host: z.string().min(3, "Domain wajib diisi."),
});

const updateDomainSchema = z.object({
  id: z.string().min(1, "Domain ID wajib diisi."),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]),
});

function cleanHost(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split(":")[0];
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  return "Unknown error";
}

function getTenantIdFromRequest(req: Request) {
  const payload = getUserFromRequest(req);

  if (!payload?.tenantId) return null;

  return String(payload.tenantId);
}

export async function GET(req: Request) {
  try {
    const tenantId = getTenantIdFromRequest(req);

    if (!tenantId) {
      return Response.json(
        {
          success: false,
          error: "Unauthorized",
          message: "Akses ditolak.",
        },
        { status: 401 }
      );
    }

    const domains = await prisma.domain.findMany({
      where: {
        tenantId,
      },
      orderBy: [
        {
          isPrimary: "desc",
        },
        {
          createdAt: "asc",
        },
      ],
    });

    return Response.json({
      success: true,
      domains,
      data: domains,
    });
  } catch (error) {
    console.error("GET_ADMIN_DOMAINS_ERROR:", error);

    return Response.json(
      {
        success: false,
        error: getErrorMessage(error),
        message: "Gagal mengambil domain.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const tenantId = getTenantIdFromRequest(req);

    if (!tenantId) {
      return Response.json(
        {
          success: false,
          error: "Unauthorized",
          message: "Akses ditolak.",
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = createDomainSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: "Invalid domain data",
          message: "Data domain tidak valid.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const host = cleanHost(parsed.data.host);

    if (!host || !host.includes(".")) {
      return Response.json(
        {
          success: false,
          error: "Invalid domain format",
          message: "Format domain tidak valid. Contoh: domain.com",
        },
        { status: 400 }
      );
    }

    const domainCount = await prisma.domain.count({
      where: {
        tenantId,
      },
    });

    if (domainCount >= MAX_DOMAINS) {
      return Response.json(
        {
          success: false,
          error: "Domain limit reached",
          message: `Maksimal hanya boleh ${MAX_DOMAINS} domain.`,
        },
        { status: 400 }
      );
    }

    const existingDomain = await prisma.domain.findUnique({
      where: {
        host,
      },
    });

    if (existingDomain) {
      return Response.json(
        {
          success: false,
          error: "Domain already exists",
          message: "Domain sudah digunakan oleh client lain.",
        },
        { status: 409 }
      );
    }

    const domain = await prisma.domain.create({
      data: {
        tenantId,
        host,
        status: "ACTIVE",
        isPrimary: domainCount === 0,
      },
    });

    return Response.json(
      {
        success: true,
        message: "Domain berhasil ditambahkan.",
        domain,
        data: domain,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE_ADMIN_DOMAIN_ERROR:", error);

    return Response.json(
      {
        success: false,
        error: getErrorMessage(error),
        message: "Gagal menambahkan domain.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const tenantId = getTenantIdFromRequest(req);

    if (!tenantId) {
      return Response.json(
        {
          success: false,
          error: "Unauthorized",
          message: "Akses ditolak.",
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = updateDomainSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: "Invalid domain data",
          message: "Data domain tidak valid.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const existingDomain = await prisma.domain.findFirst({
      where: {
        id: parsed.data.id,
        tenantId,
      },
    });

    if (!existingDomain) {
      return Response.json(
        {
          success: false,
          error: "Domain not found",
          message: "Domain tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    const updatedDomain = await prisma.domain.update({
      where: {
        id: existingDomain.id,
      },
      data: {
        status: parsed.data.status,
      },
    });

    return Response.json({
      success: true,
      message:
        parsed.data.status === "ACTIVE"
          ? "Domain berhasil diaktifkan."
          : parsed.data.status === "MAINTENANCE"
            ? "Domain berhasil masuk mode maintenance."
            : "Domain berhasil dinonaktifkan.",
      domain: updatedDomain,
      data: updatedDomain,
    });
  } catch (error) {
    console.error("UPDATE_ADMIN_DOMAIN_ERROR:", error);

    return Response.json(
      {
        success: false,
        error: getErrorMessage(error),
        message: "Gagal mengubah status domain.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const tenantId = getTenantIdFromRequest(req);

    if (!tenantId) {
      return Response.json(
        {
          success: false,
          error: "Unauthorized",
          message: "Akses ditolak.",
        },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return Response.json(
        {
          success: false,
          error: "Missing domain id",
          message: "Domain ID wajib diisi.",
        },
        { status: 400 }
      );
    }

    const existingDomain = await prisma.domain.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!existingDomain) {
      return Response.json(
        {
          success: false,
          error: "Domain not found",
          message: "Domain tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    await prisma.domain.delete({
      where: {
        id: existingDomain.id,
      },
    });

    if (existingDomain.isPrimary) {
      const nextDomain = await prisma.domain.findFirst({
        where: {
          tenantId,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      if (nextDomain) {
        await prisma.domain.update({
          where: {
            id: nextDomain.id,
          },
          data: {
            isPrimary: true,
            status: "ACTIVE",
          },
        });
      }
    }

    return Response.json({
      success: true,
      message: "Domain berhasil dihapus.",
    });
  } catch (error) {
    console.error("DELETE_ADMIN_DOMAIN_ERROR:", error);

    return Response.json(
      {
        success: false,
        error: getErrorMessage(error),
        message: "Gagal menghapus domain.",
      },
      { status: 500 }
    );
  }
}