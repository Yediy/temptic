import { addDays, endOfMonth, format, getDate, parseISO, setDate } from "date-fns";
export function payPeriodEnd(start:string,type:string){
  if(!start || type==="custom")return "";
  const day=parseISO(start);
  const end=type==="weekly"?addDays(day,6):type==="biweekly"?addDays(day,13):type==="semimonthly"&&getDate(day)<=15?setDate(day,15):endOfMonth(day);
  return format(end,"yyyy-MM-dd");
}