import React, { useState, useEffect, useRef } from "react";

/**
 * LazyMedia Wrapper Component
 * Intercepts default browser eager fetches by wrapping <img> and <audio> elements
 * inside a native IntersectionObserver boundary listener context.
 */
const LazyMedia = ({ src, type = "image", alt = "Chat attachment", className = "", ...props }) => {
    const [isIntersecting, setIsIntersecting] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsIntersecting(true);
                    // Disconnect listener loops immediately once the target media element loads into screen views
                    observer.disconnect();
                }
            },
            {
                rootMargin: "200px 0px", // Pre-fetch media elements 200px before they hit the viewport for seamless UX
                threshold: 0.01
            }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <div ref={containerRef} className={`lazy-media-container ${className}`} style={{ minHeight: type === "image" ? "150px" : "40px" }}>
            {isIntersecting ? (
                type === "audio" ? (
                    <audio src={src} className={className} {...props} />
                ) : (
                    <img src={src} alt={alt} className={className} {...props} />
                )
            ) : (
                // Lightweight design placeholder element skeleton matching layout footprints
                <div className="w-full h-full bg-base-300 animate-pulse rounded-md flex items-center justify-center text-xs text-base-content/40">
                    {type === "audio" ? "🎵 Loading Voice Note..." : "📷 Loading Image Asset..."}
                </div>
            )}
        </div>
    );
};

export default LazyMedia;