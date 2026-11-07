# Regression Hub

Regression Hub membantu tim QA mengelola test case dan menjalankan pengujian regresi per sesi. Tim dapat membagi modul, mencatat hasil eksekusi sampai tingkat langkah, lalu melihat ringkasan progres dan analitik.

## Alur kerja

1. Admin atau lead mengatur anggota tim, environment, modul, dan test case.
2. QA membuat sesi pengujian untuk environment yang dipilih dan memasukkan modul yang akan diuji.
3. Anggota tim mengambil modul, lalu menjalankan test case dan mencatat status serta catatan. Status juga dapat dicatat per langkah.
4. Tim memantau tugas, progres sesi, dan analitik dari dashboard. Test case atau sesi yang dihapus dapat dikelola dari Trash.

## Fitur

- Login dengan autentikasi JWT dan pembatasan akses berdasarkan role.
- Pengelolaan sesi, modul, test case, pengguna, environment, dan status.
- Klaim modul untuk membagi pekerjaan eksekusi.
- Pencatatan hasil pada tingkat test case dan langkah.
- Import dan export test case.
- Dashboard, daftar tugas, notifikasi perubahan test case, dan analitik.
- Pemulihan data dari Trash serta penghapusan permanen.

## Teknologi

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, dan Recharts.
- Backend: NestJS, TypeScript, Prisma ORM, dan PostgreSQL.

<!-- Frontend dan backend dikelola di direktori masing-masing. Jalankan keduanya sebagai proses terpisah saat pengembangan.

## Persiapan lokal

Pastikan Node.js dan PostgreSQL tersedia. Buat database PostgreSQL untuk aplikasi, lalu siapkan variabel koneksi di `backend/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DATABASE?schema=public"
```

Ganti `USER`, `PASSWORD`, dan `DATABASE` dengan kredensial serta nama database lokal Anda. Jangan commit berkas `.env`.

### Jalankan backend

```bash
cd backend
npm install
npx prisma db push
npm run start:dev
```

API berjalan di `http://localhost:4000` secara default. Anda dapat mengganti port dengan variabel `PORT`.

### Jalankan frontend

Di terminal lain, dari direktori root proyek:

```bash
cd frontend
npm install
npm run dev
```

Buka `http://localhost:3000`. URL API frontend secara default adalah `http://localhost:4000`. Untuk alamat backend yang berbeda, atur `NEXT_PUBLIC_API_URL` pada environment frontend sebelum menjalankan atau membangun aplikasi.

## Perintah pengembangan

Jalankan perintah backend dari `backend/`:

| Perintah | Kegunaan |
| --- | --- |
| `npm run start:dev` | Menjalankan API dengan watch mode |
| `npm run build` | Membuat build backend |
| `npm run test` | Menjalankan unit test |
| `npm run test:e2e` | Menjalankan test end-to-end |
| `npm run lint` | Memeriksa kode backend |

Jalankan perintah frontend dari `frontend/`:

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Menjalankan Next.js untuk pengembangan |
| `npm run build` | Membuat build frontend |
| `npm run start` | Menjalankan build frontend |
| `npm run lint` | Memeriksa kode frontend |

## Struktur proyek

```text
backend/
  prisma/       Skema, migrasi, dan seed database
  src/          Modul API NestJS
frontend/
  src/app/      Halaman Next.js
  src/components/ Komponen antarmuka
README.md
```

Seed di `backend/prisma/seed.ts` menghapus data dari beberapa tabel sebelum mengisi data contoh. Tinjau skrip dan kredensial demo di dalamnya, lalu jalankan hanya pada database lokal yang datanya boleh dihapus. -->
