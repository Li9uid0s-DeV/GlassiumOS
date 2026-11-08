# Implementation Plan - GlassiumOS v4.5 Comprehensive Upgrade

1. **Clock Text Liquid Glass Mask**:
   - Update lock screen and clock widgets so that only the text uses `background-clip: text` with SVG displacement filter / backdrop-filter refraction rather than warping the container box.

2. **Restore Glass Effects across Taskbars & Windows**:
   - Ensure all taskbars (`Taskbar.tsx`) and window frames (`WindowFrame.tsx`, `Window` cards) use robust frosted translucent glass styling (`backdrop-blur-xl bg-slate-900/60` or theme equivalents).

3. **Unified Settings & App Store UI (with Sidebar)**:
   - Restyle `Settings.tsx` to match the polished App Store layout (clean header, side navigation, cardless flat typography, seamless panels) while keeping its 5 category tabs.
   - Completely remove the deprecated "UI Style" system.

4. **Fix macOS Traffic Lights Coordinates**:
   - Fix positioning of traffic light beads (red, yellow, green) in `WindowFrame.tsx` so they align perfectly inside the title bar without coordinate shifts.

5. **Standalone Calendar Flyout**:
   - Implement a gorgeous standalone calendar dropdown flyout in `Taskbar.tsx` when clicking the date/time widget, instead of opening the full Calendar app window.

6. **Fix Browser Proxy & GitHub 404s**:
   - Enhance `server.ts` proxy route to properly handle raw content, follow redirects, fallback to raw.githubusercontent.com / jsDelivr for GitHub URLs, and fix duckduckgo HTML scraping.

7. **Game Boy ROM Emulator**:
   - Upgrade `GameApp.tsx` with a fully functional Retro Game Boy emulator featuring built-in classic demo ROMs (Tetris GB style, Bounce, Space Shooter) and custom `.gb` / `.rom` file drop support.

8. **Gemini API Key in AI Chat**:
   - Add an API key settings modal/input in `AIAssistantApp.tsx` and `OSContext.tsx` that saves securely in localStorage and uses `@google/genai` with the user's custom key.

9. **Drag-and-Drop External File Import & HTML Execution**:
   - Add global drag-and-drop file listener in `Desktop.tsx` to import files into the virtual file system, with automatic execution/rendering for `.html` files in an isolated preview sandbox or browser tab.

10. **VS Code-like Code Editor Feature**:
    - Upgrade Notepad / Editor app into a full VS Code-like multi-tab code editor with file explorer tree, syntax highlighting feel, terminal integration, and find/replace.

11. **Comprehensive Keyboard Shortcuts**:
    - Add global event listeners for `Ctrl+Space` (Launcher/Search), `Ctrl+Alt+T` (Terminal), `Alt+L` (Lock), `Ctrl+N` (New File), `Ctrl+W` (Close Window), `Ctrl+Tab` (Task View).

12. **Right-Click Menu, Multi-Select Desktop Icons & Minimize Animation**:
    - Add multi-select support with selection box rectangle on Desktop, enhanced right-click menu, and smooth Framer Motion minimize-to-taskbar scaling animation.
