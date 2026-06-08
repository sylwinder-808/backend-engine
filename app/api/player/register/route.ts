import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Detect tenant dari host/domain
    const host = req.headers.get("host")?.split(":")[0];

    const domain = await prisma.domain.findUnique({
      where: {
        host,
      },
      include: {
        tenant: true,
      },
    });

    const tenant = domain?.tenant;

    if (!tenant) {
      return Response.json({
        success: false,
        error: "Tenant not found",
      });
    }

    // Validasi basic
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

    // Cek username sudah ada atau belum di tenant ini
    const exists = await prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        username: body.username,
      },
    });

    if (exists) {
      return Response.json({
        success: false,
        error: "Username already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(
      body.password,
      10
    );

    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        username: body.username,
        email: body.email || null,
        phone: body.phone,
        password: hashedPassword,
        role: "PLAYER",
      },
    });

    await prisma.wallet.create({
      data: {
        userId: user.id,
      },
    });

    await prisma.bankAccount.create({
      data: {
        userId: user.id,
        bankName: body.bankName,
        accountName: body.accountName,
        accountNumber: body.accountNumber,
      },
    });

    return Response.json({
      success: true,
      userId: user.id,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Register failed",
    });
  }
}