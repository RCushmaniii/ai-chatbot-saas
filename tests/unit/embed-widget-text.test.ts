import assert from "node:assert/strict";
import { describe, test } from "node:test";
import vm from "node:vm";
import { PICK_LANGUAGE_JS } from "@/lib/embed/script";
import {
	localizeWidgetText,
	pickLanguage,
	WIDGET_COPY,
} from "@/lib/embed/widget-text";

describe("visitor text per language (lesson 3)", () => {
	const saved = {
		welcomeMessage: "Hello from the owner",
		placeholder: "Ask away",
	};

	test("English gets the saved English text", () => {
		assert.deepEqual(localizeWidgetText(saved, null, "en"), {
			welcomeMessage: "Hello from the owner",
			placeholder: "Ask away",
			suggestedQuestions: undefined,
		});
	});

	test("Spanish NEVER falls back to the English text", () => {
		const es = localizeWidgetText(saved, null, "es");
		assert.equal(es.welcomeMessage, undefined);
		assert.equal(es.placeholder, undefined);
	});

	test("saved Spanish is used for Spanish only", () => {
		const both = { ...saved, welcomeMessage_es: "Hola del dueño" };
		assert.equal(
			localizeWidgetText(both, null, "es").welcomeMessage,
			"Hola del dueño",
		);
		assert.equal(
			localizeWidgetText(both, null, "en").welcomeMessage,
			"Hello from the owner",
		);
	});

	test("questions with no language count as English only", () => {
		const questions = [
			{ question: "Price?" },
			{ question: "Hours?", question_es: "¿Horario?" },
		];
		assert.deepEqual(
			localizeWidgetText(null, questions, "en").suggestedQuestions,
			["Price?", "Hours?"],
		);
		assert.deepEqual(
			localizeWidgetText(null, questions, "es").suggestedQuestions,
			["¿Horario?"],
		);
	});

	test("no questions in a language means the built-in list, not an empty one", () => {
		assert.equal(
			localizeWidgetText(null, [{ question: "Price?" }], "es")
				.suggestedQuestions,
			undefined,
		);
	});

	test("blank strings count as not saved", () => {
		assert.equal(
			localizeWidgetText({ welcomeMessage_es: "   " }, null, "es")
				.welcomeMessage,
			undefined,
		);
	});

	test("every built-in string exists in both languages", () => {
		assert.deepEqual(
			Object.keys(WIDGET_COPY.en).sort(),
			Object.keys(WIDGET_COPY.es).sort(),
		);
		for (const [key, value] of Object.entries(WIDGET_COPY.es)) {
			assert.ok(
				Array.isArray(value) ? value.length > 0 : String(value).trim(),
				`es.${key} is empty`,
			);
		}
	});
});

describe("widget language (lesson 9)", () => {
	const browser = (() => {
		const ctx: Record<string, unknown> = {};
		vm.runInNewContext(
			`${PICK_LANGUAGE_JS}; this.pickLanguage = pickLanguage;`,
			ctx,
		);
		return ctx.pickLanguage as typeof pickLanguage;
	})();

	const CASES: Array<[string | null, string | null, string | null, string]> = [
		["es", null, "en", "es"],
		[null, "es", "en", "es"],
		[null, null, "es-MX", "es"],
		[null, null, "ES", "es"],
		["en", null, "es", "en"],
		[null, null, "en-US", "en"],
		[null, null, null, "en"],
		["", "", "es", "es"],
		["  ", null, "es", "es"],
		[null, null, "est", "en"],
		[null, null, "fr", "en"],
	];

	for (const [dataLanguage, language, htmlLang, expected] of CASES) {
		test(`${JSON.stringify([dataLanguage, language, htmlLang])} → ${expected}, in TypeScript and in the loader`, () => {
			assert.equal(pickLanguage(dataLanguage, language, htmlLang), expected);
			assert.equal(browser(dataLanguage, language, htmlLang), expected);
		});
	}
});
