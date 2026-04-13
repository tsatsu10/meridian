import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { ProfileSettingsForm } from "./profile-settings-form";

export default async function ProfileSettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col gap-2 mb-8">
          <h1 className="text-2xl font-bold" tabIndex={0}>Profile Settings</h1>
          <p className="text-muted-foreground">
            Manage your personal information and preferences
          </p>
        </div>
        <div className="bg-background rounded-lg border shadow-sm">
          <ProfileSettingsForm user={user} />
        </div>
      </div>
    </div>
  );
}
