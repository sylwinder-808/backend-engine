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

export async function GET(req: Request) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload?.tenantId) {
      return Response.json({
        success: false,
        error: "Unauthorized",
      });
    }

    const banks = await prisma.paymentTarget.findMany({
      where: {
        tenantId: payload.tenantId,
      },
      orderBy: {
        id: "desc",
      },
    });

    return Response.json({
      success: true,
      banks,
    });
  } catch (error) {
    console.error("GET_PAYMENT_TARGET_ERROR:", error);

    return Response.json({
      success: false,
      error: getErrorMessage(error),
    });
  }
}

export async function POST(req: Request) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload?.tenantId) {
      return Response.json({
        success: false,
        error: "Unauthorized",
      });
    }

    const body = await req.json();

    const type = cleanType(body.type);
    const code = cleanRequiredString(body.code).toUpperCase();
    const bankName = cleanRequiredString(body.bankName);
    const accountName = cleanString(body.accountName);
    const accountNumber = cleanString(body.accountNumber);
    const adminFee = Number(body.adminFee ?? 0);

    if (!type) {
      return Response.json({
        success: false,
        error: "Type tidak valid. Gunakan BANK, EWALLET, atau PULSA.",
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

    const existing = await prisma.paymentTarget.findFirst({
      where: {
        tenantId: payload.tenantId,
        code,
      },
    });

    if (existing) {
      return Response.json({
        success: false,
        error: "Code sudah digunakan.",
      });
    }

    const bank = await prisma.paymentTarget.create({
      data: {
        tenantId: payload.tenantId,
        type,
        code,
        bankName,
        accountName,
        accountNumber,
        adminFee,
        isActive: body.isActive ?? true,
      },
    });

    return Response.json({
      success: true,
      bank,
    });
  } catch (error) {
    console.error("CREATE_PAYMENT_TARGET_REAL_ERROR:", error);

    return Response.json({
      success: false,
      error: getErrorMessage(error),
    });
  }
}