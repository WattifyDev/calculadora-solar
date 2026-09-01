import { PrismaClient, MaterialType, PanelType } from '@/generated/prisma'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

const prisma = new PrismaClient()

async function cleanup() {
    // Delete all existing data in reverse order of dependencies
    console.log('🧹 Cleaning up existing data...')

    await prisma.submission.deleteMany()
    console.log('Deleted all submissions')

    await prisma.material.deleteMany()
    console.log('Deleted all materials')

    await prisma.user.deleteMany()
    console.log('Deleted all users')
}

async function main() {
    // Clean up existing data
    await cleanup()
    console.log('✨ Starting fresh seed...\n')
    // Create admin user
    const hashedPassword = await bcrypt.hash('calculadorasolar@2025', 10)

    const adminInfo = await prisma.user.upsert({
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
    })

    console.log('👤 Created/Updated admin user:', adminInfo.email)

    const admin = await prisma.user.upsert({
        where: { email: 'admin@gmail.com' },
        update: {
            password: hashedPassword,
        },
        create: {
            email: 'admin@gmail.com',
            password: hashedPassword,
            name: 'Admin',
            role: 'ADMIN',
            domain: 'localhost:3000',
            smtpHost: 'smtp.ionos.es',
            smtpPort: 587,
            smtpUser: 'herramientas@wattify.es',
            smtpPassword: 'CPiTWdYb9rZHR45',
            smtpFrom: 'herramientas@wattify.es'
        },
    })

    console.log('👤 Created/Updated admin user:', admin.email)
    // Create client user
    const client = await prisma.user.upsert({
        where: { email: 'client@gmail.com' },
        update: {},
        create: {
            email: 'client@gmail.com',
            password: hashedPassword,
            name: 'Client',
            role: 'USER',
            domain: 'localhost:3001',
            smtpHost: 'smtp.ionos.es',
            smtpPort: 587,
            smtpUser: 'herramientas@wattify.es',
            smtpPassword: 'CPiTWdYb9rZHR45',
            smtpFrom: 'herramientas@wattify.es'
        },
    })

    console.log('👤 Created client user:', client.email)

    // Create sample materials with new schema fields
    const materials = [
        {
            name: 'Panel Solar Longi 550W',
            type: MaterialType.PANEL,
            panelType: PanelType.NORMAL,
            peakPower: null,
            hasBattery: null,
            area: 2.56,
            image: null,
        },
        {
            name: 'Panel Solar JA Solar 460W',
            type: MaterialType.PANEL,
            panelType: PanelType.BLACK,
            peakPower: null,
            hasBattery: null,
            area: 2.25,
            image: null,
        },
        {
            name: 'Panel Solar Trina Vertex S 410W',
            type: MaterialType.PANEL,
            panelType: PanelType.NORMAL,
            peakPower: null,
            hasBattery: null,
            area: 1.95,
            image: null,
        },
        {
            name: 'Inversor Huawei SUN2000 5KTL',
            type: MaterialType.INVERSOR,
            panelType: null,
            peakPower: 5,
            hasBattery: true,
            area: 0.35,
            image: null,
        },
        {
            name: 'Inversor Fronius Primo 6.0',
            type: MaterialType.INVERSOR,
            panelType: null,
            peakPower: 6,
            hasBattery: false,
            area: 0.45,
            image: null,
        },
        {
            name: 'Inversor SMA Sunny Boy 3.0',
            type: MaterialType.INVERSOR,
            panelType: null,
            peakPower: 3,
            hasBattery: true,
            area: 0.30,
            image: null,
        }
    ]

    // Create materials
    console.log('\n📦 Creating materials...')
    for (const material of materials) {
        const createdMaterial = await prisma.material.create({
            data: {
                ...material,
                id: nanoid(),
            },
        })
        console.log(`✓ Created material: ${createdMaterial.name}`)
    }

    console.log('\n✅ Seed completed successfully!')
}

main()
    .catch((e) => {
        console.error('❌ Error during seed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })