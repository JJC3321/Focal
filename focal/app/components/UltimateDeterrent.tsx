'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useFocusStore } from '../store/focusStore';

export function UltimateDeterrent() {
    const { pendingMessage, dismissIntervention, resetEscalation } = useFocusStore();

    const handleDismiss = () => {
        dismissIntervention();
        // After Level 3, reset everything to give them a fresh start
        resetEscalation();
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fullscreen-deterrent flex items-center justify-center"
            >
                {/* McDonald's-style background pattern */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.1)_10px,rgba(0,0,0,0.1)_20px)]" />
                </div>

                <motion.div
                    initial={{ scale: 0.5, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                    className="relative z-10 bg-white rounded-3xl p-8 max-w-lg mx-4 shadow-2xl"
                    style={{
                        animation: 'shake 0.5s ease-in-out',
                        animationIterationCount: '3',
                    }}
                >
                    {/* Mock logo */}
                    <div className="flex justify-center mb-6">
                        <div className="flex items-center gap-2">
                            <span className="text-6xl">🍔</span>
                            <div className="text-center">
                                <div className="text-4xl font-bold text-[#da291c]">McFocus</div>
                                <div className="text-sm text-gray-500">Career Alternatives</div>
                            </div>
                        </div>
                    </div>

                    {/* Fake application header */}
                    <div className="bg-[#ffcc00] rounded-lg p-4 mb-6">
                        <h2 className="text-2xl font-bold text-[#da291c] text-center">
                            📋 JOB APPLICATION
                        </h2>
                        <p className="text-center text-sm text-[#da291c]/80 mt-1">
                            Since you're clearly done with your current goals...
                        </p>
                    </div>

                    {/* Message from Focal */}
                    <div className="bg-gray-100 rounded-lg p-4 mb-6">
                        <p className="text-gray-800 text-center leading-relaxed">
                            {pendingMessage ||
                                "Look, I tried to help you. THREE TIMES. But here we are. Maybe flipping burgers is more your speed? No judgment... okay, maybe a little judgment."}
                        </p>
                    </div>

                    {/* Fake form fields */}
                    <div className="space-y-3 mb-6 opacity-50">
                        <div className="flex gap-2">
                            <div className="flex-1 bg-gray-200 rounded h-10 flex items-center px-3 text-gray-400 text-sm">
                                First Name: Procrastinator
                            </div>
                            <div className="flex-1 bg-gray-200 rounded h-10 flex items-center px-3 text-gray-400 text-sm">
                                Last Name: Supreme
                            </div>
                        </div>
                        <div className="bg-gray-200 rounded h-10 flex items-center px-3 text-gray-400 text-sm">
                            Position: Chief Distraction Officer 🎭
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleDismiss}
                            className="w-full py-4 bg-[#da291c] text-white rounded-xl font-bold text-lg hover:bg-[#b71c1c] transition-colors shadow-lg"
                        >
                            😤 FINE, I&apos;LL GET BACK TO WORK
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="w-full py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors"
                        >
                            I deserve this roast tbh
                        </button>
                    </div>

                    {/* Footer joke */}
                    <p className="text-center text-xs text-gray-400 mt-4">
                        *Not affiliated with any fast food chains. But they probably are hiring.
                    </p>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
