package com.laughdry.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.ActivityCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import java.io.IOException;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(name = "BluetoothPrinter")
public class BluetoothPrinterPlugin extends Plugin {
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805f9b34fb");
    private BluetoothAdapter bluetoothAdapter;
    private BluetoothSocket socket;
    private OutputStream outputStream;
    private BroadcastReceiver scanReceiver;
    private final List<JSObject> foundDevices = new ArrayList<>();
    private PluginCall activeScanCall;

    @Override
    public void load() {
        bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
    }

    private boolean checkBluetoothPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
        }
        return ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean checkScanPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED;
        }
        return ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    @PluginMethod
    public void requestBluetoothPermissions(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                ActivityCompat.requestPermissions(
                    getActivity(),
                    new String[]{
                        Manifest.permission.BLUETOOTH,
                        Manifest.permission.BLUETOOTH_ADMIN,
                        Manifest.permission.BLUETOOTH_SCAN,
                        Manifest.permission.BLUETOOTH_CONNECT,
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                    },
                    1012
                );
            } else {
                ActivityCompat.requestPermissions(
                    getActivity(),
                    new String[]{
                        Manifest.permission.BLUETOOTH,
                        Manifest.permission.BLUETOOTH_ADMIN,
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                    },
                    1012
                );
            }
            JSObject ret = new JSObject();
            ret.put("requested", true);
            ret.put("hasConnectPermission", checkBluetoothPermission());
            ret.put("hasScanPermission", checkScanPermission());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Gagal meminta izin: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getAvailability(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", bluetoothAdapter != null);
        ret.put("enabled", bluetoothAdapter != null && bluetoothAdapter.isEnabled());
        call.resolve(ret);
    }

    @PluginMethod
    public void getPairedDevices(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.reject("Device does not support Bluetooth");
            return;
        }

        if (!checkBluetoothPermission()) {
            call.reject("Bluetooth permission not granted. Please grant BLUETOOTH_CONNECT.");
            return;
        }

        try {
            Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
            JSArray devList = new JSArray();
            for (BluetoothDevice device : pairedDevices) {
                JSObject dev = new JSObject();
                dev.put("name", device.getName() != null ? device.getName() : "Unknown Printer");
                dev.put("address", device.getAddress());
                dev.put("paired", true);
                devList.put(dev);
            }
            JSObject ret = new JSObject();
            ret.put("devices", devList);
            call.resolve(ret);
        } catch (SecurityException se) {
            call.reject("Security Exception: " + se.getMessage());
        }
    }

    @PluginMethod
    public void startScan(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.reject("Device does not support Bluetooth");
            return;
        }

        if (!checkScanPermission() || !checkBluetoothPermission()) {
            call.reject("Bluetooth scan or connect permission not granted.");
            return;
        }

        try {
            if (bluetoothAdapter.isDiscovering()) {
                bluetoothAdapter.cancelDiscovery();
            }

            foundDevices.clear();
            activeScanCall = call;

            if (scanReceiver != null) {
                try {
                    getContext().unregisterReceiver(scanReceiver);
                } catch (Exception e) {}
            }

            scanReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    String action = intent.getAction();
                    if (BluetoothDevice.ACTION_FOUND.equals(action)) {
                        BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                        if (device != null) {
                            try {
                                String name = device.getName();
                                String address = device.getAddress();
                                if (name != null && !name.isEmpty()) {
                                    boolean exists = false;
                                    for (JSObject d : foundDevices) {
                                        if (d.getString("address").equalsIgnoreCase(address)) {
                                            exists = true;
                                            break;
                                        }
                                    }
                                    if (!exists) {
                                        JSObject dev = new JSObject();
                                        dev.put("name", name);
                                        dev.put("address", address);
                                        dev.put("paired", false);
                                        foundDevices.add(dev);

                                        // Send real-time scanning notifications
                                        JSObject progress = new JSObject();
                                        progress.put("name", name);
                                        progress.put("address", address);
                                        notifyListeners("deviceFound", progress);
                                    }
                                }
                            } catch (SecurityException se) {}
                        }
                    } else if (BluetoothAdapter.ACTION_DISCOVERY_FINISHED.equals(action)) {
                        try {
                            getContext().unregisterReceiver(scanReceiver);
                        } catch (Exception e) {}
                        scanReceiver = null;

                        JSArray arr = new JSArray();
                        for (JSObject d : foundDevices) {
                            arr.put(d);
                        }
                        JSObject ret = new JSObject();
                        ret.put("devices", arr);
                        if (activeScanCall != null) {
                            activeScanCall.resolve(ret);
                            activeScanCall = null;
                        }
                    }
                }
            };

            IntentFilter filter = new IntentFilter();
            filter.addAction(BluetoothDevice.ACTION_FOUND);
            filter.addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED);
            getContext().registerReceiver(scanReceiver, filter);

            bluetoothAdapter.startDiscovery();
        } catch (SecurityException se) {
            call.reject("Security Exception starting discovery: " + se.getMessage());
        }
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String address = call.getString("address");
        if (address == null || address.isEmpty()) {
            call.reject("Device address is required");
            return;
        }

        if (bluetoothAdapter == null) {
            call.reject("Bluetooth not available");
            return;
        }

        if (!checkBluetoothPermission()) {
            call.reject("No bluetooth connect permission");
            return;
        }

        new Thread(() -> {
            try {
                disconnectDeviceInternal();

                BluetoothDevice device = bluetoothAdapter.getRemoteDevice(address);
                socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                
                if (bluetoothAdapter.isDiscovering()) {
                    bluetoothAdapter.cancelDiscovery();
                }

                socket.connect();
                outputStream = socket.getOutputStream();

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("name", device.getName());
                ret.put("address", address);
                call.resolve(ret);
            } catch (Exception e) {
                disconnectDeviceInternal();
                call.reject("Connection failed: " + e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void print(PluginCall call) {
        String text = call.getString("text");
        if (text == null) {
            call.reject("Text to print is required");
            return;
        }

        if (socket == null || outputStream == null) {
            call.reject("Printer is not connected. Connect first!");
            return;
        }

        new Thread(() -> {
            try {
                byte[] bytes = text.getBytes("CP850");
                outputStream.write(bytes);
                outputStream.flush();
                call.resolve();
            } catch (Exception e) {
                call.reject("Print failed: " + e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void printRaw(PluginCall call) {
        String base64Data = call.getString("base64");
        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("Base64 data is required");
            return;
        }

        if (socket == null || outputStream == null) {
            call.reject("Printer is not connected. Connect first!");
            return;
        }

        new Thread(() -> {
            try {
                byte[] bytes = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT);
                outputStream.write(bytes);
                outputStream.flush();
                call.resolve();
            } catch (Exception e) {
                call.reject("Print raw failed: " + e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        disconnectDeviceInternal();
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    private void disconnectDeviceInternal() {
        try {
            if (outputStream != null) {
                outputStream.close();
                outputStream = null;
            }
        } catch (IOException e) {}

        try {
            if (socket != null) {
                socket.close();
                socket = null;
            }
        } catch (IOException e) {}
    }
}
