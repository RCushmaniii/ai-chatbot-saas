import { redirect } from "next/navigation";

export default function LoginPage() {
  // Redirect to Clerk sign-in
  redirect("/sign-in");
}
