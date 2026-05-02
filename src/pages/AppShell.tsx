import { useWeekStore } from "@/hooks/useWeekStore";
import AppLayout from "@/components/AppLayout";
import { useOutlet } from "react-router-dom";
import { Outlet } from "react-router-dom";

export default function AppShell() {
  const store = useWeekStore();

  return (
    <AppLayout>
      <Outlet context={store} />
    </AppLayout>
  );
}