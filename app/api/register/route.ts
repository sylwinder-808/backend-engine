import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const hashedPassword = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.create({
      data: {
        username: body.username,
        email: body.email,
        phone: body.phone,
        password: hashedPassword,

        wallet: {
          create: {
            balance: 0,
            holdBalance: 0,
          },
        },

        bankAccount: {
          create: {
            paymentMethod: body.paymentMethod,
            bankName: body.bankName,
            accountName: body.accountName,
            accountNumber: body.accountNumber,
          },
        },
      },
    });

    return Response.json({
      success: true,
      user,
    });

  } catch (err: any) {
    return Response.json(
      {
        success: false,
        message: err.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}