type DateInput = string | number | Date;

const toDate = (input: DateInput): Date => (input instanceof Date ? input : new Date(input));

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'short' });
const timeFmt = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });
const timeWithSecondsFmt = new Intl.DateTimeFormat(undefined, { timeStyle: 'medium' });

export const formatDate = (input: DateInput): string => dateFmt.format(toDate(input));

export const formatTime = (input: DateInput): string => timeFmt.format(toDate(input));

export const formatTimeWithSeconds = (input: DateInput): string => timeWithSecondsFmt.format(toDate(input));

export const formatDateTime = (input: DateInput): string => `${formatDate(input)} ${formatTime(input)}`;
