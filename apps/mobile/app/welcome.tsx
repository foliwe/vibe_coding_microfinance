import { Redirect } from "expo-router";

import { SessionLoadingScreen } from "@/features/session-status-screen";
import { WelcomeScreen } from "@/features/welcome-screen";
import { useAppSession } from "@/lib/app-session";

export default function WelcomeRoute() {
  const { profile, ready, session } = useAppSession();

  if (!ready) {
    return (
      <SessionLoadingScreen
        title="Credit Union Mobile"
        subtitle="Restoring your session."
      />
    );
  }

  if (session && profile?.role === "agent") {
    return <Redirect href="/agent" />;
  }

  if (session && profile?.role === "member") {
    return <Redirect href="/member" />;
  }

  return <WelcomeScreen />;
}
