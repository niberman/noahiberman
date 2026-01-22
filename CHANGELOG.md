# Changelog

A consolidated history of fixes, features, and improvements.

---

## Recent Updates

### Flight Tracking System
- **Fixed**: Supabase 406 errors by changing `.single()` to `.maybeSingle()`
- **Fixed**: Duplicate flight indicators - now shows single clean indicator
- **Fixed**: Mapbox CSS warnings with global import
- **Added**: Collapsible live flight tracking map
- **Added**: Last update timestamp for live data
- **Improved**: Background map transitions seamlessly into interactive card
- **Improved**: Data accuracy with fallback calculations for heading

### Mobile Responsiveness
- Added mobile hamburger menu with smooth animations
- Responsive text sizing across all breakpoints (4xl → 8xl)
- Touch-friendly buttons with 44px minimum targets
- iOS safe area inset support
- Optimized map rendering for mobile devices
- Enhanced viewport configuration for mobile browsers

### Dashboard System
- Built comprehensive owner dashboard at `/dashboard`
- AI Agents management card
- Personal CRM with contact tracking
- Aircraft status monitoring
- Flight tracking integration
- AI post generator with image upload
- Full Row Level Security (RLS) on all tables

### Security & Authentication
- Secret dashboard access system (hidden click zones, keyboard shortcuts, mobile gestures)
- Protected routes with Supabase authentication
- Content Security Policy (CSP) headers for Cloudflare
- Environment variable validation and fixes

### Environment & Configuration
- Fixed invalid Mapbox tokens
- Corrected Supabase API keys
- Updated CSP headers for Cloudflare Insights
- Improved Vite server configuration

---

## Testing

See `TESTING_CHECKLIST.md` for comprehensive testing procedures.

---

## Documentation

- **Main README**: Project overview and setup
- **QUICKSTART**: 5-minute setup guide
- **DASHBOARD_README**: Dashboard features and API
- **DASHBOARD_STRUCTURE**: File organization

---

## Known Issues & Resolutions

All major issues have been resolved. See git history for detailed fix information.

---

*For detailed technical documentation, see individual README files in the root directory.*
