import React, { useEffect, useState } from 'react';
import { useTutorial } from '../../context/TutorialContext';
import { useTheme } from '../../context/ThemeContext';
import { ChevronRight, ChevronLeft, X, Sparkles, CheckCircle2, Target, HelpCircle, Compass } from 'lucide-react';

export const TutorialOverlay = () => {
  const {
    isTourActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    nextStep,
    prevStep,
    skipTour,
    finishTour
  } = useTutorial();

  const { theme } = useTheme();

  const [targetRect, setTargetRect] = useState(null);
  const [popoverPos, setPopoverPos] = useState({ top: 100, left: 100 });

  useEffect(() => {
    if (!isTourActive || !currentStep) {
      setTargetRect(null);
      return;
    }

    const updatePosition = () => {
      if (!currentStep.targetSelector) {
        setTargetRect(null);
        return;
      }

      // Support comma-separated selector fallbacks
      const selectors = currentStep.targetSelector.split(',').map(s => s.trim());
      let element = null;
      for (const sel of selectors) {
        element = document.querySelector(sel);
        if (element) break;
      }

      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

        const rect = element.getBoundingClientRect();
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const cardWidth = Math.min(410, windowWidth - 32);
        const cardEstimatedHeight = 310;

        let left = 20;
        let top = 100;

        if (rect.left < 280) {
          // Left sidebar placement: right of target
          left = rect.left + rect.width + 18;
          top = rect.top + rect.height / 2 - cardEstimatedHeight / 2;
        } else {
          // Main screen: below or above
          left = rect.left + rect.width / 2 - cardWidth / 2;
          top = rect.top + rect.height + 16;

          if (top + cardEstimatedHeight > windowHeight - 20) {
            top = rect.top - cardEstimatedHeight - 16;
          }
        }

        // Viewport bounding
        if (left < 16) left = 16;
        if (left + cardWidth > windowWidth - 16) left = windowWidth - cardWidth - 16;

        if (top < 16) top = 16;
        if (top + cardEstimatedHeight > windowHeight - 16) {
          top = windowHeight - cardEstimatedHeight - 16;
        }

        setPopoverPos({ top, left });
      } else {
        setTargetRect(null);
      }
    };

    updatePosition();
    const timer = setTimeout(updatePosition, 250);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isTourActive, currentStepIndex, currentStep]);

  if (!isTourActive || !currentStep) return null;

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;
  const isDark = theme?.mode === 'dark';

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-auto overflow-hidden font-sans">
      {/* Dark overlay backdrop with cutout mask for target element */}
      {targetRect ? (
        <svg className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300 ease-out">
          <defs>
            <mask id="tutorial-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - 6}
                y={targetRect.top - 6}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="16"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(11, 15, 25, 0.82)"
            mask="url(#tutorial-spotlight-mask)"
          />
        </svg>
      ) : (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md transition-all duration-300" />
      )}

      {/* Target spotlight glowing outline ring */}
      {targetRect && (
        <div
          className="absolute rounded-2xl border-2 border-indigo-400 dark:border-indigo-300 shadow-[0_0_35px_rgba(129,140,248,0.95)] pointer-events-none animate-pulse transition-all duration-300 ease-out z-[9999]"
          style={{
            top: `${targetRect.top - 6}px`,
            left: `${targetRect.left - 6}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`
          }}
        />
      )}

      {/* Glassmorphic Ultra-Premium Card */}
      <div
        className={`absolute w-[92vw] sm:w-[410px] max-h-[84vh] flex flex-col rounded-[32px] p-6 transition-all duration-300 ease-out z-[10000] overflow-hidden ${
          isDark
            ? 'bg-[#121424]/95 text-white border border-indigo-500/30 shadow-[0_25px_70px_rgba(0,0,0,0.7)] backdrop-blur-xl'
            : 'bg-white/95 text-slate-900 border border-indigo-100 shadow-[0_25px_60px_rgba(79,70,229,0.15)] backdrop-blur-xl'
        } ${!targetRect ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''}`}
        style={targetRect ? { top: `${popoverPos.top}px`, left: `${popoverPos.left}px` } : {}}
      >
        {/* Ambient Subtle Background Mesh Orbs */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Scrollable Content Container to Prevent Offscreen Overflow */}
        <div className="overflow-y-auto no-scrollbar pr-1 flex-1 relative z-10">
          {/* Top Header Row */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-3 py-1 font-black text-[11px] rounded-full border flex items-center gap-1.5 shadow-xs ${
                isDark 
                  ? 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80' 
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200/80'
              }`}>
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping inline-block" />
                Step {currentStepIndex + 1} of {totalSteps}
              </span>

              {currentStep.type === 'button' && (
                <span className={`px-2.5 py-1 font-black text-[10.5px] rounded-full border flex items-center gap-1 shadow-xs ${
                  isDark 
                    ? 'bg-amber-950/80 text-amber-300 border-amber-800/80' 
                    : 'bg-amber-50 text-amber-700 border-amber-200/80'
                }`}>
                  <Sparkles size={12} className="text-amber-500 animate-spin-slow" /> Action Button
                </span>
              )}
            </div>

            <button
              onClick={skipTour}
              className={`p-1.5 rounded-full transition-all duration-200 hover:scale-110 active:scale-90 ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/80' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
              title="Skip Tour"
            >
              <X size={18} />
            </button>
          </div>

          {/* Title & Description */}
          <div className="mb-5">
            <h3 className={`text-xl sm:text-2xl font-black tracking-tight mb-2.5 leading-snug ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              {currentStep.title}
            </h3>

            <p className={`text-xs sm:text-sm font-medium leading-relaxed ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}>
              {currentStep.description}
            </p>

            {/* Target Highlight Badge */}
            {currentStep.buttonLabel && (
              <div className={`mt-4 p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                isDark 
                  ? 'bg-gradient-to-r from-indigo-950/50 via-purple-950/30 to-indigo-950/50 border-indigo-800/60 text-indigo-200 shadow-inner' 
                  : 'bg-gradient-to-r from-indigo-50/90 via-purple-50/50 to-pink-50/90 border-indigo-200/80 text-indigo-900 shadow-xs'
              }`}>
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-500/30 shrink-0">
                  <Target size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-wider opacity-70">Target Feature</p>
                  <p className="text-xs font-black truncate">{currentStep.buttonLabel}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar & Footer */}
        <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800/80 shrink-0 relative z-10">
          <div className="w-full bg-slate-100 dark:bg-slate-800/80 h-2 rounded-full overflow-hidden mb-4 shadow-inner">
            <div
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full transition-all duration-300 rounded-full shadow-md shadow-indigo-500/40 relative"
              style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={skipTour}
              className={`text-xs font-extrabold transition-all duration-200 px-2 py-1.5 rounded-xl hover:underline ${
                isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              Skip Tour
            </button>

            <div className="flex items-center gap-2.5">
              {!isFirstStep && (
                <button
                  onClick={prevStep}
                  className={`px-4 py-2.5 text-xs font-black rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-1 ${
                    isDark 
                      ? 'bg-slate-800/90 text-slate-200 hover:bg-slate-700/90 border border-slate-700' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                  }`}
                >
                  <ChevronLeft size={16} /> Back
                </button>
              )}

              <button
                onClick={isLastStep ? finishTour : nextStep}
                className="px-6 py-2.5 text-xs font-black text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:brightness-110 hover:scale-105 active:scale-95 rounded-2xl shadow-xl shadow-indigo-500/35 transition-all duration-200 flex items-center gap-2 shrink-0 cursor-pointer"
              >
                {isLastStep ? (
                  <>
                    <CheckCircle2 size={16} /> Finish
                  </>
                ) : (
                  <>
                    Next <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
