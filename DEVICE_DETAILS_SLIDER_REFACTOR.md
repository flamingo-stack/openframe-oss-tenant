# DeviceDetailsSlider Refactoring

Brief description: Restructure the DeviceDetailsSlider component to improve organization, consistency, and visual appeal across all modules.

## Completed Tasks

- [x] Initial analysis of DeviceDetailsSlider component structure
- [x] Identify key issues with current implementation
- [x] Create component architecture design
- [x] Create directory structure for new components
- [x] Create base index.vue component with tabbed interface
- [x] Create DeviceHeader component
- [x] Create reusable FilterableTable component with filtering capabilities
- [x] Create VulnerabilityTable component
- [x] Create SoftwareTable component
- [x] Create OverviewSection component
- [x] Create SecuritySection component
- [x] Create SoftwareInventory component
- [x] Create HardwareSection component
- [x] Create NetworkSection component
- [x] Create OSSection component
- [x] Create MobileSection component
- [x] Create UserSection component
- [x] Create ManagementSection component
- [x] Update imports in Devices.vue files to use the new component structure
- [x] Delete the old DeviceDetailsSlider.vue file

## Design Issues to Address

Based on the screenshots review, the following design issues need to be addressed:

1. **Missing Tab Navigation**: The tab navigation system isn't visually implemented despite being in the code structure
2. **Sidebar Width**: The sidebar is too narrow, making content appear crowded
3. **Card Styling Inconsistency**: Cards don't follow OpenFrame's styling guidelines
4. **Table Styling**: Tables lack proper styling according to OpenFrame design system
5. **Content Organization**: Content appears stacked without proper visual hierarchy
6. **Spacing Issues**: Inconsistent spacing throughout the component
7. **Responsive Design**: Current implementation doesn't adapt well to different screen sizes

## Additional Issues Identified (May 2024)

Based on the latest testing and screenshots, these additional issues need to be fixed:

1. **Actions Menu Not Working**: The three-dots actions menu in the device header isn't functioning properly
2. **Insufficient Slider Width**: Despite previous adjustments, the slider width is still not adequate for content
3. **Empty State Color Issues**: The empty state colors don't match the design system and look inconsistent
4. **Table Design Inconsistency**: Table design doesn't match other tables in the application (e.g., UnifiedDeviceTable)

## Design Improvement Plan

### 1. Tab Navigation Implementation

- Implement proper tab navigation using OpenFrame's Tab component
- Design tabs to be visible at the top of the slider content area
- Ensure active tab has proper styling with accent color and indicator
- Include proper icons for each tab category
- Apply consistent padding and spacing to tab content

```vue
<!-- Example Tab Implementation -->
<div class="of-tabs">
  <div class="of-tabs__header">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      class="of-tabs__tab"
      :class="{ 'of-tabs__tab--active': activeTab === tab.value }"
      @click="activeTab = tab.value"
    >
      <i :class="tab.icon" class="mr-2"></i>
      {{ tab.label }}
    </button>
  </div>
  <div class="of-tabs__content">
    <component :is="activeTabComponent" :device="device" />
  </div>
</div>
```

### 2. Sidebar Width and Layout 

- Increase the sidebar width from current size to at least 30% of the screen (min-width: 480px)
- Add proper padding inside the sidebar (24px on all sides)
- Implement smooth transition animation when opening/closing the sidebar
- Add a proper backdrop with opacity when the sidebar is open
- Ensure the sidebar has a proper z-index to display above other elements

```css
.sidebar {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: 480px;
  min-width: 30%;
  max-width: 50%;
  background-color: var(--surface-card);
  padding: 24px;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  transform: translateX(100%);
  transition: transform 0.3s ease;
  z-index: 1000;
  overflow-y: auto;
}

.sidebar.active {
  transform: translateX(0);
}

.sidebar-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: none;
}

.sidebar-mask.active {
  display: block;
}
```

### 3. Card Styling

- Use OpenFrame Card component consistently across all sections
- Apply consistent border-radius, padding, and shadow to all cards
- Add proper spacing between cards (16px)
- Use proper header styling for card titles
- Implement consistent content layout within cards

```vue
<template>
  <div class="of-card">
    <div class="of-card__header">
      <h3 class="of-card__title">{{ title }}</h3>
      <slot name="header-actions"></slot>
    </div>
    <div class="of-card__body">
      <slot></slot>
    </div>
    <div v-if="$slots.footer" class="of-card__footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<style scoped>
.of-card {
  background-color: var(--surface-card);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 16px;
  overflow: hidden;
}

.of-card__header {
  padding: 16px;
  border-bottom: 1px solid var(--surface-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.of-card__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.of-card__body {
  padding: 16px;
}

.of-card__footer {
  padding: 16px;
  border-top: 1px solid var(--surface-border);
}
</style>
```

