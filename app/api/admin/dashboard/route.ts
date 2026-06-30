import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { DomainStatus, Role, TransactionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type AuthPayload = {
  id?: number | string;
  userId?: number | string;
  role?: string;
  tenantId?: string | null;
  isSuperAdmin?: boolean;
};

type DashboardTransactionType =
  | "DEPOSIT"
  | "WITHDRAW"
  | "ADJUSTMENT";

type DashboardTransactionRow = {
  id: string;
  invoiceNo: string;
  playerName: string;
  status: string;
  amount: number;
  type: DashboardTransactionType;
  source: "DEPOSIT" | "WITHDRAWAL" | "TRANSACTION";
  createdAt: Date;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

function getTenantScope(payload: AuthPayload | null) {
  if (!payload) {
    return {
      authorized: false,
      isSuperAdmin: false,
      tenantId: null as string | null,
    };
  }

  const role = String(payload.role || "");
  const isSuperAdmin =
    payload.isSuperAdmin === true || role === Role.SUPER_ADMIN;

  const tenantId = payload.tenantId ? String(payload.tenantId) : null;

  if (!isSuperAdmin && !tenantId) {
    return {
      authorized: false,
      isSuperAdmin,
      tenantId,
    };
  }

  return {
    authorized: true,
    isSuperAdmin,
    tenantId: isSuperAdmin ? null : tenantId,
  };
}

function tenantWhere(tenantId: string | null) {
  if (!tenantId) return {};
  return { tenantId };
}

function dateWhere(tenantId: string | null, startDate: Date) {
  return {
    ...tenantWhere(tenantId),
    createdAt: {
      gte: startDate,
    },
  };
}

function makeInvoice(prefix: string, id: number | string) {
  return `${prefix}-${String(id).padStart(6, "0")}`;
}

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function makeEmptyChart() {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));

    return {
      date: getDateKey(date),
      day: date.toLocaleDateString("id-ID", { weekday: "short" }),
      deposit: 0,
      withdraw: 0,
      adjustment: 0,
    };
  });
}

function classifyTransactionType(type: string): DashboardTransactionType {
  const t = String(type || "").toUpperCase();

  if (t.includes("DEPOSIT")) return "DEPOSIT";
  if (t.includes("WITHDRAW")) return "WITHDRAW";

  return "ADJUSTMENT";
}

function buildChart(rows: DashboardTransactionRow[]) {
  const chart = makeEmptyChart();
  const map = new Map(chart.map((c) => [c.date, c]));

  for (const row of rows) {
    const key = getDateKey(row.createdAt);
    const item = map.get(key);
    if (!item) continue;

    if (row.type === "DEPOSIT") item.deposit += row.amount;
    if (row.type === "WITHDRAW") item.withdraw += row.amount;
    if (row.type === "ADJUSTMENT") item.adjustment += row.amount;
  }

  return chart;
}

