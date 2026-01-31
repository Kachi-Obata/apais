import { getRankedCourses, getUrgentTasks } from "@/app/lib/student-actions"
import { auth, signOut } from "@/lib/auth"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

function RiskBadge({ category }: { category: string }) {
    const colors = {
        SAFE: "bg-green-500/20 text-green-400 border-green-500/50",
        WARNING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
        CRITICAL: "bg-orange-500/20 text-orange-400 border-orange-500/50",
        FAILING: "bg-red-500/20 text-red-400 border-red-500/50",
    }
    const colorClass = colors[category as keyof typeof colors] || "bg-gray-500"

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-bold border ${colorClass}`}>
            {category}
        </span>
    )
}

function AttendanceCard({ course }: { course: any }) {
    // Current Attendance Display
    const percentage = (course.currentAttendance * 100).toFixed(1)
    const reqPercentage = (course.requirement * 100).toFixed(0)

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:bg-gray-800/80 transition-all">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-bold text-white">{course.courseCode}</h3>
                    <p className="text-sm text-gray-400">{course.courseTitle}</p>
                </div>
                <RiskBadge category={course.riskCategory} />
            </div>

            <div className="space-y-4">
                {/* Progress Bar */}
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">Attendance</span>
                        <span className="text-white font-mono">{percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                            className={`h-2 rounded-full ${course.currentAttendance < course.requirement ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(100, course.currentAttendance * 100)}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Required: {reqPercentage}%</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider">Missed</p>
                        <p className="text-2xl font-bold text-white">{course.missedSessions} <span className="text-sm text-gray-500">/ {course.totalSessions}</span></p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider">Remaining</p>
                        <p className={`text-2xl font-bold ${course.remainingAllowableMisses < 1 ? 'text-red-500' : 'text-white'}`}>
                            {course.remainingAllowableMisses}
                        </p>
                        <p className="text-xs text-gray-500">Allowable Misses</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

function UrgencyCard({ task }: { task: any }) {
    // 0.8-1.0 Do Now (Red/Pink), 0.5-0.79 Do Soon (Orange), 0.2-0.49 Plan (Blue), <0.2 Park (Gray)
    const score = task.urgencyScore
    let color = "border-l-4 border-gray-500"
    let label = "PARK"

    if (score >= 0.8) {
        color = "border-l-4 border-red-500 bg-red-900/10"
        label = "DO NOW"
    } else if (score >= 0.5) {
        color = "border-l-4 border-orange-500 bg-orange-900/10"
        label = "DO SOON"
    } else if (score >= 0.2) {
        color = "border-l-4 border-blue-500 bg-blue-900/10"
        label = "PLAN"
    }

    return (
        <div className={`p-4 bg-gray-800 rounded-r-xl mb-3 ${color} flex justify-between items-center group hover:bg-gray-750 transition-all`}>
            <div>
                <h4 className="font-bold text-white group-hover:text-blue-400 transition-colors">{task.title}</h4>
                <div className="flex gap-3 mt-1 text-xs text-gray-400">
                    <span>Deadline: {new Date(task.deadline).toLocaleDateString()}</span>
                    <span>Score: {score.toFixed(2)}</span>
                </div>
            </div>
            <div className="text-right">
                <span className="text-xs font-bold text-gray-300 block">{label}</span>
                <span className="text-xs text-gray-500">{(score * 100).toFixed(0)}</span>
            </div>
        </div>
    )
}

export default async function Dashboard() {
    const session = await auth()
    if (!session) redirect('/login')

    const courses = await getRankedCourses()
    const tasks = await getUrgentTasks()

    return (
        <div className="min-h-screen bg-gray-900 p-8">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Academic Dashboard</h1>
                    <p className="text-gray-400">Welcome back, {session.user?.name}</p>
                </div>
                <form action={async () => {
                    'use server'
                    await signOut()
                }}>
                    <button className="px-4 py-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors">
                        Sign Out
                    </button>
                </form>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Col: Course Risk (2/3 width) */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        Course Risk Monitor
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {courses.map(course => (
                            <AttendanceCard key={course.offeringId} course={course} />
                        ))}
                        {courses.length === 0 && (
                            <p className="text-gray-500 italic">No courses enrolled.</p>
                        )}
                    </div>
                </div>

                {/* Right Col: Task Urgency (1/3 width) */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        Task Urgency
                    </h2>

                    <div className="bg-gray-900/50 rounded-xl">
                        {tasks.map(task => (
                            <UrgencyCard key={task.id} task={task} />
                        ))}
                        {tasks.length === 0 && (
                            <p className="text-gray-500 italic">No pending tasks.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
