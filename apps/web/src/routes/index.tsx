import { createFileRoute } from "@tanstack/solid-router";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

// * This page shows briefly before redirecting to the first network
// * The redirect happens in __root.tsx when networks are loaded
function IndexPage() {
  return (
    <div class="flex h-full items-center justify-center">
      <div class="text-center text-neutral-600">
        <pre class="mb-4 font-mono text-neutral-700 text-xs">
          {`
     ███████╗██╗██████╗  ██████╗
     ╚══███╔╝██║██╔══██╗██╔════╝
       ███╔╝ ██║██████╔╝██║
      ███╔╝  ██║██╔══██╗██║
     ███████╗██║██║  ██║╚██████╗
     ╚══════╝╚═╝╚═╝  ╚═╝ ╚═════╝
          `}
        </pre>
        <p>Loading networks...</p>
      </div>
    </div>
  );
}
