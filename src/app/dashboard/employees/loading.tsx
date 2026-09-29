export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 dark:bg-zinc-950/60 backdrop-blur-sm">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#134086] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-zinc-900 dark:text-zinc-100 font-semibold text-lg animate-pulse">Loading Employees...</p>
      </div>
    </div>
  );
}
