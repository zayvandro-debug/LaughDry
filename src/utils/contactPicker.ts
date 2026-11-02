import { Contacts } from '@capacitor-community/contacts';
import { Capacitor } from '@capacitor/core';

export interface PickedContactResult {
  success: boolean;
  name?: string;
  phone?: string;
  address?: string;
  error?: string;
}

/**
 * Standardize phone number format for Indonesian laundry POS:
 * Converts +628... or 628... to standard 08...
 * Removes non-digit characters.
 */
export function formatPhoneNumber(rawPhone: string): string {
  if (!rawPhone) return '';
  let clean = rawPhone.replace(/[^\d+]/g, '');
  if (clean.startsWith('+62')) {
    clean = '0' + clean.slice(3);
  } else if (clean.startsWith('62') && clean.length > 9) {
    clean = '0' + clean.slice(2);
  }
  // Strip any remaining '+'
  return clean.replace(/[^\d]/g, '');
}

/**
 * Universally pick a contact from the mobile device.
 * Supports:
 * 1. Native Capacitor Contacts plugin on Android/iOS
 * 2. W3C Contact Picker API on modern mobile web browsers (Chrome Android / Safari)
 * 3. Graceful fallback messages with actionable advice.
 */
export async function pickDeviceContact(): Promise<PickedContactResult> {
  // Method 1: Capacitor Native Plugin (for Android App wrapper)
  const isNative = Capacitor.isNativePlatform();
  const isPluginAvailable = Capacitor.isPluginAvailable('Contacts');

  if (isNative || isPluginAvailable) {
    try {
      // Check & request permissions first
      try {
        const permStatus = await Contacts.checkPermissions();
        if (permStatus.contacts !== 'granted') {
          const reqStatus = await Contacts.requestPermissions();
          if (reqStatus.contacts !== 'granted') {
            return {
              success: false,
              error: 'Izin akses kontak ditolak pada perangkat. Harap izinkan akses kontak di Pengaturan Aplikasi HP Anda.'
            };
          }
        }
      } catch (permErr) {
        console.warn('Contacts.checkPermissions warning:', permErr);
      }

      // Open native contact picker
      const result = await Contacts.pickContact({
        projection: {
          name: true,
          phones: true,
          postalAddresses: true
        }
      });

      if (result && result.contact) {
        const contact = result.contact;
        
        // Extract Name
        let name = '';
        if (contact.name?.display) {
          name = contact.name.display;
        } else {
          const parts = [contact.name?.given, contact.name?.middle, contact.name?.family].filter(Boolean);
          name = parts.join(' ').trim();
        }

        // Extract Phone
        let rawPhone = '';
        if (contact.phones && contact.phones.length > 0) {
          // Prefer primary phone if available
          const primaryPhone = contact.phones.find(p => p.isPrimary) || contact.phones[0];
          rawPhone = primaryPhone.number || '';
        }

        const phone = formatPhoneNumber(rawPhone);

        // Extract Address if present
        let address = '';
        if (contact.postalAddresses && contact.postalAddresses.length > 0) {
          const addrObj = contact.postalAddresses[0];
          const addrParts = [addrObj.street, addrObj.neighborhood, addrObj.city, addrObj.region].filter(Boolean);
          address = addrParts.join(', ');
        }

        if (!name && !phone) {
          return {
            success: false,
            error: 'Kontak yang dipilih tidak memiliki nama atau nomor telepon yang valid.'
          };
        }

        return {
          success: true,
          name,
          phone,
          address
        };
      }
    } catch (nativeErr: any) {
      console.warn('Capacitor Contacts.pickContact failed, attempting browser fallback:', nativeErr);
      // If user simply cancelled the picker dialog
      if (nativeErr?.message && (nativeErr.message.includes('cancel') || nativeErr.message.includes('Canceled'))) {
        return { success: false, error: 'Pemilihan kontak dibatalkan.' };
      }
    }
  }

  // Method 2: Standard W3C Contact Picker API (Chrome Android / Mobile Browser)
  if (typeof window !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window) {
    try {
      const props = ['name', 'tel', 'address'];
      const opts = { multiple: false };
      const contacts = await (navigator as any).contacts.select(props, opts);

      if (contacts && contacts.length > 0) {
        const contact = contacts[0];
        const rawName = Array.isArray(contact.name) ? contact.name[0] : (contact.name || '');
        const rawPhone = Array.isArray(contact.tel) ? contact.tel[0] : (contact.tel || '');
        const rawAddr = Array.isArray(contact.address) ? contact.address[0] : (contact.address || '');

        let address = '';
        if (rawAddr && typeof rawAddr === 'object') {
          address = [rawAddr.addressLine, rawAddr.city, rawAddr.region].filter(Boolean).join(', ');
        } else if (typeof rawAddr === 'string') {
          address = rawAddr;
        }

        const phone = formatPhoneNumber(rawPhone);

        return {
          success: true,
          name: rawName,
          phone,
          address
        };
      } else {
        return { success: false, error: 'Tidak ada kontak yang dipilih.' };
      }
    } catch (webErr: any) {
      console.warn('Web Contact Picker API error:', webErr);
      if (webErr.name === 'AbortError') {
        return { success: false, error: 'Pemilihan kontak dibatalkan.' };
      }
      return {
        success: false,
        error: 'Gagal mengambil kontak dari HP: ' + (webErr.message || 'Izin akses kontak tidak diberikan.')
      };
    }
  }

  // Method 3: Unsupported Environment fallback
  return {
    success: false,
    error: 'Perangkat atau browser saat ini belum mendukung akses kontak langsung. Silakan gunakan Google Chrome di HP Android atau ketik nama dan nomor telepon secara manual.'
  };
}
