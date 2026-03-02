import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
				disallow: [
					"/api/",
					"/admin",
					"/chat",
					"/chat/",
					"/onboarding",
					"/checkout/",
					"/embed/",
					"/demo-ny-english",
					"/documentation",
				],
			},
		],
		sitemap: "https://soyconverso.com/sitemap.xml",
	};
}