### 4. Table Design Consistency

- Apply consistent table styling using the OpenFrame DataTable component
- Add proper header styling with background color distinct from the rows
- Add proper hover state for table rows
- Implement proper spacing between columns
- Add zebra striping for better row distinction
- Implement column sorting and filtering consistently

```vue
<template>
  <div class="of-data-table">
    <div class="of-data-table__header">
      <div class="of-data-table__search">
        <InputText v-model="filters.global.value" placeholder="Search..." />
      </div>
    </div>
    <DataTable
      :value="data"
      :paginator="true"
      :rows="10"
      :rowsPerPageOptions="[5, 10, 25, 50]"
      :filters="filters"
      stripedRows
      class="of-data-table__table"
      responsiveLayout="scroll"
    >
      <Column v-for="col in columns" :key="col.field" :field="col.field" :header="col.header" :sortable="col.sortable">
        <template #body="{ data, field }">
          <slot :name="field" :row="data">
            {{ data[field] }}
          </slot>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.of-data-table {
  width: 100%;
}

.of-data-table__header {
  margin-bottom: 16px;
}

.of-data-table__search {
  width: 100%;
}

:deep(.p-datatable) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.p-datatable-header) {
  background-color: var(--surface-section);
  padding: 16px;
}

:deep(.p-datatable-thead > tr > th) {
  background-color: var(--surface-ground);
  color: var(--text-color);
  padding: 12px 16px;
  font-weight: 600;
}

:deep(.p-datatable-tbody > tr > td) {
  padding: 12px 16px;
  border-bottom: 1px solid var(--surface-border);
}

:deep(.p-datatable-tbody > tr:hover) {
  background-color: var(--surface-hover);
}
</style>
```

### 5. Content Organization

- Properly organize content into logical sections with the tabbed interface
- Use clear visual hierarchy with proper heading levels
- Group related information together within each tab
- Use consistent spacing between sections
- Implement collapsible sections for dense information

**Proposed Tab Structure:**

1. **Overview**
   - Basic device information
   - Status indicators
   - Quick action buttons
   
2. **Hardware**
   - CPU information
   - Memory usage
   - Storage details
   - Hardware specifications
   
3. **Network**
   - IP addresses
   - Network interfaces
   - Connectivity status
   
4. **System**
   - Operating system details
   - User information
   - Uptime and boot information
   
5. **Software**
   - Software inventory
   - Version information
   - Installation dates
   
6. **Security**
   - Security status
   - Vulnerabilities
   - Pending updates
   
7. **Management**
   - Management agent details
   - Module-specific information
   - Configuration details

### 6. Spacing and Layout

- Implement consistent spacing system throughout the component
- Use proper margin and padding values based on OpenFrame design system
- Implement proper grid layout for information display
- Use flex layouts for alignment and distribution of elements
- Ensure sufficient white space around elements for better readability

```css
/* Spacing System */
:root {
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
}

.section {
  margin-bottom: var(--spacing-lg);
}

.info-group {
  margin-bottom: var(--spacing-md);
}

.info-row {
  display: flex;
  margin-bottom: var(--spacing-sm);
}

.info-label {
  font-weight: 600;
  flex: 0 0 40%;
  padding-right: var(--spacing-sm);
}

.info-value {
  flex: 1;
}
```

### 7. Responsive Design

- Implement proper responsive breakpoints
- Adjust sidebar width based on screen size
- Stack elements vertically on smaller screens
- Adjust font sizes and spacing for different screen sizes
- Ensure tables have horizontal scroll on smaller screens

```css
/* Responsive Breakpoints */
@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    max-width: 100%;
  }
  
  .info-row {
    flex-direction: column;
  }
  
  .info-label {
    flex: 0 0 100%;
    margin-bottom: var(--spacing-xs);
  }
  
  .info-value {
    flex: 0 0 100%;
  }
  
  .of-tabs__header {
    flex-wrap: wrap;
  }
  
  .of-tabs__tab {
    flex: 1 0 auto;
    min-width: 33.33%;
  }
}
```

## Implementation Tasks for Newly Identified Issues

1. [ ] Fix actions menu in DeviceHeader component
   - Ensure proper event handling for menu toggle
   - Verify CSS z-index and positioning
   - Add click-outside detection to close the menu
   - Test with various device types

