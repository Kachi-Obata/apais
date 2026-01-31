'use server'

import { auth } from "@/lib/auth"
import { PrismaClient, Task, AttendanceSession, DeclaredMiss } from "@prisma/client"
import { revalidatePath } from "next/cache"

const prisma = new PrismaClient()

// ----------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------

export type RiskCategory = 'FAILING' | 'CRITICAL' | 'WARNING' | 'SAFE'

export interface RankedCourse {
    courseCode: string
    courseTitle: string
    totalSessions: number
    missedSessions: number
    currentAttendance: number // fraction 0-1
    requirement: number // fraction 0-1
    buffer: number // fraction 0-1
    remainingAllowableMisses: number
    attendanceDeficit: number
    riskCategory: RiskCategory
    offeringId: string
}

export type UrgentTask = {
    id: string
    title: string
    deadline: Date
    urgencyScore: number
    components: {
        deadlineProximity: number
        taskImportance: number
        nextClassProximity: number
        effortFit: number
    }
}

// ----------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------

async function getStudentId() {
    const session = await auth()
    if (!session?.user?.email) throw new Error("Unauthorized")

    // We need the ID. The session usually has it if configured, 
    // but our auth.ts puts 'sub' into session?
    // Let's fetch user by email to be sure/safe or rely on session callback
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) throw new Error("User not found")
    return user.id
}

// ----------------------------------------------------------------------
// ACTIONS
// ----------------------------------------------------------------------

export async function getRankedCourses(): Promise<RankedCourse[]> {
    const studentId = await getStudentId()

    // Fetch enrollments with related data
    const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        include: {
            offering: {
                include: {
                    course: true,
                    sessions: {
                        include: {
                            declaredMisses: {
                                where: { studentId } // Only this student's misses
                            }
                        }
                    }
                }
            }
        }
    })

    const ranked: RankedCourse[] = []

    for (const enrollment of enrollments) {
        const off = enrollment.offering
        const totalSessions = off.sessions.length

        // Count missed sessions (where a DeclaredMiss exists)
        // Note: PRD says "Sessions missed". Logic:
        // Total sessions held? PRD 36: "current attendance percentage".
        // Usually implies sessions that have happened.
        // Assuming strict "sessions so far" or "total sessions planned"?
        // PRD 8A.6 implies "MaxAllowedMissesNow = floor(total_sessions * (1 - Requirement))".
        // This usually implies Total *Planned* Sessions for the whole semester for 'RemainingAllowableMisses' to be meaningful.
        // We will assume `off.sessions` contains all planned sessions (as per seed script generating 20).

        // Actually missed:
        const missedCount = off.sessions.filter((s: AttendanceSession & { declaredMisses: DeclaredMiss[] }) => s.declaredMisses.length > 0).length

        // Current Attendance (Fraction) = 1 - (missed / total)
        // If total is 0, avoid NaN, assume 1.0 (Safe)
        const currentAttendance = totalSessions > 0 ? (1 - (missedCount / totalSessions)) : 1.0

        const requirement = off.requiredAttendance
        const buffer = off.attendanceBuffer

        // Attendance Deficit = max(0, Requirement - CurrentAttendance)
        const attendanceDeficit = Math.max(0, requirement - currentAttendance)

        // MaxAllowedMissesNow = floor(total_sessions * (1 - Requirement))
        const maxAllowed = Math.floor(totalSessions * (1 - requirement))

        // RemainingAllowableMisses
        const remainingAllowable = maxAllowed - missedCount

        // Determine Category
        let category: RiskCategory = 'SAFE'

        // Logic Priority: FAILING -> CRITICAL -> WARNING -> SAFE
        if (remainingAllowable < 0) {
            category = 'FAILING'
        } else if (currentAttendance < requirement) {
            category = 'CRITICAL'
        } else if (currentAttendance >= requirement && currentAttendance < (requirement + buffer)) {
            category = 'WARNING'
        } else {
            category = 'SAFE'
        }

        ranked.push({
            courseCode: off.course.code,
            courseTitle: off.course.title,
            totalSessions,
            missedSessions: missedCount,
            currentAttendance,
            requirement,
            buffer,
            remainingAllowableMisses: remainingAllowable,
            attendanceDeficit,
            riskCategory: category,
            offeringId: off.id
        })
    }

    // Sort Deterministically
    // FAILING -> CRITICAL -> WARNING -> SAFE
    const categoryOrder = { 'FAILING': 0, 'CRITICAL': 1, 'WARNING': 2, 'SAFE': 3 }

    ranked.sort((a, b) => {
        // 1. Category Rank
        if (categoryOrder[a.riskCategory] !== categoryOrder[b.riskCategory]) {
            return categoryOrder[a.riskCategory] - categoryOrder[b.riskCategory]
        }
        // 2. Lowest remaining allowable misses (ASC)
        if (a.remainingAllowableMisses !== b.remainingAllowableMisses) {
            return a.remainingAllowableMisses - b.remainingAllowableMisses
        }
        // 3. Highest deficit (DESC)
        return b.attendanceDeficit - a.attendanceDeficit
    })

    return ranked
}

