# Ichimatsu Animation - Functionality Test

## Test Checklist

### 1. Application Launch

- [ ] Application loads without errors
- [ ] UI components are visible
- [ ] No console errors in browser

### 2. Basic UI Components

- [ ] Left viewport area is visible
- [ ] Right pattern panel with sliders is visible
- [ ] Bottom items/timeline panel is visible
- [ ] Title bar with controls is visible

### 3. Sequence Management

- [ ] Can add new tiling sequence
- [ ] Can select sequences
- [ ] Can delete sequences
- [ ] Sequences show in items panel

### 4. Pattern Generation

- [ ] Default pattern is generated and displayed
- [ ] Sliders control pattern generation
- [ ] Moving sliders updates the pattern in real-time
- [ ] Pattern variations are generated

### 5. Viewport Display

- [ ] SVG tiling pattern is displayed in viewport
- [ ] Pattern updates when sliders change
- [ ] Zone lines are visible (if enabled)
- [ ] Pattern scaling works correctly

### 6. Timeline/Animation

- [ ] Can add frames to sequences
- [ ] Can navigate between frames
- [ ] Frame thumbnails are displayed
- [ ] Playback controls work

### 7. Export/Save

- [ ] Can capture current pattern
- [ ] Pattern data is preserved
- [ ] Project state is maintained

## Manual Testing Steps

1. Open application at http://localhost:5585
2. Check if default sequence is created
3. Try moving the 12 offset sliders
4. Verify pattern changes in viewport
5. Add a new sequence
6. Add frames to sequence
7. Test playback controls

## Expected Behavior

- Application should display rhombus tiling patterns that change as sliders are moved
- The interface should mirror Unim's layout but with tiling-specific controls
- All 12 zone offset sliders should affect the pattern generation
- Timeline should allow frame-by-frame animation creation
