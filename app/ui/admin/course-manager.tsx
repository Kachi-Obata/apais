'use client'

import { createCourse, createSession } from '@/app/lib/admin-actions'

export default function CourseManager() {
    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-8 mt-8">
            <h3 className="text-xl font-bold text-white">Course & Session Management</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Create Course */}
                <form action={createCourse} className="space-y-4">
                    <h4 className="border-b border-gray-600 pb-2 text-blue-400 font-bold">New Course</h4>
                    <input name="code" placeholder="Course Code (e.g. COSC 301)" className="input-dark" required />
                    <input name="title" placeholder="Course Title" className="input-dark" required />
                    <input name="credits" type="number" placeholder="Credits" className="input-dark" required />
                    <button className="btn-primary">Add Course</button>
                </form>

                {/* Create Session */}
                <form action={createSession} className="space-y-4">
                    <h4 className="border-b border-gray-600 pb-2 text-green-400 font-bold">Add Attendance Session</h4>
                    <input name="courseCode" placeholder="Course Code" className="input-dark" required />
                    <input name="date" type="datetime-local" className="input-dark" required />
                    <button className="btn-secondary">Create Session</button>
                </form>
            </div>

            <style jsx>{`
                .input-dark {
                    width: 100%;
                    background: #111827;
                    border: 1px solid #374151;
                    color: white;
                    padding: 0.5rem;
                    border-radius: 0.375rem;
                }
                .btn-primary {
                    width: 100%;
                    background: #2563EB;
                    color: white;
                    padding: 0.5rem;
                    border-radius: 0.375rem;
                    font-weight: bold;
                }
                .btn-primary:hover { background: #1D4ED8; }
                .btn-secondary {
                    width: 100%;
                    background: #059669;
                    color: white;
                    padding: 0.5rem;
                    border-radius: 0.375rem;
                    font-weight: bold;
                }
                .btn-secondary:hover { background: #047857; }
            `}</style>
        </div>
    )
}
