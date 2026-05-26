import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/app/")({
  component: () => {
    const router = useRouter();
    useEffect(() => { router.navigate({ to: "/app/dashboard" }); }, [router]);
    return null;
  },
});
