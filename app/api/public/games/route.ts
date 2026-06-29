import {
  getAllPublicGames,
  getPublicProviderCards,
  getPublicProviderGameList,
  publicProviderGames,
} from "@/lib/public-game-data";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  return "Unknown error";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const providerSlug =
      url.searchParams.get("provider")?.trim() || "";

    if (providerSlug) {
      const provider = getPublicProviderCards().find(
        (item) => item.slug === providerSlug
      );

      if (!provider) {
        return Response.json({
          success: false,
          error: "Provider not found",
        });
      }

      const games =
        getPublicProviderGameList(providerSlug);

      return Response.json({
        success: true,
        provider,
        games,
        data: games,
      });
    }

    const providers = getPublicProviderCards();

    return Response.json({
      success: true,
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