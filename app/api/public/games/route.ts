import { prisma } from "@/lib/prisma";
import {
  getAllPublicGames,
  getPublicProviderCards,
  getPublicProviderGameList,
  publicProviderGames,
} from "@/lib/public-game-data";

function normalizeHost(value: string) {
  return value
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .split(",")[0]
    .trim()
    .toLowerCase();
}

function removePort(host: string) {
  return host.split(":")[0];
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  return "Unknown error";
}

async function resolveTenant(req: Request) {
  const rawHost =
    req.headers.get("x-tenant-host") ||
    req.headers.get("x-public-domain") ||
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host");

  if (!rawHost) return null;

  const cleanHost = normalizeHost(rawHost);
  const hostWithoutPort = removePort(cleanHost);

  const domain = await prisma.domain.findFirst({
    where: {
      status: "ACTIVE",
      OR: [{ host: cleanHost }, { host: hostWithoutPort }],
    },
    include: {
      tenant: true,
    },
  });

  if (!domain?.tenant || domain.tenant.status !== "ACTIVE") {
    return null;
  }

  return domain.tenant;
}

export async function GET(req: Request) {
  try {
    const tenant = await resolveTenant(req);

    if (!tenant) {
      return Response.json({
        success: false,
        error: "Tenant not found",
      });
    }

    const url = new URL(req.url);
    const providerSlug = url.searchParams.get("provider")?.trim() || "";

    if (providerSlug) {
      const provider = getPublicProviderCards().find(
        (item) => item.slug === providerSlug
      );
      const games = getPublicProviderGameList(providerSlug);

      if (!provider) {
        return Response.json({
          success: false,
          error: "Provider not found",
        });
      }

      return Response.json({
        success: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          code: tenant.code,
          status: tenant.status,
        },
        provider,
        games,
        data: games,
      });
    }

    const providers = getPublicProviderCards();

    return Response.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        code: tenant.code,
        status: tenant.status,
      },
      // Backward-compatible untuk frontend provider grid.
      games: providers,
      providers,
      providerGames: publicProviderGames,
      allGames: getAllPublicGames(),
    });
  } catch (error) {
    console.error("GET_PUBLIC_GAMES_ERROR:", error);

    return Response.json({
      success: false,
      error: getErrorMessage(error),
    });
  }
}
