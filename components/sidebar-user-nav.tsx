"use client";

import { SignOutButton, UserButton, useUser } from "@clerk/nextjs";
import { ChevronUp, LogOut } from "lucide-react";
import Image from "next/image";
import { useTheme } from "next-themes";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { AuthUser } from "@/lib/auth";
import { LoaderIcon } from "./icons";

export function SidebarUserNav({ user }: { user: AuthUser }) {
	const { isLoaded } = useUser();
	const { setTheme, resolvedTheme } = useTheme();

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						{!isLoaded ? (
							<SidebarMenuButton className="h-10 justify-between bg-background data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
								<div className="flex flex-row gap-2">
									<div className="size-6 animate-pulse rounded-full bg-zinc-500/30" />
									<span className="animate-pulse rounded-md bg-zinc-500/30 text-transparent">
										Loading auth status
									</span>
								</div>
								<div className="animate-spin text-zinc-500">
									<LoaderIcon />
								</div>
							</SidebarMenuButton>
						) : (
							<SidebarMenuButton
								className="h-10 bg-background data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
								data-testid="user-nav-button"
							>
								<Image
									alt={user.email ?? "User Avatar"}
									className="rounded-full"
									height={24}
									src={
										user.avatarUrl || `https://avatar.vercel.sh/${user.email}`
									}
									width={24}
								/>
								<span className="truncate" data-testid="user-email">
									{user.name || user.email}
								</span>
								<ChevronUp className="ml-auto" />
							</SidebarMenuButton>
						)}
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-(--radix-popper-anchor-width)"
						data-testid="user-nav-menu"
						side="top"
					>
						<DropdownMenuItem
							className="cursor-pointer"
							data-testid="user-nav-item-theme"
							onSelect={() =>
								setTheme(resolvedTheme === "dark" ? "light" : "dark")
							}
						>
							{`Toggle ${resolvedTheme === "light" ? "dark" : "light"} mode`}
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem className="p-0" data-testid="user-nav-item-auth">
							<UserButton
								appearance={{
									elements: {
										rootBox: "w-full",
										userButtonTrigger:
											"w-full justify-start px-2 py-1.5 text-sm",
									},
								}}
								showName
							/>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<SignOutButton redirectUrl="/">
							<DropdownMenuItem
								className="cursor-pointer text-red-600"
								data-testid="user-nav-sign-out"
							>
								<LogOut className="mr-2 size-4" />
								Sign out
							</DropdownMenuItem>
						</SignOutButton>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
