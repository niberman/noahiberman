# Flight Tracking Testing Checklist

## Before Testing
- [ ] Clear browser console
- [ ] Open DevTools Network tab
- [ ] Navigate to the Follow My Flight section

## Test 1: Console Errors (CRITICAL)
### Expected Result: NO 406 Errors
- [ ] Check console for any Supabase 406 errors
- [ ] Verify no "Failed to load resource: the server responded with a status of 406" messages
- [ ] Check Network tab - requests to `current_flight` should return 200 or 204, NOT 406

## Test 2: Mapbox CSS Warning
### Expected Result: NO CSS Warning
- [ ] Check console for Mapbox GL CSS warning
- [ ] Should NOT see: "This page appears to be missing CSS declarations for Mapbox GL JS"

## Test 3: Live Flight Indicators (When Flying)
### Expected Result: Only ONE indicator box
- [ ] Only ONE "LIVE" indicator should appear (top-right corner)
- [ ] Should show tail number, altitude, speed, heading
- [ ] NO duplicate indicators elsewhere on the page
- [ ] Indicator should pulse/animate

## Test 4: UnifiedFlightTracker (When Flying)
### Expected Result: Collapsible card with live map
- [ ] "Live Flight Tracking" card appears in Follow My Flight section
- [ ] Card has green "LIVE" badge in header
- [ ] "Hide/Show Live Map" button is visible
- [ ] Clicking button collapses/expands the map
- [ ] Map shows aircraft position with marker
- [ ] Info overlay shows: Alt, Speed, Heading, Updated time
- [ ] Last update timestamp shows current time
- [ ] Map is interactive (can pan/zoom/rotate)

## Test 5: Static Map (When NOT Flying)
### Expected Result: Static flight map shown
- [ ] NO "LIVE" indicators appear anywhere
- [ ] "Interactive Flight Map" card appears
- [ ] Shows historical flight routes in purple
- [ ] Airport markers visible
- [ ] Can hover over airports to see visit count

## Test 6: Data Accuracy (When Flying)
### Expected Result: Accurate live data
- [ ] Altitude shows realistic value (e.g., 8,000 ft)
- [ ] Speed shows realistic value (e.g., 150 kts)
- [ ] Heading shows value between 0-360°
- [ ] "Updated: [time]" shows recent time (within last 30 seconds)
- [ ] Data updates every ~30 seconds

## Test 7: Mobile Responsiveness
### Expected Result: Works on mobile
- [ ] Indicator boxes are properly sized on mobile
- [ ] Cards are readable and functional
- [ ] Map is interactive on touch devices
- [ ] Collapsible button works on mobile

## Test 8: Performance
### Expected Result: No performance issues
- [ ] No lag when scrolling
- [ ] Map renders smoothly
- [ ] No memory leaks (check DevTools Performance)
- [ ] Animations are smooth

## Issues to Report
If any test fails, note:
1. Which test failed
2. What you expected to see
3. What you actually saw
4. Any console errors
5. Screenshots if possible

## Known Behaviors (NOT bugs)
- Demo data may be used if hex code mapping not found
- Aircraft position updates every 30 seconds (not real-time)
- Map may show "Loading..." briefly on first render
- Static map rotates slowly when not in flight section






