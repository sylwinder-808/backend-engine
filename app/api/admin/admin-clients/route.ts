import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { DomainStatus, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const dynamic = "force-dynamic";

type AuthPayload = {
  id?: number | string;
  userId?: number | string;
  role?: string;
  tenantId?: string | null;
  isSuperAdmin?: boolean;
};

const MAX_DOMAINS = 4;

const createAdminClientSchema = z.object({
  clientName: z.string().min(2, "Client name wajib diisi."),
  clientCode: z.string().min(2, "Client code wajib diisi."),
  adminUsername: z.string().min(3, "Username admin minimal 3 karakter."),
  adminEmail: z.string().email("Email admin tidak valid."),
  adminPhone: z.string().optional().nullable(),
  adminPassword: z.string().min(6, "Password admin minimal 6 karakter."),
  domains: z.string().optional().nullable(),
});

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  return "Unknown error";
}

function getAuthPayload(req: Request) {
  return getUserFromRequest(req) as AuthPayload | null;
}

function isSuperAdmin(payload: AuthPayload | null) {
  if (!payload) return false;

  return payload.isSuperAdmin === true || payload.role === Role.SUPER_ADMIN;
}

function normalizeCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replace(/[^a-z0-9_]/g, "");
}

function normalizeHost(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split(":")[0];
}

function parseDomains(value?: string | null) {
  if (!value) return [];

  const domains = value
    .split(",")
    .map(normalizeHost)
    .filter((host) => host && host.includes("."));

  return Array.from(new Set(domains)).slice(0, MAX_DOMAINS);
}

export async function GET(req: Request) {
  try {
    const payload = getAuthPayload(req);

    if (!isSuperAdmin(payload)) {
      return Response.json(
        {
          success: false,
          error: "Forbidden",
          message: "Hanya Super Admin yang bisa melihat admin client.",
        },
        { status: 403 }
      );
    }

    const tenants = await prisma.tenant.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        users: {
          where: {
            role: Role.CLIENT_ADMIN,
          },
          select: {
            id: true,
            username: true,
            email: true,
            isBlocked: true,
          },
        },
        domains: {
          select: {
            id: true,
            host: true,
            status: true,
            isPrimary: true,
          },
          orderBy: [
            {
              isPrimary: "desc",
            },
            {
              createdAt: "asc",
            },
          ],
        },
      },
    });

    return Response.json({
      success: true,
      tenants,
      clients: tenants,
      data: tenants,
    });
  } catch (error) {
    console.error("GET_ADMIN_CLIENTS_ERROR:", error);

    return Response.json(
      {
        success: false,
        error: getErrorMessage(error),
        message: "Gagal mengambil admin client.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const payload = getAuthPayload(req);

    if (!isSuperAdmin(payload)) {
      return Response.json(
        {
          success: false,
          error: "Forbidden",
          message: "Hanya Super Admin yang bisa membuat admin client.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createAdminClientSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: "Invalid admin client data",
          message: "Data admin client tidak valid.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      clientName,
      clientCode,
      adminUsername,
      adminEmail,
      adminPhone,
      adminPassword,
      domains,
    } = parsed.data;

    const normalizedCode = normalizeCode(clientCode);
    const uniqueDomains = parseDomains(domains);

    if (!normalizedCode) {
      return Response.json(
        {
          success: false,
          error: "Invalid client code",
          message: "Client code tidak valid.",
        },
        { status: 400 }
      );
    }

    const existingTenant = await prisma.tenant.findUnique({
      where: {
        code: normalizedCode,
      },
    });

    if (existingTenant) {
      return Response.json(
        {
          success: false,
          error: "Client code already exists",
          message: "Client code sudah digunakan.",
        },
        { status: 409 }
      );
    }

    if (uniqueDomains.length > 0) {
      const existingDomain = await prisma.domain.findFirst({
        where: {
          host: {
            in: uniqueDomains,
          },
        },
      });

      if (existingDomain) {
        return Response.json(
          {
            success: false,
            error: "Domain already exists",
            message: `Domain ${existingDomain.host} sudah digunakan.`,
          },
          { status: 409 }
        );
      }
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: clientName,
          code: normalizedCode,
          status: "ACTIVE",
        },
      });

      const adminClient = await tx.user.create({
        data: {
          tenantId: tenant.id,
          username: adminUsername,
          email: adminEmail,
          phone: adminPhone?.trim() || adminEmail,
          password: passwordHash,
          role: Role.CLIENT_ADMIN,
          isBlocked: false,
        },
      });

      if (uniqueDomains.length > 0) {
        await tx.domain.createMany({
          data: uniqueDomains.map((host, index) => ({
            tenantId: tenant.id,
            host,
            status: DomainStatus.ACTIVE,
            isPrimary: index === 0,
          })),
        });
      }

      await tx.siteSetting.create({
        data: {
          tenantId: tenant.id,
          siteName: clientName,
          logoUrl: null,
          faviconUrl: null,
          maintenanceMode: false,
        },
      });

      await tx.contactSetting.create({
        data: {
          tenantId: tenant.id,
        },
      });

      await tx.templateSetting.create({
        data: {
          tenantId: tenant.id,
        },
      });

      return {
        tenant,
        adminClient,
      };
    });

    return Response.json(
      {
        success: true,
        message: "Admin client berhasil dibuat.",
        tenant: result.tenant,
        adminClient: {
          id: result.adminClient.id,
          username: result.adminClient.username,
          email: result.adminClient.email,
        },
        data: {
          tenantId: result.tenant.id,
          clientName: result.tenant.name,
          clientCode: result.tenant.code,
          adminEmail: result.adminClient.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE_ADMIN_CLIENT_ERROR:", error);

    return Response.json(
      {
        success: false,
        error: getErrorMessage(error),
        message: "Gagal membuat admin client.",
      },
      { status: 500 }
    );
  }
}