'use client'

import { useActionState } from 'react'
import { authenticate } from '@/app/lib/actions'

export default function LoginForm() {
    const [errorMessage, formAction, isPending] = useActionState(
        authenticate,
        undefined,
    )

    return (
        <form action={formAction} className="space-y-4 w-full">
            <div>
                <label className="block text-sm font-medium text-gray-200 mb-1" htmlFor="email">
                    Email
                </label>
                <input
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-white outline-none transition-all"
                    id="email"
                    type="email"
                    name="email"
                    placeholder="student@apais.com"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-200 mb-1" htmlFor="password">
                    Password
                </label>
                <input
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-white outline-none transition-all"
                    id="password"
                    type="password"
                    name="password"
                    placeholder="••••••"
                    required
                />
            </div>
            <div className="flex items-center justify-end">
                <div className="text-sm">
                    <a href="#" className="font-medium text-blue-400 hover:text-blue-300">
                        Forgot password?
                    </a>
                </div>
            </div>
            <button
                className="w-full mt-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-disabled={isPending}
            >
                {isPending ? 'Signing in...' : 'Sign In'}
            </button>
            <div
                className="flex h-8 items-end space-x-1"
                aria-live="polite"
                aria-atomic="true"
            >
                {errorMessage && (
                    <p className="text-sm text-red-500">{errorMessage}</p>
                )}
            </div>
        </form>
    )
}
