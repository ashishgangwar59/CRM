import { Employee } from "@/lib/models/Employee";
import { SalaryStructure } from "@/lib/models/SalaryStructure";
import { IncentiveConfiguration } from "@/lib/models/IncentiveConfiguration";
import { TaxConfiguration } from "@/lib/models/TaxConfiguration";
import { PfConfiguration } from "@/lib/models/PfConfiguration";
import { DeductionConfiguration } from "@/lib/models/DeductionConfiguration";
import { Team } from "@/lib/models/Team";
import { PayrollAuditLog } from "@/lib/models/PayrollAuditLog";
import mongoose from "mongoose";

export async function calculatePayrollForEmployee(
  employeeId: string, 
  monthYear: string, 
  eligibleRevenue: number = 0, 
  teamGeneratedRevenue: number = 0,
  totalDays: number = 30, 
  LOPDays: number = 0,
  triggerAudit: boolean = true,
  adminUserId?: string,
  manualIncentive: number = 0
) {
  // 1. Get Employee & Salary Structure
  const employee = await Employee.findById(employeeId);
  if (!employee) throw new Error("Employee not found");
  
  const structure = await SalaryStructure.findOne({ employeeId });
  if (!structure) throw new Error("Salary structure not found for employee");

  // 2. Fixed Earnings (Prorated for LOP)
  const paidDays = totalDays - LOPDays;
  const prorationFactor = Math.max(0, paidDays / totalDays);

  const basic = (structure.basic || 0) * prorationFactor;
  const hra = (structure.hra || 0) * prorationFactor;
  const specialAllowance = (structure.specialAllowance || 0) * prorationFactor;
  const metroAllowance = (structure.metroAllowance || 0) * prorationFactor;
  const travelAllowance = (structure.travelAllowance || 0) * prorationFactor;
  
  const totalFixedEarnings = basic + hra + specialAllowance + metroAllowance + travelAllowance;

  // 3 & 4. Calculate Personal Incentive (Priority: Employee -> Designation -> Default)
  let personalIncentive = 0;
  
  // A. Employee Specific Override
  let pIncentiveConfig = await IncentiveConfiguration.findOne({ targetType: "Employee", targetId: employeeId, isActive: true });
  
  // B. Designation Specific
  if (!pIncentiveConfig && employee.designation) {
    pIncentiveConfig = await IncentiveConfiguration.findOne({ targetType: "Designation", designationName: employee.designation, isActive: true });
  }
  
  // C. System Default
  if (!pIncentiveConfig) {
    pIncentiveConfig = await IncentiveConfiguration.findOne({ targetType: "Default", isActive: true });
  }

  if (pIncentiveConfig) {
    if (pIncentiveConfig.incentiveType === "Fixed") {
      personalIncentive = pIncentiveConfig.value;
    } else if (pIncentiveConfig.incentiveType === "Percentage") {
      personalIncentive = (eligibleRevenue * pIncentiveConfig.value) / 100;
    }
  }

  // Add any one-time manual ad-hoc incentive provided by the admin this month
  personalIncentive += manualIncentive;
  // Add fixed self incentive from salary structure
  personalIncentive += (structure.incentive || 0);

  // 5. Calculate Team Business Incentive (If they are a Team Owner)
  let teamBusinessIncentive = 0;
  const team = await Team.findOne({ owner: employeeId });
  
  if (team) {
    // Get team owner specific override or default
    let toIncentiveConfig = await IncentiveConfiguration.findOne({ targetType: "TeamOwner", targetId: employeeId, isActive: true });
    
    // Fallback to general TeamOwner config
    if (!toIncentiveConfig) {
      toIncentiveConfig = await IncentiveConfiguration.findOne({ targetType: "TeamOwner", targetId: { $exists: false }, isActive: true });
    }

    if (toIncentiveConfig) {
      if (toIncentiveConfig.incentiveType === "Percentage") {
         // Team Owner gets the Budget Remainder for each member's sale.
         // E.g., if Budget is 4%, and Member is 1%, Owner gets (4% - 1%) = 3% of that Member's sales.
         // NOTE: Since individual member revenue is not fully tracked yet (teamGeneratedRevenue is aggregate),
         // this represents the overall mathematical budget structure.
         // A full implementation will iterate: sum((OwnerBudget - MemberIncentive) * MemberRevenue)
         
         // For now, applying the baseline overall Budget % calculation logic:
         teamBusinessIncentive = (teamGeneratedRevenue * toIncentiveConfig.value) / 100;
      } else {
         teamBusinessIncentive = toIncentiveConfig.value;
      }
    }
  }

  // Add fixed team/branch incentive from salary structure based on designation
  if (employee.designation && employee.designation.toLowerCase().includes("branch head")) {
    teamBusinessIncentive += (structure.fullBranchIncentive || 0);
  } else {
    teamBusinessIncentive += (structure.teamIncentive || 0);
  }

  // 6. Gross Salary
  const grossSalary = totalFixedEarnings + personalIncentive + teamBusinessIncentive;

  // 7. Calculate PF
  let pfAmount = 0;
  const pfConfig = await PfConfiguration.findOne({ isActive: true });
  if (pfConfig) {
    const basisAmount = pfConfig.calculationBasis === "Basic" ? basic : grossSalary;
    let cappedAmount = basisAmount;
    if (pfConfig.isCapped && pfConfig.ceilingAmount) {
      cappedAmount = Math.min(basisAmount, pfConfig.ceilingAmount);
    }
    pfAmount = (cappedAmount * pfConfig.employeePercentage) / 100;
  }

  // 8. Calculate Tax
  let taxAmount = 0;
  const annualizedGross = grossSalary * 12;
  const taxConfig = await TaxConfiguration.findOne({ isActive: true }).sort({ createdAt: -1 });
  
  if (taxConfig && annualizedGross > taxConfig.thresholdAmount) {
    let totalAnnualTax = 0;
    for (const slab of taxConfig.slabs) {
      if (annualizedGross > slab.minAmount) {
        let taxableInSlab = 0;
        if (slab.maxAmount && annualizedGross > slab.maxAmount) {
          taxableInSlab = slab.maxAmount - slab.minAmount;
        } else {
          taxableInSlab = annualizedGross - slab.minAmount;
        }
        totalAnnualTax += (taxableInSlab * slab.percentage) / 100;
      }
    }
    taxAmount = totalAnnualTax / 12; // Monthly TDS Deduction
  }

  // 9. Calculate Other Deductions (PTax, etc)
  let otherDeductions = 0;
  let ptax = 0;
  const dedConfigs = await DeductionConfiguration.find({ isActive: true });
  
  for (const ded of dedConfigs) {
    let dedAmount = 0;
    if (ded.deductionType === "Fixed") {
      dedAmount = ded.value;
    } else if (ded.deductionType === "Percentage") {
      const basis = ded.calculationBasis === "Basic" ? basic : grossSalary;
      dedAmount = (basis * ded.value) / 100;
    }
    
    if (ded.deductionName.toLowerCase().includes("professional tax") || ded.deductionName.toLowerCase().includes("ptax")) {
      ptax += dedAmount;
    } else {
      otherDeductions += dedAmount;
    }
  }

  // 11. Loss of Pay Amount (for display purposes)
  const baseFixed = (structure.basic || 0) + (structure.hra || 0) + (structure.specialAllowance || 0) + (structure.metroAllowance || 0) + (structure.travelAllowance || 0);
  const lopAmount = baseFixed - totalFixedEarnings;

  // 12. Total Deductions
  const advanceSalary = structure.advanceSalaryDrawn || 0;
  const totalDeductions = pfAmount + taxAmount + ptax + otherDeductions + advanceSalary;

  // 13. Net Salary
  const netSalary = grossSalary - totalDeductions;

  const result = {
    earnings: {
      basic,
      hra,
      specialAllowance,
      metroAllowance,
      travelAllowance,
      bonus: 0,
      personalIncentive,
      teamBusinessIncentive,
      otherEarnings: 0,
      overtimeAmount: 0
    },
    deductions: {
      pf: pfAmount,
      esi: 0,
      professionalTax: ptax,
      incomeTax: taxAmount,
      loan: 0,
      advance: 0,
      advanceSalaryDrawn: advanceSalary,
      unpaidLeaveDeduction: lopAmount,
      otherDeductions
    },
    grossSalary,
    totalDeductions,
    netSalary,
    paidDays,
    totalDays,
    monthYear
  };

  // Optional Audit Trail
  if (triggerAudit && adminUserId) {
    await PayrollAuditLog.create({
      actionType: "Calculation",
      entityType: "Payroll",
      employeeId: employeeId,
      newValues: result,
      reason: `Automated Payroll Run for ${monthYear}`,
      changedBy: adminUserId
    });
  }

  return result;
}
