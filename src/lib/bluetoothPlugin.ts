import { registerPlugin } from '@capacitor/core';

export interface BluetoothClassicDevice {
  name: string;
  address: string;
}

export interface BluetoothClassicPluginInterface {
  listDevices(): Promise<{ devices: BluetoothClassicDevice[] }>;
  connect(options: { address: string }): Promise<{ success: boolean; name: string; address: string }>;
  write(options: { value: string }): Promise<{ success: boolean }>;
  printEscPos(options: { value: string }): Promise<{ success: boolean }>;
  disconnect(): Promise<{ success: boolean }>;
}

export const BluetoothClassicPlugin = registerPlugin<BluetoothClassicPluginInterface>('BluetoothClassicPlugin');
