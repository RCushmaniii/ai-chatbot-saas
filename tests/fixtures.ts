import { expect as baseExpect, test as baseTest } from "@playwright/test";
import { getUnixTime } from "date-fns";
import { createAuthenticatedContext, type UserContext } from "./helpers";

type Fixtures = {
	adaContext: UserContext;
	babbageContext: UserContext;
	curieContext: UserContext;
	requiresAuth: undefined;
};

export const test = baseTest.extend<
	{ requiresAuth: undefined },
	Omit<Fixtures, "requiresAuth">
>({
	requiresAuth: [
		// biome-ignore lint/correctness/noEmptyPattern: Playwright requires object destructuring for fixture deps
		async ({}, use, testInfo) => {
			if (!process.env.E2E_CLERK_USER_USERNAME) {
				testInfo.skip(
					true,
					"E2E_CLERK_USER_USERNAME not set — skipping authenticated test",
				);
			}
			await use();
		},
		{ auto: false },
	],
	adaContext: [
		async ({ browser }, use, workerInfo) => {
			const ada = await createAuthenticatedContext({
				browser,
				name: `ada-${workerInfo.workerIndex}-${getUnixTime(new Date())}`,
			});

			await use(ada);
			await ada.context.close();
		},
		{ scope: "worker" },
	],
	babbageContext: [
		async ({ browser }, use, workerInfo) => {
			const babbage = await createAuthenticatedContext({
				browser,
				name: `babbage-${workerInfo.workerIndex}-${getUnixTime(new Date())}`,
			});

			await use(babbage);
			await babbage.context.close();
		},
		{ scope: "worker" },
	],
	curieContext: [
		async ({ browser }, use, workerInfo) => {
			const curie = await createAuthenticatedContext({
				browser,
				name: `curie-${workerInfo.workerIndex}-${getUnixTime(new Date())}`,
			});

			await use(curie);
			await curie.context.close();
		},
		{ scope: "worker" },
	],
});

export const expect = baseExpect;
