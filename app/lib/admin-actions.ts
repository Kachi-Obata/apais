'use server'

import { auth } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const prisma = new PrismaClient()

// Middleware/Auth Check Helper
async function checkAdmin() {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') { // Type assertion needed or extended type
        // Note: we extended session in auth.config/auth.ts but typescript might not know here without custom type defs.
        // We will trust the runtime check or fetch user.
        const email = session?.user?.email
        if (!email) throw new Error("Unauthorized")
        const user = await prisma.user.findUnique({ where: { email } })
        if (user?.role !== 'ADMIN') throw new Error("Forbidden: Admin Access Only")
        return user
    }
    return session.user
}

const configSchema = z.object({
    weightDeadline: z.number().min(0).max(1),
    weightImportance: z.number().min(0).max(1),
    weightNextClass: z.number().min(0).max(1),
    weightEffortFit: z.number().min(0).max(1),
    deadlineWindowDays: z.number().min(1),
    nextClassWindowHours: z.number().min(1),
    defaultRequirement: z.number().min(0).max(1),
    defaultBuffer: z.number().min(0).max(1)
})

export async function updateSystemConfig(formData: FormData) {
    await checkAdmin()

    // Parse and Validate
    // Weights must sum to 1.0 (Approx check)
    const rawData = {
        weightDeadline: parseFloat(formData.get('weightDeadline') as string),
        weightImportance: parseFloat(formData.get('weightImportance') as string),
        weightNextClass: parseFloat(formData.get('weightNextClass') as string),
        weightEffortFit: parseFloat(formData.get('weightEffortFit') as string),
        deadlineWindowDays: parseInt(formData.get('deadlineWindowDays') as string),
        nextClassWindowHours: parseInt(formData.get('nextClassWindowHours') as string),
        defaultRequirement: parseFloat(formData.get('defaultRequirement') as string),
        defaultBuffer: parseFloat(formData.get('defaultBuffer') as string),
    }

    const validated = configSchema.parse(rawData)

    // Sum check
    const sum = validated.weightDeadline + validated.weightImportance + validated.weightNextClass + validated.weightEffortFit
    if (Math.abs(sum - 1.0) > 0.01) {
        throw new Error(`Weights must sum to 1.0. Current sum: ${sum}`)
    }

    // Update (Upsert)
    // Find first or create
    const first = await prisma.systemConfig.findFirst()

    if (first) {
        await prisma.systemConfig.update({
            where: { id: first.id },
            data: validated
        })
    } else {
        await prisma.systemConfig.create({
            data: validated
        })
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard') // Re-rankings might change
}

export async function getSystemConfig() {
    await checkAdmin()
    return await prisma.systemConfig.findFirst()
}

export async function getStats() {
    await checkAdmin()
    const students = await prisma.user.count({ where: { role: 'STUDENT' } })
    const courses = await prisma.course.count()
    const sessions = await prisma.attendanceSession.count()
    return { students, courses, sessions }
}

export async function createCourse(formData: FormData) {
    await checkAdmin()
    const code = formData.get('code') as string
    const title = formData.get('title') as string
    const credits = parseInt(formData.get('credits') as string)

    // Simplification: Assume Single School/Dept/Level/Semester from seed for MVP
    // In real app, these would be selected.
    const dept = await prisma.department.findFirst()
    const level = await prisma.level.findFirst()
    const semester = await prisma.semester.findFirst({ where: { isActive: true } })

    if (!dept || !level || !semester) throw new Error("Missing Academic Structure")

    const course = await prisma.course.create({
        data: {
            code,
            title,
            credits,
            departmentId: dept.id,
            levelId: level.id
        }
    })

    // Also create offering immediately for active semester
    await prisma.courseOffering.create({
        data: {
            courseId: course.id,
            semesterId: semester.id
        }
    })

    revalidatePath('/admin')
}

export async function createSession(formData: FormData) {
    await checkAdmin()
    const courseCode = formData.get('courseCode') as string
    const dateStr = formData.get('date') as string

    const course = await prisma.course.findUnique({ where: { code: courseCode } })
    if (!course) throw new Error("Course not found") // Should handle error better

    // Find offering in active semester
    const semester = await prisma.semester.findFirst({ where: { isActive: true } })
    if (!semester) throw new Error("No active semester")

    const offering = await prisma.courseOffering.findFirst({
        where: { courseId: course.id, semesterId: semester.id }
    })

    if (!offering) throw new Error("Course not offered this semester")

    await prisma.attendanceSession.create({
        data: {
            offeringId: offering.id,
            date: new Date(dateStr)
        }
    })

    revalidatePath('/admin')
}
