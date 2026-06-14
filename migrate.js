/**
 * Script Migrasi Node.js (Admin SDK)
 * Membaca data lama dari /users_db/{ownerUid}/... dan memindahkan ke /tenants/{ownerUid}/...
 * 
 * Penggunaan:
 *   1. Jalankan untuk seluruh tenant: node migrate.js
 *   2. Jalankan untuk satu tenant spesifik: node migrate.js <ownerUid>
 */

import admin from "firebase-admin";
import { createRequire } from "module";
import fs from "fs";
import path from "path";

const require = createRequire(import.meta.url);

// Inisialisasi Firebase Admin SDK
let initialized = false;
const serviceAccountPath = path.resolve("./serviceAccountKey.json");

if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    initialized = true;
    console.log("🎯 Firebase Admin SDK diinisialisasi menggunakan serviceAccountKey.json");
  } catch (err) {
    console.error("❌ Gagal memuat serviceAccountKey.json:", err.message);
  }
}

if (!initialized) {
  console.log("ℹ️ Mencoba menginisialisasi dengan kredensial default lingkungan Google...");
  try {
    admin.initializeApp();
    initialized = true;
    console.log("🎯 Firebase Admin SDK diinisialisasi menggunakan kredensial default.");
  } catch (err) {
    console.error("❌ Gagal melakukan inisialisasi lingkungan default:", err.message);
    console.error("\nPANDUAN:");
    console.error("1. Unduh private key JSON di Google Cloud Console -> IAM & Admin -> Service Accounts.");
    console.error("2. Simpan file tersebut dengan nama 'serviceAccountKey.json' di root direktori ini.");
    console.error("3. Atau set variabel lingkungan GOOGLE_APPLICATION_CREDENTIALS sebelum menjalankan script.");
    process.exit(1);
  }
}

const db = admin.firestore();

/**
 * Membantu migrasi subkoleksi satu-per-satu dengan logging transparan
 */
async function migrateCollection({
  srcPath,
  destPathBuilder,
  collectionName,
  ownerUid,
  transform = (data) => data
}) {
  console.log(`\n📂 Memulai migrasi koleksi: [${collectionName}] untuk tenant: ${ownerUid}...`);
  const srcRef = db.collection(`${srcPath}/${collectionName}`);
  const snapshot = await srcRef.get();

  if (snapshot.empty) {
    console.log(`   ⚠️ Koleksi [${collectionName}] kosong. Melompati...`);
    return 0;
  }

  let count = 0;
  const batchSize = 450; // Batas batch write Firestore adalah 500
  let batch = db.batch();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const destPath = destPathBuilder(data, doc.id);
    
    if (!destPath) {
      console.warn(`   ⚠️ [Peringatan] Melewatkan dokumen ${doc.id} karena path tujuan tidak dapat ditentukan.`);
      continue;
    }

    const destRef = db.doc(destPath);
    batch.set(destRef, transform(data, doc.id));
    count++;

    if (count % batchSize === 0) {
      await batch.commit();
      console.log(`   ✅ Batch terkirim: memproses ${count} dokumen...`);
      batch = db.batch();
    }
  }

  // Sisa dokumen
  if (count % batchSize !== 0) {
    await batch.commit();
  }

  console.log(`   🎉 Berhasil memigrasi ${count} dokumen ke struktur baru.`);
  return count;
}

/**
 * Melakukan migrasi lengkap untuk satu tenant (ownerUid)
 */
