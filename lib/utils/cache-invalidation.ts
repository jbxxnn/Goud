/**
 * Cache invalidation utilities for staff assignments
 * Updates cache version in localStorage to force fresh fetches
 */

const CACHE_VERSION_KEY = 'staff-assignments-cache-version';

/**
 * Invalidate staff assignments cache
 * Call this after any mutation that affects staff/location/service assignments
 */
export function invalidateStaffAssignmentsCache() {
  localStorage.setItem(CACHE_VERSION_KEY, Date.now().toString());
}

/**
 * Get current cache version
 */
export function getStaffAssignmentsCacheVersion(): string {
  return localStorage.getItem(CACHE_VERSION_KEY) || Date.now().toString();
}

/**
 * Check if response indicates cache should be invalidated
 */
export function shouldInvalidateCache(response: Response): boolean {
  return response.headers.get('X-Cache-Invalidate') === 'staff-assignments';
}

