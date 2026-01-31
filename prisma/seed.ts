import { PrismaClient, Role } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const hashedPassword = await bcrypt.hash('p', 10)

    // 1. Create Users
    const admin = await prisma.user.upsert({
        where: { email: 'admin@apais.com' },
        update: {},
        create: {
            email: 'admin@apais.com',
            name: 'Admin User',
            password: hashedPassword,
            role: Role.ADMIN,
        },
    })

    const student = await prisma.user.upsert({
        where: { email: 'student@apais.com' },
        update: {},
        create: {
            email: 'student@apais.com',
            name: 'John Student',
            password: hashedPassword,
            role: Role.STUDENT,
        },
    })

    console.log({ admin, student })

    // 2. Create System Config
    const config = await prisma.systemConfig.create({
        data: {
            // Defaults defined in schema, just creating the row
        }
    }).catch(() => console.log('Config potentially already exists'))

    // 3. Academic Structure
    const school = await prisma.school.create({
        data: {
            name: 'School of Computing',
            departments: {
                create: {
                    name: 'Computer Science',
                }
            }
        }
    })

    // Simplify access for demo
    const dept = (await prisma.department.findMany())[0]

    const level = await prisma.level.create({
        data: { name: '200 Level' }
    })

    const semester = await prisma.semester.create({
        data: { name: 'First Semester 2025/2026', isActive: true }
    })

    // 4. Create a Course
    const course = await prisma.course.create({
        data: {
            code: 'COSC 201',
            title: 'Data Structures',
            credits: 3,
            departmentId: dept.id,
            levelId: level.id,
        }
    })

    // 5. Course Offering
    const offering = await prisma.courseOffering.create({
        data: {
            courseId: course.id,
            semesterId: semester.id,
            requiredAttendance: 0.75,
            attendanceBuffer: 0.10,
        }
    })

    // 6. Enroll Student
    await prisma.enrollment.create({
        data: {
            studentId: student.id,
            offeringId: offering.id,
        }
    })

    // 7. Create Sessions (Mock)
    // Total 20 sessions
    for (let i = 0; i < 20; i++) {
        await prisma.attendanceSession.create({
            data: {
                offeringId: offering.id,
                date: new Date(new Date().setDate(new Date().getDate() + i * 2)), // every 2 days
            }
        })
    }

    // 8. Declare a Miss (to show stats)
    const sessions = await prisma.attendanceSession.findMany({ where: { offeringId: offering.id } })
    if (sessions.length > 0) {
        await prisma.declaredMiss.create({
            data: {
                sessionId: sessions[0].id,
                studentId: student.id,
                reason: 'Sick',
            }
        })
    }

    console.log('Seeding finished.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e: unknown) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