async function migrateTenant(ownerUid) {
  console.log(`\n==================================================================`);
  console.log(`🚀 MEMULAI PROSES MIGRASI TENANT: ${ownerUid}`);
  console.log(`==================================================================`);

  const oldTenantBase = `users_db/${ownerUid}`;
  const newTenantBase = `tenants/${ownerUid}`;

  // 1. Ambil data Cabang terlebih dahulu karena dibutuhkan sebagai relasi
  const branches = [];
  const oldBranchesSnap = await db.collection(`${oldTenantBase}/branches`).get();
  oldBranchesSnap.forEach(doc => {
    branches.push({ id: doc.id, ...doc.data() });
  });

  const firstBranchId = branches[0]?.id || "br-utama";
  if (branches.length === 0) {
    console.log("ℹ️ Tidak ditemukan data cabang. Menyiapkan cabang default sebagai pengaman...");
  }

  // 1. Migrasi CABANG (Branch)
  // Subkoleksi: /tenants/{ownerUid}/branches/{branchId}
  await migrateCollection({
    srcPath: oldTenantBase,
    collectionName: "branches",
    ownerUid,
    destPathBuilder: (data, id) => `${newTenantBase}/branches/${id}`
  });

  // 2. Ambil & pilah data User lama (Owner vs Karyawan)
  // Subkoleksi lama: /users_db/{ownerUid}/users
  let ownerDocData = null;
  const employeesToMigrate = [];

  const oldUsersSnap = await db.collection(`${oldTenantBase}/users`).get();
  oldUsersSnap.forEach(docSnap => {
    const userData = docSnap.data();
    if (userData.role === "owner") {
      ownerDocData = { id: docSnap.id, ...userData };
    } else {
      employeesToMigrate.push({ id: docSnap.id, ...userData });
    }
  });

  // A. Buat Dokumen Tenant Profil root
  // Path: /tenants/{ownerUid}
  console.log(`\n📝 Membuat profil tenant level-atas di: ${newTenantBase}...`);
  const tenantData = {
    id: ownerUid,
    businessName: ownerDocData?.name || "Laundry Tenant",
    email: ownerDocData?.email || "owner@tenant.com",
    ownerName: ownerDocData?.name || "Pemilik Laundry",
    createdAt: new Date().toISOString()
  };
  await db.doc(newTenantBase).set(tenantData, { merge: true });
  console.log(`   ✅ Tenant profil berhasil dibuat.`);

  // B. Migrasi KARYAWAN (Employee) ke dalam cabang
  // Subkoleksi baru: /tenants/{ownerUid}/branches/{branchId}/employees/{employeeId}
  console.log(`\n👥 Memigrasi ${employeesToMigrate.length} karyawan ke subkoleksi cabang masing-masing...`);
  if (employeesToMigrate.length > 0) {
    const batch = db.batch();
    for (const emp of employeesToMigrate) {
      const activeBranchId = emp.branchId || firstBranchId;
      const empRef = db.doc(`${newTenantBase}/branches/${activeBranchId}/employees/${emp.id}`);
      batch.set(empRef, {
        id: emp.id,
        name: emp.name || "Karyawan",
        role: emp.role || "karyawan",
        username: emp.username || emp.name?.toLowerCase().replace(/\s+/g, "") || "karyawan",
        password: emp.password || "123456",
        isActive: emp.isActive !== undefined ? emp.isActive : true,
        branchId: activeBranchId
      });
    }
    await batch.commit();
    console.log(`   ✅ Berhasil mendaftarkan karyawan ke cabang.`);
  }

  // 3. Migrasi LAYANAN (Service) - global per tenant
  // Subkoleksi baru: /tenants/{ownerUid}/services/{serviceId}
  await migrateCollection({
    srcPath: oldTenantBase,
    collectionName: "services",
    ownerUid,
    destPathBuilder: (data, id) => `${newTenantBase}/services/${id}`
  });

  // 4. Migrasi PARFUM (Perfume) - global per tenant
  // Subkoleksi baru: /tenants/{ownerUid}/perfumes/{perfumeId}
  await migrateCollection({
    srcPath: oldTenantBase,
    collectionName: "parfume", // Lama: "parfume", Baru: "perfumes"
    ownerUid,
    destPathBuilder: (data, id) => `${newTenantBase}/perfumes/${id}`,
    transform: (data) => ({
      id: data.id,
      name: data.name,
      description: data.description || "",
      isActive: data.isActive !== undefined ? data.isActive : true
    })
  });

  // 5. Migrasi SETTING (SystemSettings) - Dokumen Tunggal settings/general
  console.log(`\n⚙️ Memigrasi pengaturan sistem ke /tenants/${ownerUid}/settings/general...`);
  const oldSettingsRef = db.doc(`${oldTenantBase}/settings/system`);
  const oldSettingsSnap = await oldSettingsRef.get();
  if (oldSettingsSnap.exists) {
    const settingsData = oldSettingsSnap.data();
    await db.doc(`${newTenantBase}/settings/general`).set({
      logoUrl: settingsData.logoUrl || "",
      pointsMultiplier: settingsData.pointsMultiplier || 10000,
      pointsValue: settingsData.pointsValue || 100,
      bluetoothPrinterAddress: settingsData.bluetoothPrinterAddress || ""
    });
    console.log("   ✅ Berhasil memigrasi pengaturan sistem.");
  } else {
    console.log("   ⚠️ Tidak ditemukan pengaturan lama. Menyiapkan pengaturan bawaan...");
    await db.doc(`${newTenantBase}/settings/general`).set({
      logoUrl: "",
      pointsMultiplier: 10000,
      pointsValue: 100,
      bluetoothPrinterAddress: ""
    });
    console.log("   ✅ Pengaturan default berhasil dibuat.");
  }

  // 6. Migrasi PELANGGAN (Customer) - global per tenant
  // Subkoleksi baru: /tenants/{ownerUid}/customers/{customerId}
  await migrateCollection({
    srcPath: oldTenantBase,
    collectionName: "customers",
    ownerUid,
    destPathBuilder: (data, id) => `${newTenantBase}/customers/${id}`
  });

  // 7. Migrasi PENGELUARAN (Expense) - per cabang
  // Subkoleksi baru: /tenants/{ownerUid}/branches/{branchId}/expenses/{expenseId}
  await migrateCollection({
    srcPath: oldTenantBase,
    collectionName: "expenses",
    ownerUid,
    destPathBuilder: (data) => {
      const bId = data.branchId || firstBranchId;
      return `${newTenantBase}/branches/${bId}/expenses/${data.id}`;
    }
  });

  // 8. Migrasi ORDER (Transaksi Utama) - per cabang
  // Subkoleksi baru: /tenants/{ownerUid}/branches/{branchId}/orders/{orderId}
  await migrateCollection({
    srcPath: oldTenantBase,
    collectionName: "orders",
    ownerUid,
    destPathBuilder: (data) => {
      const bId = data.branchId || firstBranchId;
      return `${newTenantBase}/branches/${bId}/orders/${data.id}`;
    },
    transform: (data) => {
      // Mengubah format order ke bentuk flat layanan array (kalo dulu ada item_list string atau arrays)
      if (!data.services) {
        data.services = [
          {
            serviceId: data.serviceId || "srv-default",
            name: data.servicesList || "Layanan Cuci",
            qty: data.totalQuantity || 1,
            price: data.totalAmount || data.price || 0,
            subtotal: data.totalAmount || 0
          }
        ];
      }
      return data;
    }
  });

  // 9. Migrasi ATTENDANCE (Absen) - per cabang per karyawan
  // Subkoleksi baru: /tenants/{ownerUid}/branches/{branchId}/employees/{employeeId}/attendance/{attendanceId}
  await migrateCollection({
    srcPath: oldTenantBase,
    collectionName: "attendance",
    ownerUid,
    destPathBuilder: (data) => {
      const bId = data.branchId || firstBranchId;
      const eId = data.userId || "emp-default";
      return `${newTenantBase}/branches/${bId}/employees/${eId}/attendance/${data.id}`;
    }
  });

  // 10. Migrasi PUSH NOTIFICATIONS - per tenant
  // Subkoleksi baru: /tenants/{ownerUid}/notifications/{notificationId}
  await migrateCollection({
    srcPath: oldTenantBase,
    collectionName: "push_notifications",
    ownerUid,
    destPathBuilder: (data, id) => `${newTenantBase}/notifications/${id}`
  });

  console.log(`\n💎 SELESAI MEMIGRASI TENANT: ${ownerUid}\n`);
}

