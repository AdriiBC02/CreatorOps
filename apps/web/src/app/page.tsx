import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold mb-4">
          <span className="text-primary">Creator</span>Ops
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Manage and grow your YouTube channel with powerful automation,
          analytics, and cross-platform publishing tools.
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
          >
            Dashboard
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 rounded-lg border bg-card">
            <h3 className="font-semibold mb-2">Upload & Schedule</h3>
            <p className="text-sm text-muted-foreground">
              Automate video uploads with scheduled publishing and metadata management.
            </p>
          </div>
          <div className="p-6 rounded-lg border bg-card">
            <h3 className="font-semibold mb-2">Analytics</h3>
            <p className="text-sm text-muted-foreground">
              Track performance with retention graphs, comparisons, and trend detection.
            </p>
          </div>
          <div className="p-6 rounded-lg border bg-card">
            <h3 className="font-semibold mb-2">Cross-Platform</h3>
            <p className="text-sm text-muted-foreground">
              Automatically publish to TikTok, Instagram Reels, and X from one place.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
