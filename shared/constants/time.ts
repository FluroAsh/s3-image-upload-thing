export const TIME = {
	seconds: {
		perMinute: 60,
		perHour: 3600,
		perDay: 86400,
	},
	minutes: {
		perHour: 60,
		perDay: 1440,
	},
	milliseconds: {
		perSecond: 1000,
		perMinute: 60 * 1000,
		perHour: 3600 * 1000,
		perDay: 86400 * 1000,
	},
} as const;
