import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    let body;

    try {
      body = await req.json();
    } catch {
      return Response.json(
        {
          success: false,
          error: "Request body must be valid JSON",
        },
        { status: 400 }
      );
    }

    if (!body) {
      return Response.json(
        {
          success: false,
          error: "Body is required",
        },
        { status: 400 }
      );
    }

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
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}