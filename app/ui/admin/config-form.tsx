'use client'

import { updateSystemConfig } from '@/app/lib/admin-actions'
import { useActionState } from 'react'

export default function ConfigForm({ config }: { config: any }) {
    // Basic form handling, MVP style
    // Ideally useActionState for error handling

    return (
        <form action={updateSystemConfig} className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-6">
            <h3 className="text-xl font-bold text-white mb-4">Urgency & Risk Configuration</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h4 className="text-gray-400 font-bold text-sm uppercase">Urgency Weights (Sum = 1.0)</h4>

                    <div>
                        <label className="text-sm text-gray-300">Deadline Weight</label>
                        <input name="weightDeadline" type="number" step="0.05" defaultValue={config?.weightDeadline ?? 0.4} className="input-dark" />
                    </div>
                    <div>
                        <label className="text-sm text-gray-300">Importance Weight</label>
                        <input name="weightImportance" type="number" step="0.05" defaultValue={config?.weightImportance ?? 0.3} className="input-dark" />
                    </div>
                    <div>
                        <label className="text-sm text-gray-300">Next Class Weight</label>
                        <input name="weightNextClass" type="number" step="0.05" defaultValue={config?.weightNextClass ?? 0.2} className="input-dark" />
                    </div>
                    <div>
                        <label className="text-sm text-gray-300">Effort Fit Weight</label>
                        <input name="weightEffortFit" type="number" step="0.05" defaultValue={config?.weightEffortFit ?? 0.1} className="input-dark" />
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-gray-400 font-bold text-sm uppercase">Windows & Global Defaults</h4>

                    <div>
                        <label className="text-sm text-gray-300">Deadline Window (Days)</label>
                        <input name="deadlineWindowDays" type="number" defaultValue={config?.deadlineWindowDays ?? 14} className="input-dark" />
                    </div>
                    <div>
                        <label className="text-sm text-gray-300">Next Class Window (Hours)</label>
                        <input name="nextClassWindowHours" type="number" defaultValue={config?.nextClassWindowHours ?? 6} className="input-dark" />
                    </div>
                    <div className="pt-4 border-t border-gray-700">
                        <label className="text-sm text-gray-300">Default Attendance Req (0-1)</label>
                        <input name="defaultRequirement" type="number" step="0.01" defaultValue={config?.defaultRequirement ?? 0.75} className="input-dark" />
                    </div>
                    <div>
                        <label className="text-sm text-gray-300">Default Buffer (0-1)</label>
                        <input name="defaultBuffer" type="number" step="0.01" defaultValue={config?.defaultBuffer ?? 0.10} className="input-dark" />
                    </div>
                </div>
            </div>

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded">
                Save Configuration
            </button>
            <style jsx>{`
                .input-dark {
                    width: 100%;
                    background: #111827;
                    border: 1px solid #374151;
                    color: white;
                    padding: 0.5rem;
                    border-radius: 0.375rem;
                }
            `}</style>
        </form>
    )
}
