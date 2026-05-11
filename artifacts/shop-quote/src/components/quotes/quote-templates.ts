export interface QuoteTemplate {
  id: string;
  label: string;
  description: string;
  processType: string;
  defaults: {
    setupHours: number;
    programmingHours: number;
    machiningMinutesPerPart: number;
    inspectionHours: number;
    deburringMinutesPerPart: number;
    materialWastagePercentage: number;
    toolingAllowance: number;
    outsideProcessing: number;
    packaging: number;
    delivery: number;
    riskPercentage: number;
    profitMarginPercentage: number;
    toleranceClass: string;
    complexity: string;
    surfaceFinish: string;
  };
}

export const QUOTE_TEMPLATES: QuoteTemplate[] = [
  {
    id: "prototype_milling",
    label: "Prototype Milling",
    description: "High setup, heavy programming, elevated risk. Ideal for first-off parts.",
    processType: "Milling",
    defaults: {
      setupHours: 4,
      programmingHours: 3,
      machiningMinutesPerPart: 90,
      inspectionHours: 1,
      deburringMinutesPerPart: 20,
      materialWastagePercentage: 20,
      toolingAllowance: 150,
      outsideProcessing: 0,
      packaging: 10,
      delivery: 0,
      riskPercentage: 20,
      profitMarginPercentage: 35,
      toleranceClass: "Tight",
      complexity: "Complex",
      surfaceFinish: "Fine",
    },
  },
  {
    id: "repeat_milling",
    label: "Repeat Milling Batch",
    description: "Reduced setup, established toolpaths, repeat fixture. Volume efficiency.",
    processType: "Milling",
    defaults: {
      setupHours: 1,
      programmingHours: 0.5,
      machiningMinutesPerPart: 30,
      inspectionHours: 0.5,
      deburringMinutesPerPart: 10,
      materialWastagePercentage: 10,
      toolingAllowance: 50,
      outsideProcessing: 0,
      packaging: 5,
      delivery: 0,
      riskPercentage: 5,
      profitMarginPercentage: 30,
      toleranceClass: "Standard",
      complexity: "Medium",
      surfaceFinish: "Standard",
    },
  },
  {
    id: "cnc_turning",
    label: "CNC Turning",
    description: "Bar-fed turning. Standard tooling allowance, efficient cycle times.",
    processType: "Turning",
    defaults: {
      setupHours: 1,
      programmingHours: 1,
      machiningMinutesPerPart: 15,
      inspectionHours: 0.5,
      deburringMinutesPerPart: 5,
      materialWastagePercentage: 12,
      toolingAllowance: 75,
      outsideProcessing: 0,
      packaging: 5,
      delivery: 0,
      riskPercentage: 8,
      profitMarginPercentage: 30,
      toleranceClass: "Standard",
      complexity: "Medium",
      surfaceFinish: "Standard",
    },
  },
  {
    id: "mill_turn",
    label: "Mill-Turn",
    description: "Live tooling complexity, higher setup multiplier, premium rates.",
    processType: "Mill-Turn",
    defaults: {
      setupHours: 3,
      programmingHours: 2.5,
      machiningMinutesPerPart: 45,
      inspectionHours: 1,
      deburringMinutesPerPart: 15,
      materialWastagePercentage: 15,
      toolingAllowance: 200,
      outsideProcessing: 0,
      packaging: 10,
      delivery: 0,
      riskPercentage: 15,
      profitMarginPercentage: 35,
      toleranceClass: "Tight",
      complexity: "Very Complex",
      surfaceFinish: "Fine",
    },
  },
  {
    id: "fabrication",
    label: "Fabrication / Secondary Ops",
    description: "Welding, assembly, subcontract finishing. Labour-heavy, lower machining.",
    processType: "Other",
    defaults: {
      setupHours: 2,
      programmingHours: 0,
      machiningMinutesPerPart: 0,
      inspectionHours: 1,
      deburringMinutesPerPart: 30,
      materialWastagePercentage: 10,
      toolingAllowance: 50,
      outsideProcessing: 300,
      packaging: 20,
      delivery: 0,
      riskPercentage: 12,
      profitMarginPercentage: 28,
      toleranceClass: "Loose",
      complexity: "Medium",
      surfaceFinish: "Standard",
    },
  },
];
