"use client";

/**
 * Thermal slip for P58E (58mm) portable printer.
 * Design: narrow width, monospace, minimal layout for thermal paper.
 */
export function ReadingSlipThermal({
  companyName,
  meterNumber,
  customerName,
  value,
  unit,
  recordedAt,
  pricePerCubic,
}: {
  companyName?: string;
  meterNumber: string;
  customerName: string;
  value: number | string;
  unit: string;
  recordedAt: string;
  pricePerCubic?: number;
}) {
  const dateStr = new Date(recordedAt).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
  const valueStr = Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 });

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .reading-slip-thermal, .reading-slip-thermal * { visibility: visible; }
          .reading-slip-thermal {
            position: absolute;
            left: 0;
            top: 0;
            width: 58mm;
            min-width: 58mm;
            max-width: 58mm;
            margin: 0;
            padding: 2mm 3mm;
            font-size: 9pt;
            line-height: 1.25;
            font-family: "Courier New", Courier, monospace;
            background: white;
            color: black;
            box-shadow: none;
            border: none;
          }
          .no-print-reading-slip { display: none !important; }
        }
      `}</style>
      <div className="reading-slip-thermal mx-auto w-[58mm] min-w-[58mm] max-w-[58mm] rounded border border-slate-300 bg-white p-2 font-mono text-[10px] leading-tight text-black shadow print:mx-0 print:min-w-0 print:border-0 print:shadow-none print:p-0">
        <div className="text-center font-semibold">
          {companyName || "METER READING"}
        </div>
        <div className="my-1 border-b border-dashed border-slate-400" />
        <div className="space-y-0.5">
          <div className="flex justify-between">
            <span>Meter:</span>
            <span>{meterNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Customer:</span>
            <span className="truncate pl-1 text-right" style={{ maxWidth: "32mm" }}>{customerName}</span>
          </div>
          <div className="flex justify-between">
            <span>Reading:</span>
            <span>{valueStr} {unit}</span>
          </div>
          <div className="flex justify-between">
            <span>Date:</span>
            <span>{dateStr}</span>
          </div>
          {pricePerCubic != null && (
            <div className="flex justify-between">
              <span>Rate:</span>
              <span>${Number(pricePerCubic).toFixed(4)}/m³</span>
            </div>
          )}
        </div>
        <div className="my-1 border-b border-dashed border-slate-400" />
        <div className="text-center text-[9px]">Thank you</div>
      </div>
    </>
  );
}