2. [ ] Increase slider width and content spacing
   ```css
   .sidebar {
     width: 600px;
     min-width: 40%;
     max-width: 70%;
   }
   
   @media screen and (max-width: 1200px) {
     .sidebar {
       min-width: 50%;
       max-width: 80%;
     }
   }
   
   @media screen and (max-width: 992px) {
     .sidebar {
       min-width: 60%;
       max-width: 90%;
     }
   }
   
   @media screen and (max-width: 768px) {
     .sidebar {
       width: 100%;
       max-width: 100%;
     }
   }
   ```

3. [ ] Update empty state styling to match OpenFrame design system
   ```vue
   <template>
     <div class="of-empty-state">
       <div class="of-empty-state__icon">
         <i :class="icon || 'pi pi-box'"></i>
       </div>
       <h3 class="of-empty-state__title">{{ title }}</h3>
       <p class="of-empty-state__message">{{ message }}</p>
     </div>
   </template>
   
   <style scoped>
   .of-empty-state {
     display: flex;
     flex-direction: column;
     align-items: center;
     justify-content: center;
     padding: var(--spacing-xl, 32px);
     text-align: center;
     background-color: var(--surface-section);
     border-radius: var(--border-radius);
   }
   
   .of-empty-state__icon {
     font-size: 3rem;
     color: var(--primary-color);
     margin-bottom: var(--spacing-md, 16px);
   }
   
   .of-empty-state__title {
     margin: 0 0 var(--spacing-sm, 8px) 0;
     font-size: 1.25rem;
     font-weight: 600;
     color: var(--text-color);
   }
   
   .of-empty-state__message {
     margin: 0;
     font-size: 0.875rem;
     color: var(--text-color-secondary);
   }
   </style>
   ```

4. [ ] Standardize table design to match UnifiedDeviceTable
   ```vue
   <template>
     <FilterableTable
       :data="data"
       :columns="columns"
       :paginate="true"
       :rows="10"
       class="of-table--unified"
     >
       <!-- Templates for columns go here -->
     </FilterableTable>
   </template>
   
   <style scoped>
   :deep(.of-table--unified .p-datatable-header) {
     background-color: var(--surface-card);
     border-bottom: 1px solid var(--surface-border);
   }
   
   :deep(.of-table--unified .p-datatable-thead > tr > th) {
     background-color: var(--surface-section);
     color: var(--text-color);
     padding: 12px 16px;
     font-weight: 600;
     border-color: var(--surface-border);
   }
   
   :deep(.of-table--unified .p-datatable-tbody > tr > td) {
     padding: 12px 16px;
     border-color: var(--surface-border);
   }
   
   :deep(.of-table--unified .p-datatable-tbody > tr:nth-child(even)) {
     background-color: var(--surface-ground);
   }
   
   :deep(.of-table--unified .p-datatable-tbody > tr:hover) {
     background-color: var(--surface-hover);
   }
   
   :deep(.of-table--unified .p-tag) {
     min-width: 75px;
     justify-content: center;
   }
   </style>
   ```

## Updated Implementation Tasks

1. [ ] Fix DeviceHeader actions menu functionality
   ```javascript
   // Update handleClickOutside to properly detect clicks
   const handleClickOutside = (event: MouseEvent) => {
     // Only handle clicks when menu is open
     if (!showActions.value) return;
     
     // Check if click is outside the menu and button
     if (actionsMenu.value && !actionsMenu.value.contains(event.target as Node) && 
         !event.composedPath().includes(actionButton.value as EventTarget)) {
       showActions.value = false;
     }
   };
   ```

2. [ ] Adjust slider width and content spacing
   ```css
   .sidebar {
     width: 600px;
     min-width: 40%;
     max-width: 70%;
   }
   
   @media screen and (max-width: 1200px) {
     .sidebar {
       min-width: 50%;
       max-width: 80%;
     }
   }
   
   @media screen and (max-width: 992px) {
     .sidebar {
       min-width: 60%;
       max-width: 90%;
     }
   }
   
   @media screen and (max-width: 768px) {
     .sidebar {
       width: 100%;
       max-width: 100%;
     }
   }
   ```

