type DateInput = string | number | Date;

const toDate = (input: DateInput): Date => (input instanceof Date ? input : new Date(input));

const dateFmt = new Intl.DateTimeFormat('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
const timeFmt = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });

export const formatDate = (input: DateInput): string => dateFmt.format(toDate(input));

export const formatTime = (input: DateInput): string => timeFmt.format(toDate(input));

export const formatDateTime = (input: DateInput): string => `${formatDate(input)} ${formatTime(input)}`;
