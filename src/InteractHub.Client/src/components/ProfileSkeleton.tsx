import React from "react";

/**
 * ProfileSkeleton
 * Full-page loading state for Profile.tsx
 * Usage: replace the loading spinner block in Profile.tsx with this
 */
const ProfileSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 animate-pulse">
      {/* Cover */}
      <div className="h-60 bg-slate-200 dark:bg-slate-800 md:h-80" />

      <div className="max-w-5xl mx-auto px-4">
        <div className="relative -mt-16 flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="h-32 w-32 rounded-[40px] bg-slate-300 shadow-xl dark:bg-slate-700 md:h-40 md:w-40" />

          {/* Name */}
          <div className="mt-6 h-9 w-56 rounded-2xl bg-slate-200 dark:bg-slate-700" />
          {/* Bio */}
          <div className="mt-3 h-4 w-72 rounded-full bg-slate-100 dark:bg-slate-800" />
          <div className="mt-2 h-4 w-48 rounded-full bg-slate-100 dark:bg-slate-800" />

          {/* Stats */}
          <div className="mt-6 flex gap-8">
            <div className="flex flex-col items-center gap-1">
              <div className="h-6 w-8 rounded-lg bg-slate-200 dark:bg-slate-700" />
              <div className="h-2.5 w-12 rounded-full bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="h-6 w-8 rounded-lg bg-slate-200 dark:bg-slate-700" />
              <div className="h-2.5 w-12 rounded-full bg-slate-100 dark:bg-slate-800" />
            </div>
          </div>

          {/* Action button */}
          <div className="mt-5 h-11 w-40 rounded-2xl bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>

      {/* Content grid */}
      <div className="max-w-5xl mx-auto px-4 mt-12 grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left sidebar */}
        <div className="md:col-span-4 space-y-3">
          <div className="rounded-[32px] border border-gray-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5 h-5 w-24 rounded-full bg-slate-200 dark:bg-slate-700" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="mb-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800" />
                <div className="space-y-1.5">
                  <div className="h-2.5 w-16 rounded-full bg-slate-100 dark:bg-slate-800" />
                  <div className="h-3 w-28 rounded-full bg-slate-200 dark:bg-slate-700" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right feed */}
        <div className="md:col-span-8 space-y-5">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-[32px] border border-gray-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-11 w-11 rounded-2xl bg-slate-200 dark:bg-slate-700" />
                <div className="space-y-2">
                  <div className="h-3 w-24 rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="h-2.5 w-14 rounded-full bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800" />
                <div className="h-3 w-3/4 rounded-full bg-slate-100 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileSkeleton;
