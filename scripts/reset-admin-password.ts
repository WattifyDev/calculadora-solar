import { PrismaClient } from '@/generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🔒 Resetting admin password...');
    const hashedPassword = await bcrypt.hash('calculadorasolar@2025', 10);

    const user = await prisma.user.upsert({
        where: { email: 'info@wattify.es' },
        update: {
            password: hashedPassword,
            role: 'ADMIN',
        },
        create: {
            email: 'info@wattify.es',
            password: hashedPassword,
            name: 'Wattify Admin',
            role: 'ADMIN',
            domain: 'localhost:3000',
            smtpHost: 'smtp.ionos.es',
            smtpPort: 587,
            smtpUser: 'herramientas@wattify.es',
            smtpPassword: 'CPiTWdYb9rZHR45',
            smtpFrom: 'herramientas@wattify.es'
        },
    });

    console.log('✅ Password successfully set for user:', user.email);
}

main()
    .catch((err) => {
        console.error('❌ Error resetting password:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
