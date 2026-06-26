import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = getUserFromRequest(req);
    const { id } = await params;

    const body = await req.json();

    const bank = await prisma.paymentTarget.findFirst({
      where: {
        id,
        tenantId: payload.tenantId!,
      },
    });

    if (!bank) {
      return Response.json({
        success: false,
        error: "Bank not found",
      });
    }

    const updated = await prisma.paymentTarget.update({
      where: {
        id,
      },
      data: {
        type: body.type ?? bank.type,
        code: body.code ?? bank.code,
        bankName: body.bankName ?? bank.bankName,
        accountName:
          body.accountName ?? bank.accountName,
        accountNumber:
          body.accountNumber ?? bank.accountNumber,
        adminFee:
          body.adminFee != null
            ? Number(body.adminFee)
            : bank.adminFee,
        qrImage:
          body.qrImage ?? bank.qrImage,
        logoUrl:
          body.logoUrl ?? bank.logoUrl,
        isActive:
          body.isActive ?? bank.isActive,
      },
    });

    return Response.json({
      success: true,
      bank: updated,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Update failed",
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

    const bank = await prisma.paymentTarget.findFirst({
      where: {
        id,
        tenantId: payload.tenantId!,
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
    console.error(error);

    return Response.json({
      success: false,
      error: "Delete failed",
    });
  }
}