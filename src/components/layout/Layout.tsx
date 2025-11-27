import React from 'react';
import { Activity, CircleHelp } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
    sidebar: React.ReactNode;
    actions?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children, sidebar, actions }) => {
    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-white shadow-md flex flex-col z-10">
                <div className="p-4 border-b flex items-center gap-2 font-bold text-lg text-indigo-600">
                    <Activity className="w-6 h-6" />
                    <span>AcousticAnalyzer</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    {sidebar}
                </div>
                <div className="p-4 border-t text-xs text-gray-500 flex justify-between items-center">
                    <span>v0.3.0</span>
                    <a
                        href="https://github.com/aaronzz00/AcousticAnalyzer/blob/main/docs/USER_MANUAL.md"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-indigo-600 transition-colors"
                        title="User Manual"
                    >
                        <CircleHelp className="w-4 h-4" />
                    </a>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white shadow-sm p-4 flex justify-between items-center">
                    <h1 className="text-xl font-semibold text-gray-800">Analysis Report</h1>
                    <div className="flex gap-2">
                        {actions}
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto p-6">
                    {children}
                </div>
            </main>
        </div>
    );
};
