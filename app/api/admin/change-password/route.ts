import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const dynamic = "force-dynamic";

type AuthPayload = {
  id?: number | string;
  userId?: number | string;
  role?: string;
  tenantId?: string | null;
  isSuperAdmin?: boolean;
};

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password lama wajib diisi."),
    newPassword: z.string().min(6, "Password baru minimal 6 karakter."),
    confirmPassword: z.string().min(6, "Konfirmasi password wajib diisi."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi password baru tidak sama.",
  });

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  return "Unknown error";
}

function getAdminId(payload: AuthPayload | null) {
  const rawId = payload?.userId ?? payload?.id;

  if (!rawId) return null;

  const id = Number(rawId);

  if (!Number.isInteger(id)) return null;

  return id;
}

function isAdminRole(role: unknown) {
  return (
    role === Role.SUPER_ADMIN ||
    role === Role.CLIENT_ADMIN ||
    role === Role.STAFF
  );
}

export async function POST(req: Request) {
  try {
    const payload = getUserFromRequest(req) as AuthPayload | null;
    const adminId = getAdminId(payload);

    if (!payload || !adminId || !isAdminRole(payload.role)) {
      return Response.json(
        {
          success: false,
          error: "Unauthorized",
          message: "Unauthorized. Silakan login ulang.",
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: "Invalid password data",
          message: "Data password tidak valid.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const admin = await prisma.user.findFirst({
      where: {
        id: adminId,
        role: {
          in: [Role.SUPER_ADMIN, Role.CLIENT_ADMIN, Role.STAFF],
        },
      },
    });

    if (!admin || !admin.password) {
      return Response.json(
        {
          success: false,
          error: "Admin not found",
          message: "Akun admin tidak ditemukan.",
        },
        { status: 404 }
      );
    }

    if (admin.isBlocked) {
      return Response.json(
        {
          success: false,
          error: "Admin blocked",
          message: "Akun admin sedang diblokir.",
        },
        { status: 403 }
      );
    }

    const passwordValid = await bcrypt.compare(
      parsed.data.currentPassword,
      admin.password
    );

    if (!passwordValid) {
      return Response.json(
        {
          success: false,
          error: "Invalid current password",
          message: "Password lama salah.",
        },
        { status: 400 }
      );
    }

    const samePassword = await bcrypt.compare(
      parsed.data.newPassword,
      admin.password
    );

    if (samePassword) {
      return Response.json(
        {
          success: false,
          error: "Same password",
          message: "Password baru tidak boleh sama dengan password lama.",
        },
        { status: 400 }
      );
    }

    const newPasswordHash = await bcrypt.hash(parsed.data.newPassword, 10);

    await prisma.user.update({
      where: {
        id: admin.id,
      },
      data: {
        password: newPasswordHash,
      },
    });

    return Response.json({
      success: true,
      message: "Password admin berhasil diganti.",
    });
  } catch (error) {
    console.error("CHANGE_ADMIN_PASSWORD_ERROR:", error);

    return Response.json(
      {
        success: false,
        error: getErrorMessage(error),
        message: "Gagal mengganti password admin.",
      },
      { status: 500 }
    );
  }
}