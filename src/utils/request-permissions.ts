import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Contacts } from '@capacitor-community/contacts';
import { Capacitor } from '@capacitor/core';

/**
 * request-permissions Utility
 * Ensures camera, location, and contacts permissions are requested at runtime
 * across both mobile wrappers and regular browser POS clients.
 */
export async function requestAppPermissions(): Promise<{ camera: boolean; geolocation: boolean; contacts: boolean }> {
  let cameraGranted = false;
  let geolocationGranted = false;
  let contactsGranted = false;

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
    if (navigator.geolocation) {
      geolocationGranted = true;
    }
  }

  // 3. Contacts Permissions Guard
  try {
    if (Capacitor.isPluginAvailable('Contacts')) {
      const contactsCheck = await Contacts.checkPermissions();
      if (contactsCheck.contacts !== 'granted') {
        const contactsReq = await Contacts.requestPermissions();
        contactsGranted = contactsReq.contacts === 'granted';
      } else {
        contactsGranted = true;
      }
    } else if (typeof window !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window) {
      contactsGranted = true;
    }
  } catch (err) {
    console.warn("Contacts permission check fallback:", err);
    if (typeof window !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window) {
      contactsGranted = true;
    }
  }

  return {
    camera: cameraGranted,
    geolocation: geolocationGranted,
    contacts: contactsGranted
  };
}

