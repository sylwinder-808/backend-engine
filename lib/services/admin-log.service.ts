import { prisma } from "@/lib/prisma";

export const AdminLogService = {
  async create(data: {
    adminId: number;
    action: string;
    targetId?: number;
    meta?: any;
  }) {
    return prisma.adminLog.create({
      data,
    });
  },

  async list() {
    return prisma.adminLog.findMany({
      include: {
        admin: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },
};