import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: "player",
      },
      include: {
        wallet: true,
        bankAccount: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const data = users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      phone: u.phone,
      role: u.role,
      isBlocked: u.isBlocked ?? false,

      balance: u.wallet?.balance ?? 0,

      bankAccount: u.bankAccount.map((b) => ({
        id: b.id,
        bankName: b.bankName,
        accountName: b.accountName,
        accountNumber: b.accountNumber,
      })),

      createdAt: u.createdAt.toISOString().split("T")[0],
    }));

    return Response.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error("GET /admin/players error:", err);

    return Response.json(
      {
        success: false,
        error: err.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}