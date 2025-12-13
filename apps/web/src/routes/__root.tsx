import { createRootRouteWithContext, Outlet } from "@tanstack/solid-router";
import Header from "@/components/header";
export type RouterContext = {};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <div class="grid h-svh grid-rows-[auto_1fr] overflow-hidden">
        <Header />
        <Outlet />
      </div>
      {/* <TanStackRouterDevtools /> */}
    </>
  );
}
