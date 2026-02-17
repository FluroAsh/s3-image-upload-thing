import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "@/css/globals.css";

import { GlobalProviders } from "@/lib/providers/global-providers";

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	weight: ["100", "900"],
	fallback: ["Arial", "sans-serif"],
	subsets: ["latin"],
});

const geistSans = Geist({
	variable: "--font-geist-sans",
	weight: ["100", "500", "900"],
	fallback: ["Arial", "sans-serif"],
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "S3 Image Upload Thing",
	description: "Manage images on S3",
	icons: {
		icon: "/static/favicon-192x192.ico",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className="dark">
			<body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
				<div className="min-h-screen w-screen grid grid-rows-[auto_1fr_auto]">
					{/* <header className="bg-sky-600 text-center">Placeholder Header</header> */}
					<GlobalProviders>{children}</GlobalProviders>
					{/* <footer className="bg-red-600 text-center">Placeholder Footer</footer> */}
				</div>
			</body>
		</html>
	);
}
