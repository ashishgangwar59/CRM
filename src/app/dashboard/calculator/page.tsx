"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator } from "lucide-react";

export default function CalculatorPage() {
  const [principal, setPrincipal] = useState<number>(25000);
  const [interestType, setInterestType] = useState<"rupee" | "percent">("rupee");
  const [rate, setRate] = useState<number>(16);
  const [showEquivalent, setShowEquivalent] = useState<boolean>(true);
  
  // Dates
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // Results State
  const [durationText, setDurationText] = useState("0y 0m 0d");
  const [rateDisplay, setRateDisplay] = useState("-");
  const [principalDisplay, setPrincipalDisplay] = useState("-");
  const [monthlyInterest, setMonthlyInterest] = useState("-");
  const [interestAmount, setInterestAmount] = useState("-");
  const [dailyInterest, setDailyInterest] = useState("-");
  const [yearlyInterest, setYearlyInterest] = useState("-");
  const [totalAmount, setTotalAmount] = useState("-");

  // Set default dates on mount
  useEffect(() => {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(today.getMonth() + 1);
    
    setFromDate(formatDateToISO(today));
    setToDate(formatDateToISO(nextMonth));
  }, []);

  const formatDateToISO = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Convert Number to Indian Words
  const numberToIndianWords = (num: number): string => {
    if (num === 0) return "Zero";
    if (isNaN(num) || num < 0) return "";

    const a = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
      "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const helper = (n: number): string => {
      let str = "";
      if (n > 99) {
        str += a[Math.floor(n / 100)] + " Hundred ";
        n %= 100;
      }
      if (n > 19) {
        str += b[Math.floor(n / 10)] + " " + a[n % 10];
      } else if (n > 0) {
        str += a[n];
      }
      return str.trim();
    };

    let temp = Math.round(num);
    let result = "";

    // Crores
    if (temp >= 10000000) {
      result += helper(Math.floor(temp / 10000000)) + " Crore ";
      temp %= 10000000;
    }
    // Lakhs
    if (temp >= 100000) {
      result += helper(Math.floor(temp / 100000)) + " Lakh ";
      temp %= 100000;
    }
    // Thousands
    if (temp >= 1000) {
      result += helper(Math.floor(temp / 1000)) + " Thousand ";
      temp %= 1000;
    }
    result += helper(temp);

    return result.trim().replace(/\s+/g, ' ');
  };

  // Duration Helper
  const calculateDuration = (d1: Date, d2: Date) => {
    const totalMs = d2.getTime() - d1.getTime();
    const totalDays = Math.round(totalMs / (1000 * 60 * 60 * 24));

    let years = d2.getFullYear() - d1.getFullYear();
    let months = d2.getMonth() - d1.getMonth();
    let days = d2.getDate() - d1.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(d2.getFullYear(), d2.getMonth(), 0);
      days += prevMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    return { years, months, days, totalDays };
  };

  // Main Calculation Function
  const calculateAll = () => {
    const P = principal;
    const rateVal = rate;

    if (isNaN(P) || isNaN(rateVal) || !fromDate || !toDate) return;

    const d1 = new Date(fromDate);
    const d2 = new Date(toDate);

    if (d2 < d1) {
      setDurationText("Invalid date range");
      return;
    }

    const duration = calculateDuration(d1, d2);
    const totalDays = duration.totalDays;

    if (totalDays === 0) {
      setDurationText("0y 0m 0d");
      setRateDisplay(interestType === "rupee" ? `₹${rateVal} /100/mo` : `${rateVal}% p.a.`);
      setPrincipalDisplay(`₹${P.toLocaleString("en-IN")}`);
      setMonthlyInterest("₹0");
      setInterestAmount("₹0");
      setDailyInterest("₹0.00");
      setYearlyInterest("₹0.00");
      setTotalAmount(`₹${P.toLocaleString("en-IN")}`);
      return;
    }

    setDurationText(`${duration.years}y ${duration.months}m ${duration.days}d`);

    let monthlyRate = 0;
    let rateDisplayStr = "";
    if (interestType === "rupee") {
      monthlyRate = rateVal;
      rateDisplayStr = `₹${rateVal} /100/mo`;
    } else {
      monthlyRate = rateVal / 12;
      rateDisplayStr = `${rateVal}% p.a.`;
    }

    setRateDisplay(rateDisplayStr);
    setPrincipalDisplay(`₹${P.toLocaleString("en-IN")}`);

    const monthlyInt = P * (monthlyRate / 100);
    setMonthlyInterest(`₹${Math.round(monthlyInt).toLocaleString("en-IN")}`);

    const totalMonthsFraction = duration.years * 12 + duration.months + duration.days / 30;
    const intAmount = monthlyInt * totalMonthsFraction;

    setInterestAmount(`₹${Math.round(intAmount).toLocaleString("en-IN")}`);
    
    const dailyInt = intAmount / totalDays;
    setDailyInterest(`₹${dailyInt.toFixed(2)}`);

    const yearlyInt = monthlyInt * 12;
    setYearlyInterest(`₹${Math.round(yearlyInt).toLocaleString("en-IN")}`);

    const totAmount = P + intAmount;
    setTotalAmount(`₹${Math.round(totAmount).toLocaleString("en-IN")}`);
  };

  // Run calculation when states change
  useEffect(() => {
    calculateAll();
  }, [principal, interestType, rate, fromDate, toDate]);

  const handleClear = () => {
    setPrincipal(0);
    setRate(0);
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(today.getMonth() + 1);
    setFromDate(formatDateToISO(today));
    setToDate(formatDateToISO(nextMonth));
  };

  // Get Equivalent rate text
  const getEquivalentText = () => {
    if (isNaN(rate) || rate <= 0) return "Equivalent: -";
    if (interestType === "rupee") {
      const pa = rate * 12;
      return `Equivalent: ${pa.toFixed(2)}% per annum`;
    } else {
      const pm = rate / 12;
      return `Equivalent: ₹${pm.toFixed(2)} /100/month`;
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* Title Header Banner */}
      <div className="bg-[#0d2452] text-white py-3.5 px-6 rounded-xl shadow-md text-center font-bold tracking-wider text-base md:text-lg flex items-center justify-center gap-2">
        <Calculator className="w-5 h-5 text-amber-500" /> Simple Interest Calculator
      </div>

      {/* Main Form Card */}
      <Card className="border border-zinc-200 dark:border-zinc-800 shadow-xl bg-white dark:bg-zinc-950 overflow-hidden">
        <CardContent className="p-6 md:p-8 space-y-6">
          
          {/* Principal Amount Field */}
          <div className="space-y-2">
            <Label className="text-zinc-900 dark:text-zinc-300 font-bold text-xs uppercase tracking-wide">
              Principal Amount ₹
            </Label>
            <Input 
              type="number" 
              value={principal || ""} 
              onChange={(e) => setPrincipal(Number(e.target.value))} 
              placeholder="Enter amount"
              className="h-10 text-zinc-900 dark:text-white border-zinc-200 dark:border-zinc-800 focus:ring-indigo-500"
            />
            {principal > 0 && (
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-500 italic">
                {numberToIndianWords(principal)} Rupees
              </p>
            )}
          </div>

          {/* Interest Type buttons */}
          <div className="space-y-2">
            <Label className="text-zinc-900 dark:text-zinc-300 font-bold text-xs uppercase tracking-wide">
              Interest Type
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                onClick={() => {
                  setInterestType("rupee");
                  setRate(16);
                }}
                className={`h-10 font-bold text-xs ${
                  interestType === "rupee"
                    ? "bg-[#0d2452] text-white hover:bg-[#0a1c3f]"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300"
                }`}
              >
                ₹ Rupees
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setInterestType("percent");
                  setRate(12);
                }}
                className={`h-10 font-bold text-xs ${
                  interestType === "percent"
                    ? "bg-[#0d2452] text-white hover:bg-[#0a1c3f]"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300"
                }`}
              >
                % Percentage
              </Button>
            </div>
          </div>

          {/* Rate field */}
          <div className="space-y-2">
            <Label className="text-zinc-900 dark:text-zinc-300 font-bold text-xs uppercase tracking-wide">
              {interestType === "rupee" 
                ? "Interest Rate (₹ per ₹100 / month)" 
                : "Interest Rate (% per annum)"
              }
            </Label>
            <Input 
              type="number"
              step="any"
              value={rate || ""}
              onChange={(e) => setRate(Number(e.target.value))}
              placeholder="Enter rate"
              className="h-10 text-zinc-900 dark:text-white border-zinc-200 dark:border-zinc-800"
            />

            {/* Equivalent switcher */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Show equivalent</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={showEquivalent}
                  onChange={(e) => setShowEquivalent(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-emerald-600"></div>
              </label>
            </div>
            {showEquivalent && rate > 0 && (
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-500 italic">
                {getEquivalentText()}
              </p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-900 dark:text-zinc-300 font-bold text-xs uppercase tracking-wide">
                From Date
              </Label>
              <Input 
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-10 text-zinc-900 dark:text-white border-zinc-200 dark:border-zinc-800"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-900 dark:text-zinc-300 font-bold text-xs uppercase tracking-wide">
                To Date
              </Label>
              <Input 
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-10 text-zinc-900 dark:text-white border-zinc-200 dark:border-zinc-800"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="text-center pt-2">
            <Button
              type="button"
              onClick={calculateAll}
              className="bg-[#0d2452] hover:bg-[#0a1c3f] text-white w-full h-11 font-bold rounded-xl shadow-lg transition-transform hover:scale-[1.01]"
            >
              Calculate Interest
            </Button>
            <button
              onClick={handleClear}
              className="text-xs text-[#0d2452] dark:text-indigo-400 font-bold underline mt-4 hover:text-[#0a1c3f]"
            >
              Clear all fields
            </button>
          </div>

        </CardContent>
      </Card>

      {/* Results Section */}
      <Card className="border border-dashed border-amber-350 dark:border-zinc-700 bg-white dark:bg-zinc-950 p-6 md:p-8 rounded-xl shadow-md">
        <div className="flex justify-between items-center border-b pb-3 mb-6">
          <h3 className="text-base font-black text-[#0d2452] dark:text-white uppercase tracking-wider">Results</h3>
          <span className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded border border-amber-300 dark:border-amber-900">
            RECKONED
          </span>
        </div>

        {/* 4 grid values */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs border-b pb-6 mb-6">
          <div>
            <p className="text-zinc-400 uppercase font-bold tracking-wide">Total Duration</p>
            <p className="text-zinc-900 dark:text-white font-black text-sm md:text-base mt-1">{durationText}</p>
          </div>
          <div>
            <p className="text-zinc-400 uppercase font-bold tracking-wide">Interest Rate</p>
            <p className="text-zinc-900 dark:text-white font-black text-sm md:text-base mt-1">{rateDisplay}</p>
          </div>
          <div>
            <p className="text-zinc-400 uppercase font-bold tracking-wide">Principal Amount</p>
            <p className="text-zinc-900 dark:text-white font-black text-sm md:text-base mt-1">{principalDisplay}</p>
          </div>
          <div>
            <p className="text-zinc-400 uppercase font-bold tracking-wide">Monthly Interest</p>
            <p className="text-zinc-900 dark:text-white font-black text-sm md:text-base mt-1">{monthlyInterest}</p>
          </div>
        </div>

        {/* 2 large sub-cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl border border-amber-200 dark:border-zinc-800 bg-amber-50/30 dark:bg-zinc-900/30">
            <p className="text-[10px] uppercase font-black text-amber-600 dark:text-amber-500">Interest Amount</p>
            <p className="text-3xl font-black text-zinc-900 dark:text-white mt-2">{interestAmount}</p>
            <div className="flex justify-between text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mt-4 border-t pt-2 border-amber-200/50">
              <span>Daily: {dailyInterest}</span>
              <span>Yearly: {yearlyInterest}</span>
            </div>
          </div>

          <div className="p-5 rounded-xl border border-emerald-200 dark:border-zinc-850 bg-emerald-50/20 dark:bg-zinc-900/20">
            <p className="text-[10px] uppercase font-black text-emerald-600 dark:text-emerald-500">Total Amount</p>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{totalAmount}</p>
            <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 mt-4 border-t pt-2 border-emerald-200/30">
              Principal + Interest
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
