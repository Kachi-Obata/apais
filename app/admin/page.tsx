import { auth, signOut } from "@/lib/auth"
import { getSystemConfig, getStats } from "@/app/lib/admin-actions"
import ConfigForm from "@/app/ui/admin/config-form"
import CourseManager from "@/app/ui/admin/course-manager"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
    const session = await auth()

    // Double check Role
    // Note: session.user.role might need custom type or we rely on page protection
    // We'll let the action check it or redirect if not present.
    // Assuming middleware handles basic auth, but role check is specific.
    if (!session || (session.user as any).role !== 'ADMIN') {
        redirect('/dashboard') // Kick non admins out
    }

    const config = await getSystemConfig()
    const stats = await getStats()

    return (
        <div className="min-h-screen bg-black p-8 text-white">
            <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500">
                        Admin Console
                    </h1>
                    <p className="text-gray-400">System Configuration & Master Data</p>
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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                    <h3 className="text-gray-400 text-xs uppercase">Total Students</h3>
                    <p className="text-3xl font-bold">{stats.students}</p>
                </div>
                <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                    <h3 className="text-gray-400 text-xs uppercase">Active Courses</h3>
                    <p className="text-3xl font-bold">{stats.courses}</p>
                </div>
            </div>

            <ConfigForm config={config} />
            <CourseManager />
        </div>
    )
}
