import { Redirect } from "expo-router";

import { SessionLoadingScreen } from "@/features/session-status-screen";
import { WelcomeScreen } from "@/features/welcome-screen";
import { useAppSession } from "@/lib/app-session";

export default function IndexRoute() {
  const { profile, ready, session } = useAppSession();

  if (!ready) {
    return (
      <SessionLoadingScreen
        title="Credit Union Mobile"
        subtitle="Checking your saved session and mobile access."
      />
    );
  }

  if (!session || !profile) {
    return <WelcomeScreen />;
  }

  if (profile.role === "agent") {
    return <Redirect href="/agent" />;
  }

  if (profile.role === "member") {
    return <Redirect href="/member" />;
  }

  return <Redirect href="/welcome" />;
}
