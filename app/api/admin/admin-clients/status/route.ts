import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { Role } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

type AuthPayload = {
  id?: number | string;
  userId?: number | string;
  role?: string;
  tenantId?: string | null;
  isSuperAdmin?: boolean;
};

const updateClientStatusSchema = z.object({
  tenantId: z.string().min(1, "Tenant ID wajib diisi."),
  status: z.enum(["ACTIVE", "INACTIVE", "DEACTIVE"]),
});

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  return "Unknown error";
}

function getAuthPayload(req: Request) {
  return getUserFromRequest(req) as AuthPayload | null;
}

function isSuperAdmin(payload: AuthPayload | null) {
  if (!payload) return false;

  return payload.isSuperAdmin === true || payload.role === Role.SUPER_ADMIN;
}

function normalizeTenantStatus(status: string) {
  if (status === "DEACTIVE") return "INACTIVE";

  return status;
}

export async function PATCH(req: Request) {
  try {
    const payload = getAuthPayload(req);

    if (!isSuperAdmin(payload)) {
      return Response.json(
        {
          success: false,
          error: "Forbidden",
          message: "Hanya Super Admin yang bisa mengubah status client.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateClientStatusSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: "Invalid client status data",
          message: "Data status client tidak valid.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const nextStatus = normalizeTenantStatus(parsed.data.status);

    const tenant = await prisma.tenant.findUnique({
      where: {
        id: parsed.data.tenantId,
      },
    });

    if (!tenant) {
      return Response.json(
        {
          success: false,
          error: "Client not found",
          message: "Client tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    const updatedTenant = await prisma.$transaction(async (tx) => {
      const updated = await tx.tenant.update({
        where: {
          id: parsed.data.tenantId,
        },
        data: {
          status: nextStatus,
        },
      });

      await tx.user.updateMany({
        where: {
          tenantId: parsed.data.tenantId,
          role: Role.CLIENT_ADMIN,
        },
        data: {
          isBlocked: nextStatus !== "ACTIVE",
        },
      });

      return updated;
    });

    return Response.json({
      success: true,
      message:
        nextStatus === "ACTIVE"
          ? "Client berhasil diaktifkan."
          : "Client berhasil dinonaktifkan.",
      tenant: updatedTenant,
      data: {
        id: updatedTenant.id,
        name: updatedTenant.name,
        status: updatedTenant.status,
      },
    });
  } catch (error) {
    console.error("UPDATE_CLIENT_STATUS_ERROR:", error);

    return Response.json(
      {
        success: false,
        error: getErrorMessage(error),
        message: "Gagal mengubah status client.",
      },
      { status: 500 }
    );
  }
}