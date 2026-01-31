import LoginForm from '@/app/ui/login-form'
import { ShieldCheckIcon } from '@heroicons/react/24/solid' // I will verify if heroicons is installed, otherwise fallback to svg

export default function LoginPage() {
    return (
        <main className="flex items-center justify-center min-h-screen bg-gray-900">
            <div className="relative w-full max-w-md p-8 bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl pointer-events-none" />

                <div className="flex flex-col items-center mb-8">
                    {/* SVG Icon fallback since I'm not sure if heroicons is installed */}
                    <div className="p-3 bg-blue-500/20 rounded-full mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-blue-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Welcome Back</h1>
                    <p className="text-gray-400 mt-2">Sign in to access your APAIS dashboard</p>
                </div>

                <LoginForm />

                <div className="mt-8 text-center text-xs text-gray-600">
                    APAIS v2.1 • Secure Academic Planning
                </div>
            </div>
        </main>
    )
}
