"use client"

import { useState, useEffect, useCallback } from "react"

interface MobileInfo {
  isMobile: boolean
  orientation: "portrait" | "landscape"
  isSmallScreen: boolean
  isTouchDevice: boolean
  isLowEndDevice: boolean
  connectionType: string | null
  effectiveConnectionType: string | null
}

export function useMobile(): MobileInfo {
  const [mobileInfo, setMobileInfo] = useState<MobileInfo>({
    isMobile: false,
    orientation: "portrait",
    isSmallScreen: false,
    isTouchDevice: false,
    isLowEndDevice: false,
    connectionType: null,
    effectiveConnectionType: null,
  })

  const updateMobileInfo = useCallback(() => {
    // Check if window is available (client-side)
    if (typeof window === "undefined") return

    // Check if device is mobile based on screen size
    const isMobile = window.innerWidth <= 768

    // Determine orientation
    const orientation = window.innerHeight > window.innerWidth ? "portrait" : "landscape"

    // Check if screen is small (less than 640px)
    const isSmallScreen = window.innerWidth < 640

    // Check if device has touch capability
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0

    // Try to determine if it's a low-end device (approximation)
    const isLowEndDevice =
      (navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 4) ||
      (navigator.deviceMemory !== undefined && navigator.deviceMemory <= 4)

    // Get connection information if available
    let connectionType = null
    let effectiveConnectionType = null

    if ("connection" in navigator) {
      const connection = (navigator as any).connection
      connectionType = connection?.type || null
      effectiveConnectionType = connection?.effectiveType || null
    }

    setMobileInfo({
      isMobile,
      orientation: orientation as "portrait" | "landscape",
      isSmallScreen,
      isTouchDevice,
      isLowEndDevice,
      connectionType,
      effectiveConnectionType,
    })
  }, [])

  useEffect(() => {
    // Initial check
    updateMobileInfo()

    // Add event listeners for changes
    window.addEventListener("resize", updateMobileInfo)
    window.addEventListener("orientationchange", updateMobileInfo)

    // Cleanup
    return () => {
      window.removeEventListener("resize", updateMobileInfo)
      window.removeEventListener("orientationchange", updateMobileInfo)
    }
  }, [updateMobileInfo])

  return mobileInfo
}