/**
 * Fungsi jalankan utama
 */
async function run() {
  const args = process.argv.slice(2);
  const targetUid = args[0];

  if (targetUid) {
    // Migrasi satu tenant spesifik
    await migrateTenant(targetUid);
  } else {
    // Otomatis deteksi semua dokumen di root /users_db
    console.log("🔍 Memindai seluruh dokumen Uid di koleksi root '/users_db'...");
    try {
      const usersDbRef = db.collection("users_db");
      const docs = await usersDbRef.listDocuments();
      
      if (docs.length === 0) {
        console.log("❌ Tidak ditemukan dokumen tenant apa pun di bawah '/users_db'.");
        console.log("   Gunakan command ini untuk memaksa migrasi id spesifik: node migrate.js <ownerUid>");
        process.exit(0);
      }

      console.log(`📂 Menemukan ${docs.length} tenant untuk dimigrasi.`);
      for (const docRef of docs) {
        await migrateTenant(docRef.id);
      }
      console.log("\n⭐️ SELURUH PROSES MIGRASI DATABASE BERHASIL SELESAI! ⭐️");
    } catch (err) {
      console.error("❌ Gagal mendeteksi seluruh tenant:", err.message);
      console.log("   Maka silakan jalankan dengan menyertakan ownerUid spesifik.");
    }
  }
}

run();
