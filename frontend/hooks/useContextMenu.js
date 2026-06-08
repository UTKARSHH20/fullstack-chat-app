import { useState, useCallback, useRef } from "react";

// Custom hook for right-click / long-press context menu positioning
export default function useContextMenu() {
    const [menu, setMenu] = useState({ visible: false });
    const longPressTimer = useRef(null);

    const openMenu = useCallback((e, msg, isMine) => {
        // GSSoC Issue #53 Fix
        if (e && typeof e.preventDefault === "function") {
            e.preventDefault();
        }
        const W = 210, H = 320;
        const x = Math.min(e.clientX, window.innerWidth - W - 8);
        const y = Math.min(e.clientY, window.innerHeight - H - 8);
        setMenu({ visible: true, x, y, message: msg, isMine });
    }, []);

    const openMenuTouch = useCallback((e, msg, isMine) => {
        longPressTimer.current = setTimeout(() => {
            const touch = e.touches[0];
            const W = 210, H = 320;
            const x = Math.min(touch.clientX, window.innerWidth - W - 8);
            const y = Math.min(touch.clientY, window.innerHeight - H - 8);
            setMenu({ visible: true, x, y, message: msg, isMine });
        }, 500);
    }, []);

    const cancelTouch = useCallback(() => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
    }, []);

    const closeMenu = useCallback(() => setMenu({ visible: false }), []);

    return { menu, openMenu, openMenuTouch, cancelTouch, closeMenu };
}
