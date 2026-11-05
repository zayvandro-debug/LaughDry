package com.laughdry.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;
import androidx.core.app.ActivityCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.io.OutputStream;
import java.lang.reflect.Method;
import java.util.Set;
import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONException;

@CapacitorPlugin(name = "BluetoothClassicPlugin")
public class BluetoothClassicPlugin extends Plugin {
    private static final String TAG = "BluetoothClassicPlugin";
    private final UUID sppUuid = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private BluetoothAdapter bluetoothAdapter = null;
    private BluetoothSocket socket = null;
    private OutputStream outputStream = null;

    @Override
    public void load() {
        bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
    }

    private boolean checkPermission(String permission) {
        return ActivityCompat.checkSelfPermission(getContext(), permission) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean hasRequiredPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return checkPermission(Manifest.permission.BLUETOOTH_CONNECT);
        }
        return checkPermission(Manifest.permission.BLUETOOTH);
    }

    @PluginMethod
    public void listDevices(PluginCall call) {
        if (bluetoothAdapter == null) {
            getActivity().runOnUiThread(() -> call.reject("Bluetooth tidak tersedia di perangkat ini"));
            return;
        }

        if (!hasRequiredPermissions()) {
            getActivity().runOnUiThread(() -> call.reject("Izin Bluetooth (BLUETOOTH_CONNECT) tidak diberikan"));
            return;
        }

        try {
            Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
            JSArray devicesArray = new JSArray();
            if (pairedDevices != null) {
                for (BluetoothDevice device : pairedDevices) {
                    JSObject deviceObj = new JSObject();
                    String name = device.getName();
                    deviceObj.put("name", name != null ? name : "Unknown Device");
                    deviceObj.put("address", device.getAddress());
                    devicesArray.put(deviceObj);
                }
            }
            JSObject result = new JSObject();
            result.put("devices", devicesArray);
            getActivity().runOnUiThread(() -> call.resolve(result));
        } catch (Exception e) {
            getActivity().runOnUiThread(() -> call.reject("Gagal mengambil daftar perangkat: " + e.getMessage()));
        }
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String address = call.getString("address");
        if (address == null || address.trim().isEmpty()) {
            getActivity().runOnUiThread(() -> call.reject("Alamat MAC printer tidak boleh kosong"));
            return;
        }

        if (bluetoothAdapter == null) {
            getActivity().runOnUiThread(() -> call.reject("Bluetooth tidak tersedia"));
            return;
        }

        if (!hasRequiredPermissions()) {
            getActivity().runOnUiThread(() -> call.reject("Izin Bluetooth tidak diberikan"));
            return;
        }

        new Thread(() -> {
            try {
                disconnectInternal();

                BluetoothDevice device = bluetoothAdapter.getRemoteDevice(address);
                String devName = device.getName();
                Log.d(TAG, "Mencoba menghubungkan ke: " + (devName != null ? devName : "Unknown") + " (" + address + ")");

                if (bluetoothAdapter.isDiscovering()) {
                    bluetoothAdapter.cancelDiscovery();
                }

                boolean connected = false;
                Exception connectionError = null;

                // Cara 1: Standard SPP Connection
                try {
                    socket = device.createRfcommSocketToServiceRecord(sppUuid);
                    socket.connect();
                    connected = true;
                    Log.d(TAG, "Koneksi standard berhasil!");
                } catch (Exception e) {
                    connectionError = e;
                    Log.e(TAG, "Koneksi standard gagal: " + e.getMessage());
                    disconnectInternal();
                }

                // Cara 2: Fallback via reflection (sangat berguna untuk printer thermal China / POS)
                if (!connected) {
                    Log.d(TAG, "Mencoba fallback dengan refleksi...");
                    try {
                        Method m = device.getClass().getMethod("createRfcommSocket", int.class);
                        socket = (BluetoothSocket) m.invoke(device, 1);
                        if (socket != null) {
                            socket.connect();
                            connected = true;
                            Log.d(TAG, "Koneksi fallback berhasil!");
                        }
                    } catch (Exception e) {
                        disconnectInternal();
                        String errMsg = "Koneksi standard gagal: " + (connectionError != null ? connectionError.getMessage() : "null") + " | Fallback gagal: " + e.getMessage();
                        Log.e(TAG, "Koneksi gagal total: " + errMsg);
                        getActivity().runOnUiThread(() -> call.reject("Koneksi gagal: " + errMsg));
                        return;
                    }
                }

                if (socket != null) {
                    outputStream = socket.getOutputStream();
                    Log.d(TAG, "OutputStream berhasil diperoleh!");

                    JSObject res = new JSObject();
                    res.put("success", true);
                    res.put("name", devName != null ? devName : "Thermal Printer");
                    res.put("address", address);
                    getActivity().runOnUiThread(() -> call.resolve(res));
                } else {
                    getActivity().runOnUiThread(() -> call.reject("Socket Bluetooth null"));
                }
            } catch (Exception e) {
                Log.e(TAG, "Error alur koneksi: " + e.getMessage());
                getActivity().runOnUiThread(() -> call.reject("Koneksi gagal karena error: " + e.getMessage()));
            }
        }).start();
    }

    @PluginMethod
    public void write(PluginCall call) {
        JSArray arr = call.getArray("bytes");
        if (arr == null) {
            getActivity().runOnUiThread(() -> call.reject("Data 'bytes' tidak ditemukan"));
            return;
        }

        if (outputStream == null) {
            getActivity().runOnUiThread(() -> call.reject("Printer belum terhubung (OutputStream null)"));
            return;
        }

        new Thread(() -> {
            try {
                int length = arr.length();
                byte[] bytes = new byte[length];
                for (int i = 0; i < length; i++) {
                    bytes[i] = (byte) arr.getInt(i);
                }

                outputStream.write(bytes);
                Thread.sleep(80);
                outputStream.flush();
                Thread.sleep(150);

                Log.d(TAG, "Berhasil menulis " + bytes.length + " byte ke printer!");
                JSObject res = new JSObject();
                res.put("success", true);
                getActivity().runOnUiThread(() -> call.resolve(res));
            } catch (Exception e) {
                Log.e(TAG, "Gagal menulis data ke printer: " + e.getMessage());
                getActivity().runOnUiThread(() -> call.reject("Gagal mencetak: " + e.getMessage()));
            }
        }).start();
    }

    @PluginMethod
    public void printEscPos(PluginCall call) {
        write(call);
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        new Thread(() -> {
            try {
                disconnectInternal();
                JSObject res = new JSObject();
                res.put("success", true);
                getActivity().runOnUiThread(() -> call.resolve(res));
            } catch (Exception e) {
                getActivity().runOnUiThread(() -> call.reject("Gagal memutuskan koneksi: " + e.getMessage()));
            }
        }).start();
    }

    private synchronized void disconnectInternal() {
        try {
            Thread.sleep(800);
        } catch (InterruptedException e) {
            Log.e(TAG, "Sleep terinterupsi: " + e.getMessage());
        }

        if (outputStream != null) {
            try {
                outputStream.close();
            } catch (IOException e) {
                Log.e(TAG, "Gagal menutup output stream: " + e.getMessage());
            } finally {
                outputStream = null;
            }
        }

        if (socket != null) {
            try {
                socket.close();
            } catch (IOException e) {
                Log.e(TAG, "Gagal menutup socket: " + e.getMessage());
            } finally {
                socket = null;
            }
        }
    }
}
