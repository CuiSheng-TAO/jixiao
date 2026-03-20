"use client";

export default function ErrorPage({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-lg rounded-lg border bg-white p-6 shadow">
        <h2 className="mb-2 text-lg font-bold text-red-600">页面加载出错</h2>
        <p className="mb-4 text-sm text-gray-600">{error.message}</p>
        <pre className="max-h-48 overflow-auto rounded bg-gray-100 p-3 text-xs">
          {error.stack}
        </pre>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          重试
        </button>
      </div>
    </div>
  );
}
