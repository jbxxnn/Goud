/**
 * Maps location colors (hex, color names, etc.) to calendar event colors
 */

type CalendarColor = "blue" | "green" | "red" | "yellow" | "purple" | "orange";

/**
 * Convert hex color to one of the predefined calendar colors
 * Uses color distance calculation to find the closest match
 */
function hexToCalendarColor(hex: string): CalendarColor {
  // Remove # if present
  const cleanHex = hex.replace('#', '').toUpperCase();
  
  // Validate hex length
  if (cleanHex.length !== 6) {
    console.warn(`Invalid hex color length: ${hex}, defaulting to blue`);
    return 'blue';
  }
  
  // Parse RGB values
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  
  // Validate parsed values
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    console.warn(`Invalid hex color: ${hex}, defaulting to blue`);
    return 'blue';
  }

  // Predefined calendar color RGB values
  const calendarColors: { [key in CalendarColor]: [number, number, number] } = {
    blue: [59, 130, 246],      // #3b82f6
    green: [34, 197, 94],      // #22c55e
    red: [239, 68, 68],        // #ef4444
    yellow: [234, 179, 8],      // #eab308
    purple: [168, 85, 247],    // #a855f7
    orange: [249, 115, 22],    // #f97316
  };

  // Calculate distance to each calendar color
  let minDistance = Infinity;
  let closestColor: CalendarColor = 'blue';

  for (const [color, [cr, cg, cb]] of Object.entries(calendarColors)) {
    const distance = Math.sqrt(
      Math.pow(r - cr, 2) + Math.pow(g - cg, 2) + Math.pow(b - cb, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = color as CalendarColor;
    }
  }

  return closestColor;
}

/**
 * Convert color name (string) to calendar color
 */
function nameToCalendarColor(colorName: string): CalendarColor {
  const normalized = colorName.toLowerCase().trim();
  
  // Direct mappings
  const colorMap: { [key: string]: CalendarColor } = {
    blue: 'blue',
    green: 'green',
    red: 'red',
    yellow: 'yellow',
    purple: 'purple',
    violet: 'purple',
    orange: 'orange',
    cyan: 'blue',
    teal: 'green',
    lime: 'green',
    pink: 'red',
    indigo: 'purple',
    amber: 'yellow',
  };

  if (colorMap[normalized]) {
    return colorMap[normalized];
  }

  // Default fallback
  return 'blue';
}

/**
 * Maps a location color to a calendar event color
 * Supports hex codes (#RRGGBB or RRGGBB) and color names
 */
export function mapLocationColorToCalendarColor(locationColor: string | null | undefined): CalendarColor {
  if (!locationColor) {
    return 'blue'; // Default color
  }

  const trimmed = locationColor.trim();

  // Check if it's a hex color (6 digits with or without #)
  if (trimmed.startsWith('#') && trimmed.length === 7) {
    return hexToCalendarColor(trimmed);
  }
  
  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) {
    return hexToCalendarColor('#' + trimmed);
  }

  // Handle 3-digit hex colors (e.g., #f00 -> #ff0000)
  if (trimmed.startsWith('#') && trimmed.length === 4 && /^#[0-9A-Fa-f]{3}$/.test(trimmed)) {
    const expanded = '#' + trimmed[1] + trimmed[1] + trimmed[2] + trimmed[2] + trimmed[3] + trimmed[3];
    return hexToCalendarColor(expanded);
  }

  // Check if it matches a predefined calendar color
  const calendarColorNames: CalendarColor[] = ['blue', 'green', 'red', 'yellow', 'purple', 'orange'];
  if (calendarColorNames.includes(trimmed.toLowerCase() as CalendarColor)) {
    return trimmed.toLowerCase() as CalendarColor;
  }

  // Try to map by name
  return nameToCalendarColor(trimmed);
}
