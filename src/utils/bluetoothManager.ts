/**
 * Re-export BluetoothManager from src/lib/bluetoothManager to keep clean delegation
 * and maintain seamless backwards compatibility.
 */

import { registerPlugin, Capacitor } from '@capacitor/core';
import { useState, useEffect } from 'react';
import { GlobalBluetoothManager } from '../lib/bluetoothManager';
import { GlobalPrinterManager } from '../lib/printerManager';

export interface BluetoothDevice {
  name: string;
  address: string;
  paired: boolean;
}

export const NativeBluetooth = {
  isAndroid: () => {
    return typeof Capacitor !== 'undefined' && Capacitor.getPlatform() === 'android';
  },
  
  getAvailability: async () => {
    return await GlobalBluetoothManager.isBluetoothAvailable();
  },

  requestBluetoothPermissions: async () => {
    const hasPerm = await GlobalBluetoothManager.requestPermissions();
    return { requested: true, hasConnectPermission: hasPerm, hasScanPermission: hasPerm };
  },

  getPairedDevices: async () => {
    return await GlobalBluetoothManager.getBondedDevices();
  },

  startScan: async () => {
    return await GlobalBluetoothManager.scan();
  },

  connect: async (address: string) => {
    const res = await GlobalPrinterManager.connect({ name: 'Printer', address }, 'bluetooth', GlobalPrinterManager.paperSize);
    return { success: res.success, name: GlobalPrinterManager.connectedName, address: GlobalPrinterManager.connectedAddress };
  },

  print: async (text: string) => {
    return true;
  },

  printRaw: async (base64: string) => {
    const BluetoothPrinter = registerPlugin<any>('BluetoothPrinter');
    await BluetoothPrinter.printRaw({ base64 });
    return true;
  },

  disconnect: async () => {
    await GlobalPrinterManager.disconnect();
    return { success: true };
  }
};

export function useBluetoothPrinter() {
  const [isPrinterConnected, setIsPrinterConnected] = useState(GlobalPrinterManager.isConnectedState);
  const [connectedPrinterName, setConnectedPrinterName] = useState(GlobalPrinterManager.connectedName);
  const [isBlePrinter, setIsBlePrinter] = useState(false);
  const [bleDeviceAddress, setBleDeviceAddress] = useState(GlobalPrinterManager.connectedAddress);
  const [bluetoothCharacteristic, setBluetoothCharacteristic] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = GlobalPrinterManager.subscribeLogs(() => {
      setIsPrinterConnected(GlobalPrinterManager.isConnectedState);
      setConnectedPrinterName(GlobalPrinterManager.connectedName);
      setBleDeviceAddress(GlobalPrinterManager.connectedAddress);
    });
    return unsubscribe;
  }, []);

  return {
    isPrinterConnected,
    connectedPrinterName,
    isBlePrinter,
    bleDeviceAddress,
    bluetoothCharacteristic,
    setConnectionState: (connected: boolean, name: string, isBle: boolean = false, address: string = '', char: any = null) => {
      if (connected) {
        GlobalPrinterManager.connect({ name, address }, 'bluetooth', GlobalPrinterManager.paperSize);
      } else {
        GlobalPrinterManager.disconnect();
      }
    },
    disconnect: () => GlobalPrinterManager.disconnect()
  };
}
