import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // 🔥 INI FIX UTAMA

  console.log("PUT ID:", id);

  const userId = Number(id);

  if (isNaN(userId)) {
    return Response.json(
      {
        success: false,
        error: "Invalid user id",
      },
      { status: 400 }
    );
  }

  const body = await req.json();

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      email: body.email,
      phone: body.phone,
      username: body.username,
      isBlocked: body.isBlocked,
    },
  });

  return Response.json({
    success: true,
    data: updated,
  });
}