type DateInput = string | number | Date;

const toDate = (input: DateInput): Date => (input instanceof Date ? input : new Date(input));

const dateFmt = new Intl.DateTimeFormat('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
const timeFmt = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });
const timeWithSecondsFmt = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

export const formatDate = (input: DateInput): string => dateFmt.format(toDate(input));

export const formatTime = (input: DateInput): string => timeFmt.format(toDate(input));

export const formatDateTime = (input: DateInput): string => `${formatDate(input)} ${formatTime(input)}`;

/** Returns `{ date, time }` where time is in 24-hour format with seconds. */
export const splitDateAndTimeWithSeconds = (input: DateInput): { date: string; time: string } => {
  const d = toDate(input);
  return { date: dateFmt.format(d), time: timeWithSecondsFmt.format(d) };
};
