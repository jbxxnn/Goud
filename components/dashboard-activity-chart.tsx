'use client';

interface ActivityData {
  day: string;
  approved: number;
  rescheduled: number;
}

interface DashboardActivityChartProps {
  data: ActivityData[];
  period?: string;
}

export function DashboardActivityChart({ data, period = 'This Week' }: DashboardActivityChartProps) {
  const maxValue = Math.max(
    ...data.map(d => d.approved + d.rescheduled),
    100 // Default max to 100 if no data
  );
  
  const normalizedMax = Math.ceil(maxValue / 20) * 20; // Round up to nearest 20
  const scaleSteps = [20, 40, 60, 80, 100];
  const maxScaleValue = normalizedMax > 100 ? normalizedMax : 100;

  return (
    <div className="space-y-4">
      {/* Y-axis labels and chart */}
      <div className="relative h-[200px]">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-muted-foreground pr-2">
          {scaleSteps.map((step) => (
            <span key={step} className="text-right">
              {step}
            </span>
          ))}
        </div>
        
        {/* Chart area */}
        <div className="ml-8 h-full flex items-end gap-2">
          {data.map((day, index) => {
            const total = day.approved + day.rescheduled;
            const approvedHeight = maxScaleValue > 0 ? (day.approved / maxScaleValue) * 100 : 0;
            const rescheduledHeight = maxScaleValue > 0 ? (day.rescheduled / maxScaleValue) * 100 : 0;
            
            return (
              <div key={index} className="flex-1 flex flex-col justify-end gap-0.5 h-full">
                <div className="flex flex-col-reverse gap-0.5 w-full">
                  {/* Approved segment (bottom, darker) */}
                  <div
                    className="bg-foreground rounded-t"
                    style={{
                      height: `${approvedHeight}%`,
                      minHeight: approvedHeight > 0 ? '2px' : '0',
                    }}
                    title={`${day.day}: ${day.approved} approved`}
                  />
                  
                  {/* Rescheduled segment (top, lighter) */}
                  <div
                    className="bg-muted-foreground/40 rounded-t"
                    style={{
                      height: `${rescheduledHeight}%`,
                      minHeight: rescheduledHeight > 0 ? '2px' : '0',
                    }}
                    title={`${day.day}: ${day.rescheduled} rescheduled`}
                  />
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Grid lines */}
        <div className="absolute left-8 right-0 top-0 bottom-0 pointer-events-none">
          {scaleSteps.map((step) => {
            const position = (step / maxScaleValue) * 100;
            return (
              <div
                key={step}
                className="absolute left-0 right-0 border-t border-border/30"
                style={{ bottom: `${position}%` }}
              />
            );
          })}
        </div>
      </div>
      
      {/* X-axis labels */}
      <div className="ml-8 flex gap-2">
        {data.map((day, index) => (
          <div key={index} className="flex-1 text-center text-xs text-muted-foreground">
            {day.day.slice(0, 3)}
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-foreground" />
          <span className="text-muted-foreground">Approved Appointment</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-muted-foreground/40" />
          <span className="text-muted-foreground">Rescheduled Appointment</span>
        </div>
      </div>
    </div>
  );
}


