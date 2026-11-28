import { describe,it,expect } from "vitest";
import { calculatePayroll,weeklyPayrollHours,validatePeriod,type PayrollTicket } from "../../../supabase/functions/_shared/payroll-calculation";
import type { ContractTerms } from "../../../supabase/functions/_shared/contract-rates";
import { payPeriodEnd } from "./pay-period";
const term:ContractTerms={contract_id:"contract-1",assignment_id:"assignment-1",contract_reference:"Framing",worker_name:"Fixture worker",worker_code:"W1",client_name:"Fixture client",pay_rate:40,bill_rate:null,currency:"USD"};
const ticket:PayrollTicket={id:"ticket-1",worker_id:"worker-1",work_date:"2026-11-23",regular_hours:8,overtime_hours:0,double_time_hours:0};
const period={period_start:"2026-11-23",period_end:"2026-11-29",pay_date:"2026-11-30"};
const terms=new Map([[ticket.id,term]]);
describe("real payroll calculations",()=>{
  it("calculates regular, 1.5x overtime, deductions and net pay from the agreed $40 rate",()=>{
    const t={...ticket,overtime_hours:2};const r=calculatePayroll(period,[t],[t],terms,new Map(),[{worker_id:"worker-1",label:"Advance repayment",amount:100}]);
    expect(r.workers[0]).toMatchObject({regular_pay:320,overtime_pay:120,gross_pay:440,deductions:100,net_pay:340,total_pay:340});
    const [header,line]=r.csv.split("\n").map(row=>row.split(","));
    expect(Number(line[header.indexOf("net_pay")])).toBe(340);
    expect(line[header.indexOf("period_start")]).toBe("2026-11-23");
    expect(line[header.indexOf("pay_date")]).toBe("2026-11-30");
  });
  it("calculates double-time at 2x without guessing tax withholding",()=>{
    const t={...ticket,double_time_hours:1};const r=calculatePayroll(period,[t],[t],terms,new Map());
    expect(r.workers[0]).toMatchObject({double_time_pay:80,gross_pay:400,deductions:0,net_pay:400});
  });
  it("caps weekly regular hours at 40 and upgrades extra regular hours to overtime",()=>{
    const ts=Array.from({length:6},(_,i)=>({...ticket,id:`t${i}`,work_date:`2026-11-${23+i}`}));
    const r=calculatePayroll(period,ts,ts,new Map(ts.map(t=>[t.id,term])),new Map());
    expect(r.workers[0]).toMatchObject({regular_hours:40,overtime_hours:8,gross_pay:2080});
  });
  it("uses earlier approved work in the same week across split pay periods",()=>{
    const ts=Array.from({length:6},(_,i)=>({...ticket,id:`t${i}`,work_date:`2026-11-${23+i}`}));
    const t=ts[5];const r=calculatePayroll({...period,period_start:"2026-11-28"},[t],ts,new Map([[t.id,term]]),new Map());
    expect(r.workers[0]).toMatchObject({regular_hours:0,overtime_hours:8,gross_pay:480});
  });
  it("resets the 40-hour regular cap each Monday",()=>{
    const a={...ticket,regular_hours:40};const b={...ticket,id:"next",work_date:"2026-11-30"};
    expect(weeklyPayrollHours([a,b])[1].regular_hours).toBe(8);
  });
  it("applies deductions once across multiple tickets without negative ticket net pay",()=>{
    const b={...ticket,id:"ticket-2",work_date:"2026-11-24"};const r=calculatePayroll(period,[ticket,b],[ticket,b],new Map([[ticket.id,term],[b.id,term]]),new Map(),[{worker_id:"worker-1",label:"Authorized repayment",amount:500}]);
    expect(r.workers[0]).toMatchObject({gross_pay:640,deductions:500,net_pay:140});
    const rows=r.csv.split("\n").map(l=>l.split(","));const idx=rows[0].indexOf("net_pay");
    expect([Number(rows[1][idx]),Number(rows[2][idx])]).toEqual([0,140]);
  });
  it("keeps reimbursements separate from gross, deductions and net",()=>{
    const r=calculatePayroll(period,[ticket],[ticket],terms,new Map([[ticket.id,{exp:15,mile:5}]]),[{worker_id:"worker-1",label:"Repayment",amount:20}]);
    expect(r.workers[0]).toMatchObject({gross_pay:320,reimbursements:20,deductions:20,net_pay:300,total_pay:320});
    expect(r.totals.grand_total).toBe(320);
  });
  it("rejects deductions that exceed gross pay",()=>{
    expect(()=>calculatePayroll(period,[ticket],[ticket],terms,new Map(),[{worker_id:"worker-1",label:"Repayment",amount:321}])).toThrow("exceed gross pay");
  });
  it("rejects a deduction for a worker outside the payroll",()=>{
    expect(()=>calculatePayroll(period,[ticket],[ticket],terms,new Map(),[{worker_id:"other-worker",label:"Repayment",amount:1}])).toThrow("payroll worker");
  });
  it("rejects invalid dates and a pay date before the period ends",()=>{
    expect(()=>validatePeriod({...period,pay_date:"2026-11-28"})).toThrow("Pay date");
    expect(()=>validatePeriod({...period,period_start:"2026-02-31"})).toThrow("valid payroll dates");
  });
  it("supports a seven-day weekly pay period",()=>expect(payPeriodEnd("2026-11-23","weekly")).toBe("2026-11-29"));
  it("supports a fourteen-day pay period",()=>expect(payPeriodEnd("2026-11-23","biweekly")).toBe("2026-12-06"));
  it("supports calendar half-month periods",()=>expect(payPeriodEnd("2026-11-16","semimonthly")).toBe("2026-11-30"));
  it("supports calendar monthly periods",()=>expect(payPeriodEnd("2026-11-01","monthly")).toBe("2026-11-30"));
});