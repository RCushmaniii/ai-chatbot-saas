import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-sand">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-xl border border-neutral-200",
            headerTitle: "font-display text-2xl font-bold text-ink",
            headerSubtitle: "text-neutral-600",
            socialButtonsBlockButton:
              "border border-neutral-300 hover:bg-neutral-50",
            formButtonPrimary:
              "bg-brand-cielito hover:bg-brand-cielito/90 text-white",
            footerActionLink: "text-brand-cielito hover:text-brand-cielito/80",
          },
        }}
      />
    </div>
  );
}
