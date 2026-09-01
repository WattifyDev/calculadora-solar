import { PrismaClient } from '@/generated/prisma'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdmin() {
    console.log('🗑️  Cleaning up database...')

    // Clean up all tables in proper order (considering foreign key constraints)
    await prisma.submission.deleteMany({})
    await prisma.material.deleteMany({})
    await prisma.systemSetting.deleteMany({})
    await prisma.user.deleteMany({})

    console.log('✅ Database cleaned successfully!')

    console.log('🔐 Creating admin user...')

    // Hash the password
    const hashedPassword = await bcrypt.hash('calculadorasolar@2025', 10)

    // Create admin user
    const admin = await prisma.user.upsert({
        where: { email: 'info@wattify.es' },
        update: {
            password: hashedPassword,
            name: 'Admin',
            role: 'ADMIN',
        },
        create: {
            email: 'info@wattify.es',
            password: hashedPassword,
            name: 'Admin',
            role: 'ADMIN',
            domain: 'wattify.es',
            smtpHost: 'smtp.ionos.es',
            smtpPort: 587,
            smtpUser: 'herramientas@wattify.es',
            smtpPassword: 'CPiTWdYb9rZHR45',
            smtpFrom: 'herramientas@wattify.es',
            priceKW: 1200
        },
    })

    // Create normal user
    const user = await prisma.user.upsert({
        where: { email: 'cliente@gmail.com' },
        update: {
            password: hashedPassword,
            name: 'Cliente',
            role: 'USER',
        },
        create: {
            email: 'cliente@gmail.com',
            password: hashedPassword,
            name: 'Cliente',
            role: 'USER',
            smtpHost: 'smtp.ionos.es',
            domain: 'wattify.es',
            priceKW: 0.20,
            smtpPort: 587,
            smtpUser: 'herramientas@wattify.es',
            smtpPassword: 'CPiTWdYb9rZHR45',
            smtpFrom: 'herramientas@wattify.es'
        },
    })

    console.log('✅ Admin user created successfully!')
    console.log(`📧 Email: ${admin.email}`)
    console.log(`👤 Name: ${admin.name}`)
    console.log(`🔑 Role: ${admin.role}`)
    console.log('✅ Normal user created successfully!')
    console.log(`📧 Email: ${user.email}`)
    console.log(`👤 Name: ${user.name}`)
    console.log(`🔑 Role: ${user.role}`)
}

createAdmin()
    .catch((e) => {
        console.error('❌ Error creating admin user:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