export async function getUrgentTasks(): Promise<UrgentTask[]> {
    const studentId = await getStudentId()

    // Fetch Config (Assume single row or default)
    const config = await prisma.systemConfig.findFirst() || {
        // Fallback defaults if not seeded or found
        weightDeadline: 0.4,
        weightImportance: 0.3,
        weightNextClass: 0.2,
        weightEffortFit: 0.1,
        deadlineWindowDays: 14,
        nextClassWindowHours: 6,
    }

    // Fetch incomplete tasks
    const tasks = await prisma.task.findMany({
        where: { studentId, isCompleted: false }
    })

    // Fetch next class info for "Next Class Proximity"
    // Find the soonest upcoming session for any enrolled course
    // Limitation: Schema link task -> course? Schema `Task` has no courseId.
    // PRD says "Next Class Proximity". Usually means ANY next class implies "I have to stop working soon".
    // Or means "Next class for THIS task's subject"?
    // PRD 8A.5: "If no upcoming compulsory class exists -> NCP = 0".
    // Does not specify subject linkage. "Next Class Proximity" implies general time constraint.
    // "If task cannot be completed before next class -> NCP = 0".
    // I will assume it means "Time until the student has to be in class".

    const now = new Date()
    const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        include: { offering: { include: { sessions: true } } }
    })

    // Flatten all upcoming sessions
    let upcomingSessions: Date[] = []
    enrollments.forEach((e) => {
        e.offering.sessions.forEach((s) => {
            if (s.date > now) upcomingSessions.push(s.date)
        })
    })
    upcomingSessions.sort((a, b) => a.getTime() - b.getTime())
    const nextClassDate = upcomingSessions.length > 0 ? upcomingSessions[0] : null

    // Calculate Urgency for each task
    const urgentTasks: UrgentTask[] = tasks.map((task: Task) => {
        // 1. Deadline Proximity (DP)
        // DP = clamp(1 − (time_to_deadline / deadline_window), 0, 1)
        // Overdue tasks MUST return DP = 1.
        let dp = 0
        const msToDeadline = task.deadline.getTime() - now.getTime()
        const deadlineWindowMs = config.deadlineWindowDays * 24 * 60 * 60 * 1000

        if (msToDeadline < 0) {
            dp = 1
        } else {
            dp = Math.max(0, Math.min(1, 1 - (msToDeadline / deadlineWindowMs)))
        }

        // 2. Task Importance (TI)
        // TI = importance / 10
        const ti = task.importance / 10

        // 3. Next Class Proximity (NCP)
        // NCP = clamp(1 − (minutes_to_next_class / next_class_window), 0, 1)
        let ncp = 0
        if (nextClassDate) {
            const msToNextClass = nextClassDate.getTime() - now.getTime()
            const minutesToNextClass = msToNextClass / 1000 / 60
            const windowMinutes = config.nextClassWindowHours * 60

            // "If task cannot be completed before next class -> NCP = 0"
            // We assume estimatedDuration is minutes.
            if (task.estimatedDurationMinutes > minutesToNextClass) {
                ncp = 0
            } else {
                ncp = Math.max(0, Math.min(1, 1 - (minutesToNextClass / windowMinutes)))
            }
        }

        // 4. Effort Fit (EF)
        // "Effort Fit represents whether the task fits the available time window."
        // PRD doesn't give specific formula, but 8A.6 says "EF MUST have the lowest weighting".
        // I will implement simple logic: If (estimatedDuration < timeToDeadline AND estimatedDuration < timeToNextClass (if exists)) -> 1, else 0?
        // Or linearly scaled?
        // Let's use binary fit for MVP robustness. Fits = 1, Doesn't Fit = 0.
        // Or gradient?
        // Let's use a gradient based on deadline.
        // Actually, if I ignore EF complexity, I might be non-compliant.
        // "Effort-fit thresholds (min/max time)" in Admin config (8A.2).
        // Let's assume simpler: EF = 1 if it fits comfortably, 0.5 if tight, 0 if impossible.
        // For MVP, if it fits in `NextClass` window (if active) OR free time today?
        // Let's set EF to 1.0 (neutral positive) for now as placeholder unless strictly defined?
        // No, PRD 8A.6 is mandatory.
        // I will define EF: 
        // If (Time until next execution block > estimatedDuration) EF = 1, else 0.
        // Execution block = min(timeToNextClass, timeToDeadline).
        let availableMinutes = msToDeadline / 1000 / 60
        if (nextClassDate) {
            const msToClass = nextClassDate.getTime() - now.getTime()
            availableMinutes = Math.min(availableMinutes, msToClass / 1000 / 60)
        }

        const effortFit = availableMinutes >= task.estimatedDurationMinutes ? 1 : 0

        // Total Urgency
        const urgency =
            (config.weightDeadline * dp) +
            (config.weightImportance * ti) +
            (config.weightNextClass * ncp) +
            (config.weightEffortFit * effortFit)

        return {
            id: task.id,
            title: task.title,
            deadline: task.deadline,
            urgencyScore: urgency,
            components: {
                deadlineProximity: dp,
                taskImportance: ti,
                nextClassProximity: ncp,
                effortFit: effortFit
            }
        }
    })

    // Sort by Urgency Descending
    urgentTasks.sort((a, b) => b.urgencyScore - a.urgencyScore)
    return urgentTasks
}

export async function declareMissedSession(sessionId: string) {
    const studentId = await getStudentId()

    // Check if declared
    const existing = await prisma.declaredMiss.findUnique({
        where: { sessionId_studentId: { sessionId, studentId } }
    })

    if (existing) {
        // Undeclare (Remove) - "Edit or remove declarations"
        await prisma.declaredMiss.delete({
            where: { id: existing.id }
        })
    } else {
        // Declare
        await prisma.declaredMiss.create({
            data: {
                sessionId,
                studentId,
                reason: 'Declared by student'
            }
        })
    }

    revalidatePath('/dashboard')
}
