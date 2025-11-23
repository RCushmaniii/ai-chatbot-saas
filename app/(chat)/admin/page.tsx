import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import { AdminTabs } from "@/components/admin-tabs";


export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Optional: Add admin check here if you want to restrict access
  // For now, any logged-in user can access

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your AI chatbot's knowledge base and settings
            </p>
          </div>
          <AdminTabs />
        </div>
      </div>
    </div>
  );
}