function formatPublicRows(rows: DashboardTransactionRow[]) {
  return rows.map((r) => ({
    id: r.id,
    invoiceNo: r.invoiceNo,
    playerName: r.playerName,
    status: r.status,
    amount: r.amount,
    type: r.type,
    source: r.source,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function GET(req: Request) {
  try {
    const payload = getUserFromRequest(req) as AuthPayload | null;
    const scope = getTenantScope(payload);

    if (!scope.authorized) {
      return Response.json(
        { success: false, error: "Unauthorized", message: "Akses ditolak." },
        { status: 401 }
      );
    }

    const tenantId = scope.tenantId;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    const [
      totalPlayers,
      activeDomains,
      totalDeposits,
      totalWithdrawals,
      totalTransactions,
      pendingDeposits,
      pendingWithdrawals,
      pendingTransactions,
      chartDeposits,
      chartWithdrawals,
      chartTransactions,
      recentDeposits,
      recentWithdrawals,
      recentTransactions,
    ] = await Promise.all([
      prisma.user.count({
        where: { ...tenantWhere(tenantId), role: Role.PLAYER },
      }),

      prisma.domain.count({
        where: { ...tenantWhere(tenantId), status: DomainStatus.ACTIVE },
      }),

      prisma.deposit.count({ where: tenantWhere(tenantId) }),
      prisma.withdrawal.count({ where: tenantWhere(tenantId) }),
      prisma.transaction.count({ where: tenantWhere(tenantId) }),

      prisma.deposit.count({
        where: { ...tenantWhere(tenantId), status: TransactionStatus.PENDING },
      }),

      prisma.withdrawal.count({
        where: { ...tenantWhere(tenantId), status: TransactionStatus.PENDING },
      }),

      prisma.transaction.count({
        where: { ...tenantWhere(tenantId), status: TransactionStatus.PENDING },
      }),

      prisma.deposit.findMany({
        where: dateWhere(tenantId, startDate),
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: "asc" },
        take: 500,
      }),

      prisma.withdrawal.findMany({
        where: dateWhere(tenantId, startDate),
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: "asc" },
        take: 500,
      }),

      prisma.transaction.findMany({
        where: dateWhere(tenantId, startDate),
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: "asc" },
        take: 500,
      }),

      prisma.deposit.findMany({
        where: tenantWhere(tenantId),
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),

      prisma.withdrawal.findMany({
        where: tenantWhere(tenantId),
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),

      prisma.transaction.findMany({
        where: tenantWhere(tenantId),
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

    const chartRows: DashboardTransactionRow[] = [
      ...chartDeposits.map((d) => ({
        id: `dep-${d.id}`,
        invoiceNo: makeInvoice("DEP", d.id),
        playerName: d.user.username,
        status: d.status,
        amount: d.amount,
        type: "DEPOSIT" as const,
        source: "DEPOSIT" as const,
        createdAt: d.createdAt,
      })),

      ...chartWithdrawals.map((w) => ({
        id: `wd-${w.id}`,
        invoiceNo: makeInvoice("WD", w.id),
        playerName: w.user.username,
        status: w.status,
        amount: w.amount,
        type: "WITHDRAW" as const,
        source: "WITHDRAWAL" as const,
        createdAt: w.createdAt,
      })),

      ...chartTransactions.map((t) => ({
        id: `trx-${t.id}`,
        invoiceNo: t.invoiceNo || makeInvoice("TRX", t.id),
        playerName: t.user.username,
        status: t.status,
        amount: t.amount,
        type: classifyTransactionType(t.type),
        source: "TRANSACTION" as const,
        createdAt: t.createdAt,
      })),
    ];

    const recentRows: DashboardTransactionRow[] = [
      ...recentDeposits.map((d) => ({
        id: `dep-${d.id}`,
        invoiceNo: makeInvoice("DEP", d.id),
        playerName: d.user.username,
        status: d.status,
        amount: d.amount,
        type: "DEPOSIT" as const,
        source: "DEPOSIT" as const,
        createdAt: d.createdAt,
      })),

      ...recentWithdrawals.map((w) => ({
        id: `wd-${w.id}`,
        invoiceNo: makeInvoice("WD", w.id),
        playerName: w.user.username,
        status: w.status,
        amount: w.amount,
        type: "WITHDRAW" as const,
        source: "WITHDRAWAL" as const,
        createdAt: w.createdAt,
      })),

      ...recentTransactions.map((t) => ({
        id: `trx-${t.id}`,
        invoiceNo: t.invoiceNo || makeInvoice("TRX", t.id),
        playerName: t.user.username,
        status: t.status,
        amount: t.amount,
        type: classifyTransactionType(t.type),
        source: "TRANSACTION" as const,
        createdAt: t.createdAt,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 8);

    const stats = {
      players: totalPlayers,
      totalPlayers,

      transactions:
        totalDeposits + totalWithdrawals + totalTransactions,
      totalTransactions:
        totalDeposits + totalWithdrawals + totalTransactions,

      pending:
        pendingDeposits + pendingWithdrawals + pendingTransactions,
      pendingTransactions:
        pendingDeposits + pendingWithdrawals + pendingTransactions,

      domains: activeDomains,
      activeDomains,

      deposits: totalDeposits,
      withdrawals: totalWithdrawals,
    };

    const chart = buildChart(chartRows);
    const recent = formatPublicRows(recentRows);

    return Response.json({
      success: true,
      stats,
      chart,
      recentTransactions: recent,
      dashboard: {
        stats,
        chart,
        recentTransactions: recent,
      },
    });
  } catch (error) {
    console.error("GET_ADMIN_DASHBOARD_ERROR:", error);

    return Response.json(
      {
        success: false,
        error: getErrorMessage(error),
        message: "Gagal mengambil dashboard.",
      },
      { status: 500 }
    );
  }
}