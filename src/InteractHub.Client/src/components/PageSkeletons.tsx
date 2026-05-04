export const RouteLoading = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      <p className="text-sm font-semibold text-gray-500">Đang tải trang...</p>
    </div>
  </div>
);

export const FeedSkeleton = () => (
  <div className="min-h-screen bg-[#F3F4F6] flex flex-col font-sans animate-pulse">
    <div className="h-20 bg-white border-b border-gray-100" />
    <div className="flex flex-1 max-w-[1440px] mx-auto w-full gap-8 px-8 py-8">
      <aside className="hidden lg:flex flex-col w-64 space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-12 rounded-2xl bg-white" />
        ))}
      </aside>
      <main className="flex-1 max-w-2xl space-y-6">
        <div className="h-28 rounded-[32px] bg-white" />
        <div className="h-52 rounded-[32px] bg-white" />
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-[32px] bg-white p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-gray-200" />
                <div className="h-3 w-24 rounded bg-gray-100" />
              </div>
            </div>
            <div className="h-4 w-full rounded bg-gray-100" />
            <div className="h-4 w-4/5 rounded bg-gray-100" />
            <div className="h-52 rounded-2xl bg-gray-100" />
          </div>
        ))}
      </main>
      <aside className="hidden xl:flex flex-col w-80 space-y-6">
        <div className="h-64 rounded-[32px] bg-white" />
        <div className="h-48 rounded-[32px] bg-white" />
      </aside>
    </div>
  </div>
);

export const SearchResultsSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    {Array.from({ length: 4 }).map((_, index) => (
      <div
        key={index}
        className="rounded-[28px] border border-gray-100 bg-white p-5 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gray-200" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-40 rounded bg-gray-200" />
            <div className="h-3 w-24 rounded bg-gray-100" />
          </div>
        </div>
        <div className="h-4 w-full rounded bg-gray-100" />
        <div className="h-4 w-3/4 rounded bg-gray-100" />
        <div className="h-36 rounded-2xl bg-gray-100" />
      </div>
    ))}
  </div>
);
