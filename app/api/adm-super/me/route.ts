import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const payload = getUserFromRequest(req);

    if (payload.role !== "SUPER_ADMIN") {
      return Response.json({
        success: false,
        error: "Forbidden",
      });
    }

    const [
      user,
      totalTenants,
      totalAdmins,
      totalStaffs,
      totalPlayers,
      tenants,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: {
          id: payload.id,
        },
        select: {
          id: true,
          username: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
        },
      }),

      prisma.tenant.count(),

      prisma.user.count({
        where: {
          role: "CLIENT_ADMIN",
        },
      }),

      prisma.user.count({
        where: {
          role: "STAFF",
        },
      }),

      prisma.user.count({
        where: {
          role: "PLAYER",
        },
      }),

      prisma.tenant.findMany({
        orderBy: {
          createdAt: "desc",
        },
        include: {
          _count: {
            select: {
              users: {
                where: {
                  role: "PLAYER",
                },
              },
            },
          },
        },
      }),
    ]);

    if (!user) {
      return Response.json({
        success: false,
        error: "User not found",
      });
    }

    return Response.json({
      success: true,

      user,

      stats: {
        tenants: totalTenants,
        admins: totalAdmins,
        staffs: totalStaffs,
        players: totalPlayers,
      },

      tenants: tenants.map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        code: tenant.code,
        status: tenant.status,
        createdAt: tenant.createdAt,
        players: tenant._count.users,
      })),
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Unauthorized",
    });
  }
}