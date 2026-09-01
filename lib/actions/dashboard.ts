import { prisma } from "@/lib/db"
import { getUser } from "@/lib/user"

export type DashboardStats = {
    totalSubmissions: number
    todaySubmissions: number
    monthSubmissions: number
    recentSubmissions: Array<{
        id: string
        address: string
        createdAt: Date
    }>
}

export async function getDashboardStats(): Promise<DashboardStats> {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get user for domain filtering
    const user = await getUser();
    const isAdmin = user?.role === "ADMIN";
    const whereClause = isAdmin ? undefined : { origin: user?.domain };

    try {
        // Parallelize all queries for better performance
        const [totalSubmissions, todaySubmissions, monthSubmissions, recentSubmissions] = await Promise.all([
            prisma.submission.count({
                where: whereClause,
            }),
            prisma.submission.count({
                where: {
                    ...whereClause,
                    createdAt: {
                        gte: startOfToday,
                    },
                },
            }),
            prisma.submission.count({
                where: {
                    ...whereClause,
                    createdAt: {
                        gte: startOfMonth,
                    },
                },
            }),
            prisma.submission.findMany({
                take: 5,
                orderBy: {
                    createdAt: 'desc',
                },
                where: whereClause,
                select: {
                    id: true,
                    address: true,
                    createdAt: true,
                },
            })
        ]);

        return {
            totalSubmissions,
            todaySubmissions,
            monthSubmissions,
            recentSubmissions,
        }
    } catch (error) {
        console.error("Database connection issue in getDashboardStats:", error);
        return {
            totalSubmissions: 0,
            todaySubmissions: 0,
            monthSubmissions: 0,
            recentSubmissions: [],
        }
    }
}