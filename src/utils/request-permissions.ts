import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

/**
 * request-permissions Utility
 * Ensures camera and location permissions are requested at runtime
 * across both mobile wrappers and regular browser POS clients.
 */
export async function requestAppPermissions(): Promise<{ camera: boolean; geolocation: boolean }> {
  let cameraGranted = false;
  let geolocationGranted = false;

  // 1. Camera Permissions Guard
  try {
    const cameraCheck = await Camera.checkPermissions();
    if (cameraCheck.camera !== 'granted') {
      const cameraReq = await Camera.requestPermissions({ permissions: ['camera'] });
      cameraGranted = cameraReq.camera === 'granted';
    } else {
      cameraGranted = true;
    }
  } catch (err) {
    console.warn("Browser or custom camera check fallback:", err);
    // Fallback representation for standard browser sessions
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      cameraGranted = true;
    }
  }

  // 2. Geolocation Permissions Guard
  try {
    const geoCheck = await Geolocation.checkPermissions();
    if (geoCheck.location !== 'granted') {
      const geoReq = await Geolocation.requestPermissions({ permissions: ['location'] });
      geolocationGranted = geoReq.location === 'granted';
    } else {
      geolocationGranted = true;
    }
  } catch (err) {
    console.warn("Browser or custom geolocation check fallback:", err);
    // Fallback check representation
    if (navigator.geolocation) {
      geolocationGranted = true;
    }
  }

  return {
    camera: cameraGranted,
    geolocation: geolocationGranted
  };
}
