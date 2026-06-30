import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { z } from "zod";

const primaryDomainSchema = z.object({
  id: z.string().min(1, "Domain ID wajib diisi."),
});

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  return "Unknown error";
}

function getTenantIdFromRequest(req: Request) {
  const payload = getUserFromRequest(req);

  if (!payload?.tenantId) return null;

  return String(payload.tenantId);
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
    const parsed = primaryDomainSchema.safeParse(body);

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

    await prisma.$transaction([
      prisma.domain.updateMany({
        where: {
          tenantId,
        },
        data: {
          isPrimary: false,
        },
      }),

      prisma.domain.update({
        where: {
          id: existingDomain.id,
        },
        data: {
          isPrimary: true,
          status: "ACTIVE",
        },
      }),
    ]);

    return Response.json({
      success: true,
      message: "Primary domain berhasil diubah.",
    });
  } catch (error) {
    console.error("SET_PRIMARY_ADMIN_DOMAIN_ERROR:", error);

    return Response.json(
      {
        success: false,
        error: getErrorMessage(error),
        message: "Gagal mengubah primary domain.",
      },
      { status: 500 }
    );
  }
}