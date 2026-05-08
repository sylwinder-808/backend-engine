import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  let body;

  // 🛡️ handle empty / invalid JSON
  try {
    body = await req.json();
  } catch (err) {
    return Response.json(
      {
        success: false,
        error: "Invalid or empty request body",
      },
      { status: 400 }
    );
  }

  const { depositId } = body;

  if (!depositId) {
    return Response.json(
      {
        success: false,
        error: "depositId is required",
      },
      { status: 400 }
    );
  }

  const deposit = await prisma.deposit.findUnique({
    where: { id: depositId },
  });

  if (!deposit || deposit.status !== "pending") {
    return Response.json(
      {
        success: false,
        error: "Invalid deposit",
      },
      { status: 400 }
    );
  }

  await prisma.deposit.update({
    where: { id: deposit.id },
    data: { status: "rejected" },
  });

  return Response.json({
    success: true,
    message: "Deposit rejected",
  });
}