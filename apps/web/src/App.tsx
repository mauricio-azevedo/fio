export function App() {
  return (
    <main className="min-h-screen bg-base-100 text-base-content">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <p className="mb-6 text-sm font-medium uppercase tracking-[0.28em] text-neutral-500">Fio</p>
        <h1 className="max-w-3xl text-5xl font-semibold tracking-tight md:text-7xl">
          Keep important relationships from fading by inertia.
        </h1>
        <p className="mt-8 max-w-2xl text-lg leading-8 text-neutral-600">
          Fio is a private relationship-care app for small, concrete gestures: messages, calls,
          follow-ups, and promises you do not want to lose.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <button className="btn btn-neutral">Enter Fio</button>
          <button className="btn btn-ghost">View today</button>
        </div>
      </section>
    </main>
  );
}
