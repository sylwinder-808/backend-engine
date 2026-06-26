import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

function cleanString(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  return trimmed ? trimmed : null;
}

function cleanRequiredString(value: unknown) {
  if (typeof value !== "string") return "";

  return value.trim();
}

function cleanType(value: unknown) {
  const type = String(value || "").trim().toUpperCase();

  if (type === "BANK") return "BANK";
  if (type === "EWALLET") return "EWALLET";
  if (type === "PULSA") return "PULSA";

  return "";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  return "Unknown error";
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = getUserFromRequest(req);
    const { id } = await params;

    if (!payload?.tenantId) {
      return Response.json({
        success: false,
        error: "Unauthorized",
      });
    }

    const body = await req.json();

    const bank = await prisma.paymentTarget.findFirst({
      where: {
        id,
        tenantId: payload.tenantId,
      },
    });

    if (!bank) {
      return Response.json({
        success: false,
        error: "Bank not found",
      });
    }

    const type = body.type ? cleanType(body.type) : bank.type;
    const code = body.code ? cleanRequiredString(body.code).toUpperCase() : bank.code;
    const bankName = body.bankName ? cleanRequiredString(body.bankName) : bank.bankName;
    const accountName =
      body.accountName !== undefined ? cleanString(body.accountName) : bank.accountName;
    const accountNumber =
      body.accountNumber !== undefined
        ? cleanString(body.accountNumber)
        : bank.accountNumber;
    const adminFee =
      body.adminFee !== undefined && body.adminFee !== null
        ? Number(body.adminFee)
        : bank.adminFee;

    if (!type) {
      return Response.json({
        success: false,
        error: "Type tidak valid.",
      });
    }

    if (!code) {
      return Response.json({
        success: false,
        error: "Code wajib diisi.",
      });
    }

    if (!bankName) {
      return Response.json({
        success: false,
        error: "Bank name wajib diisi.",
      });
    }

    if (!accountName) {
      return Response.json({
        success: false,
        error: "Account name wajib diisi.",
      });
    }

    if (!accountNumber) {
      return Response.json({
        success: false,
        error: "Account number wajib diisi.",
      });
    }

    if (!Number.isFinite(adminFee)) {
      return Response.json({
        success: false,
        error: "Admin fee tidak valid.",
      });
    }

    const duplicate = await prisma.paymentTarget.findFirst({
      where: {
        tenantId: payload.tenantId,
        code,
        NOT: {
          id,
        },
      },
    });

    if (duplicate) {
      return Response.json({
        success: false,
        error: "Code sudah digunakan akun lain.",
      });
    }

    const updated = await prisma.paymentTarget.update({
      where: {
        id,
      },
      data: {
        type,
        code,
        bankName,
        accountName,
        accountNumber,
        adminFee,
        isActive: body.isActive ?? bank.isActive,
      },
    });

    return Response.json({
      success: true,
      bank: updated,
    });
  } catch (error) {
    console.error("UPDATE_PAYMENT_TARGET_REAL_ERROR:", error);

    return Response.json({
      success: false,
      error: getErrorMessage(error),
    });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = getUserFromRequest(req);
    const { id } = await params;

    if (!payload?.tenantId) {
      return Response.json({
        success: false,
        error: "Unauthorized",
      });
    }

    const bank = await prisma.paymentTarget.findFirst({
      where: {
        id,
        tenantId: payload.tenantId,
      },
    });

    if (!bank) {
      return Response.json({
        success: false,
        error: "Bank not found",
      });
    }

    await prisma.paymentTarget.delete({
      where: {
        id,
      },
    });

    return Response.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE_PAYMENT_TARGET_REAL_ERROR:", error);

    return Response.json({
      success: false,
      error: getErrorMessage(error),
    });
  }
}