3. [ ] Update empty state styling to match OpenFrame design system
   ```vue
   <template>
     <div class="of-empty-state">
       <div class="of-empty-state__icon">
         <i :class="icon || 'pi pi-box'"></i>
       </div>
       <h3 class="of-empty-state__title">{{ title }}</h3>
       <p class="of-empty-state__message">{{ message }}</p>
     </div>
   </template>
   
   <style scoped>
   .of-empty-state {
     display: flex;
     flex-direction: column;
     align-items: center;
     justify-content: center;
     padding: var(--spacing-xl, 32px);
     text-align: center;
     background-color: var(--surface-section);
     border-radius: var(--border-radius);
   }
   
   .of-empty-state__icon {
     font-size: 3rem;
     color: var(--primary-color);
     margin-bottom: var(--spacing-md, 16px);
   }
   
   .of-empty-state__title {
     margin: 0 0 var(--spacing-sm, 8px) 0;
     font-size: 1.25rem;
     font-weight: 600;
     color: var(--text-color);
   }
   
   .of-empty-state__message {
     margin: 0;
     font-size: 0.875rem;
     color: var(--text-color-secondary);
   }
   </style>
   ```

4. [ ] Standardize table design to match UnifiedDeviceTable
   ```vue
   <template>
     <FilterableTable
       :data="data"
       :columns="columns"
       :paginate="true"
       :rows="10"
       class="of-table--unified"
     >
       <!-- Templates for columns go here -->
     </FilterableTable>
   </template>
   
   <style scoped>
   :deep(.of-table--unified .p-datatable-header) {
     background-color: var(--surface-card);
     border-bottom: 1px solid var(--surface-border);
   }
   
   :deep(.of-table--unified .p-datatable-thead > tr > th) {
     background-color: var(--surface-section);
     color: var(--text-color);
     padding: 12px 16px;
     font-weight: 600;
     border-color: var(--surface-border);
   }
   
   :deep(.of-table--unified .p-datatable-tbody > tr > td) {
     padding: 12px 16px;
     border-color: var(--surface-border);
   }
   
   :deep(.of-table--unified .p-datatable-tbody > tr:nth-child(even)) {
     background-color: var(--surface-ground);
   }
   
   :deep(.of-table--unified .p-datatable-tbody > tr:hover) {
     background-color: var(--surface-hover);
   }
   
   :deep(.of-table--unified .p-tag) {
     min-width: 75px;
     justify-content: center;
   }
   </style>
   ```

## CSS Variables to Use

To ensure consistency with OpenFrame's design system, use these CSS variables throughout the components:

```css
:root {
  /* Color Variables */
  --primary-color: #3B82F6; /* Blue 500 */
  --primary-color-rgb: 59, 130, 246;
  --primary-light: #93C5FD; /* Blue 300 */
  --primary-dark: #1D4ED8; /* Blue 700 */
  
  --success-color: #10B981; /* Green 500 */
  --success-color-rgb: 16, 185, 129;
  --warning-color: #F59E0B; /* Amber 500 */
  --warning-color-rgb: 245, 158, 11;
  --danger-color: #EF4444; /* Red 500 */
  --danger-color-rgb: 239, 68, 68;
  --info-color: #6B7280; /* Gray 500 */
  --info-color-rgb: 107, 114, 128;
  
  /* Background Colors */
  --surface-ground: #F3F4F6; /* Light mode background */
  --surface-card: #FFFFFF; /* Card background */
  --surface-section: #F9FAFB; /* Section background */
  --surface-border: #E5E7EB; /* Border color */
  --surface-hover: #F9FAFB; /* Hover state */
  
  /* Text Colors */
  --text-color: #111827; /* Primary text */
  --text-color-secondary: #6B7280; /* Secondary text */
  --text-color-secondary-rgb: 107, 114, 128;
  
  /* Border Radius */
  --border-radius: 6px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

/* Dark Mode Theme Variables */
[data-theme="dark"] {
  --surface-ground: #1F2937; /* Dark mode background */
  --surface-card: #374151; /* Card background */
  --surface-section: #1F2937; /* Section background */
  --surface-border: #4B5563; /* Border color */
  --surface-hover: #374151; /* Hover state */
  
  --text-color: #F9FAFB; /* Primary text */
  --text-color-secondary: #D1D5DB; /* Secondary text */
}
```

## Mockups

- Create visual design mockups showing the improved sidebar layout
- Create mockups for each tab to show the new content organization
- Show responsive behavior at different breakpoints
- Include examples of styled tables and cards

## Relevant Files

- openframe/services/openframe-ui/src/components/shared/DeviceDetailsSlider/index.vue - Main component to update
- openframe/services/openframe-ui/src/components/shared/DeviceDetailsSlider/DeviceHeader.vue - Header component to update
- openframe/services/openframe-ui/src/components/shared/DeviceDetailsSlider/tables/* - Table components to update
- openframe/services/openframe-ui/src/components/shared/DeviceDetailsSlider/sections/* - Section components to update 