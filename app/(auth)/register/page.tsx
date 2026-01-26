import { redirect } from "next/navigation";

export default function RegisterPage() {
	// Redirect to Clerk sign-up
	redirect("/sign-up");
}
