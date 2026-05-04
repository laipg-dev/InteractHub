import React from "react";

/**
 * PostCardSkeleton
 * Drop-in loading placeholder for PostCard.
 * Usage:
 *   {loading ? Array.from({ length: 3 }).map((_, i) => <PostCardSkeleton key={i} />) : posts.map(...)}
 */
const PostCardSkeleton: React.FC = () => {
  return (
    <div className="overflow-hidden rounded-[32px] border border-gray-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="h-11 w-11 rounded-2xl bg-slate-200 dark:bg-slate-700" />
          <div className="space-y-2">
            {/* Name */}
            <div className="h-3.5 w-28 rounded-full bg-slate-200 dark:bg-slate-700" />
            {/* Date */}
            <div className="h-2.5 w-16 rounded-full bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
        {/* Menu button */}
        <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800" />
      </div>

      {/* Content */}
      <div className="space-y-2.5 px-5 py-5">
        <div className="h-3.5 w-full rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="h-3.5 w-4/5 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="h-3.5 w-3/5 rounded-full bg-slate-100 dark:bg-slate-800" />
      </div>

      {/* Image placeholder — shown ~50% of the time via width trick */}
      <div className="px-5 pb-5">
        <div className="h-52 w-full rounded-[24px] bg-slate-100 dark:bg-slate-800" />
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between border-t border-gray-100 bg-slate-50/70 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="flex gap-2">
          <div className="h-9 w-20 rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-9 w-20 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="h-9 w-24 rounded-2xl bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
  );
};

export default PostCardSkeleton;
