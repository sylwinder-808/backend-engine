import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const hashedPassword = await bcrypt.hash(
      body.password,
      10
    );

    const user = await prisma.user.create({
      data: {
        Username: body.Username,
        email: body.email,
        Password: hashedPassword,
        PhoneNumber: body.PhoneNumber,

        wallet: {
          create: {
            balance: 0,
          },
        },

        bankAccount: {
          create: {
            PaymentMethod: body.PaymentMethod,
            AccountName: body.AccountName,
            AccountNumber: body.AccountNumber,
          },
        },
      },
    });

    return Response.json({
      success: true,
      user,
    });
  } catch (error) {
    console.log(error);

    return Response.json({
      success: false,
      error: "Register failed",
    });
  }
}