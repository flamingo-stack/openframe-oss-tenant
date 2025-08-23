# OpenFrame Frontend Icons

This directory contains shared icon files for the OpenFrame frontend application.

## Icon Organization

### Shared Icons
Place commonly used SVG icons here that are used across multiple components:
- Social media icons (if not using UI-Kit versions)
- Custom OpenFrame-specific icons
- Third-party service icons

### UI-Kit Icons
Most icons should come from the UI-Kit:
```typescript
import { 
  OpenFrameLogo,
  GitHubIcon, 
  XLogo,
  // ... other icons
} from '@flamingo/ui-kit/components/icons'
```

### Icon Guidelines
1. **Use UI-Kit First**: Always check if an icon exists in UI-Kit before adding here
2. **SVG Format**: All icons should be SVG format for scalability
3. **Consistent Sizing**: Use consistent viewBox and sizing conventions
4. **ODS Colors**: Icons should use ODS design tokens for colors when possible
5. **Naming**: Use kebab-case for file names (e.g., `custom-icon.svg`)

### Example Usage
```typescript
// For icons in this directory
<img src="/icons/custom-icon.svg" alt="Custom Icon" className="w-6 h-6" />

// For UI-Kit icons (preferred)
<OpenFrameLogo className="w-6 h-6" />
```

### Platform-Specific Icons
For OpenFrame-specific icons, consider:
- Adding them to the UI-Kit if they're reusable
- Placing them here if they're OpenFrame frontend specific
- Using proper ODS theming for consistency