# STEP 4 — Database Schema

## 1. Tujuan

Database Mindboard digunakan untuk menyimpan akun pengguna, materi yang digunakan untuk membuat mind map, mind map yang telah dibuat, serta struktur konsep yang terdapat di dalam mind map.

Schema dibuat berdasarkan fitur utama yang telah disetujui pada PRD dan user flow.

---

## 2. Tabel Database

Mindboard menggunakan 5 tabel utama:

1. `users`
2. `maps`
3. `materials`
4. `nodes`
5. `edges`

Relasinya:

```text
users
  |
  └── maps
        |
        ├── materials
        ├── nodes
        |     |
        |     └── nodes
        └── edges
```

---

# 3. Tabel `users`

Menyimpan informasi akun pengguna.

| Kolom | Tipe Data | Keterangan |
|---|---|---|
| id | UUID | Primary key |
| name | VARCHAR(100) | Nama pengguna |
| email | VARCHAR(255) | Email pengguna, harus unik |
| password_hash | TEXT | Password yang sudah di-hash |
| created_at | TIMESTAMP | Waktu akun dibuat |
| updated_at | TIMESTAMP | Waktu data diperbarui |

### Primary Key

```text
id
```

### Constraint

```text
email UNIQUE
```

---

# 4. Tabel `maps`

Menyimpan informasi setiap mind map yang dibuat pengguna.

| Kolom | Tipe Data | Keterangan |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | Foreign key ke users |
| title | VARCHAR(255) | Judul mind map |
| created_at | TIMESTAMP | Waktu mind map dibuat |
| updated_at | TIMESTAMP | Waktu terakhir diperbarui |

### Primary Key

```text
id
```

### Foreign Key

```text
user_id → users.id
```

### Relasi

```text
1 User
   |
   └── banyak Maps
```

Satu pengguna dapat memiliki banyak mind map.

---

# 5. Tabel `materials`

Menyimpan materi yang digunakan untuk menghasilkan mind map.

Materi dapat berasal dari teks atau PDF.

| Kolom | Tipe Data | Keterangan |
|---|---|---|
| id | UUID | Primary key |
| map_id | UUID | Foreign key ke maps |
| type | VARCHAR(20) | Jenis materi: text atau pdf |
| content | TEXT | Isi materi atau teks hasil ekstraksi |
| file_name | VARCHAR(255) | Nama file jika input berupa PDF |
| created_at | TIMESTAMP | Waktu materi ditambahkan |

### Primary Key

```text
id
```

### Foreign Key

```text
map_id → maps.id
```

---

# 6. Tabel `nodes`

Menyimpan konsep-konsep yang terdapat pada mind map.

| Kolom | Tipe Data | Keterangan |
|---|---|---|
| id | UUID | Primary key |
| map_id | UUID | Foreign key ke maps |
| parent_id | UUID | Foreign key ke nodes, dapat NULL |
| label | VARCHAR(255) | Nama konsep |
| description | TEXT | Penjelasan konsep |
| position_x | FLOAT | Posisi horizontal pada whiteboard |
| position_y | FLOAT | Posisi vertikal pada whiteboard |
| level | INTEGER | Tingkatan konsep |
| created_at | TIMESTAMP | Waktu node dibuat |
| updated_at | TIMESTAMP | Waktu node diperbarui |

### Primary Key

```text
id
```

### Foreign Key

```text
map_id → maps.id
parent_id → nodes.id
```

`parent_id` digunakan untuk mengetahui hubungan hierarki antar konsep.

---

# 7. Tabel `edges`

Menyimpan hubungan antar konsep pada whiteboard.

| Kolom | Tipe Data | Keterangan |
|---|---|---|
| id | UUID | Primary key |
| map_id | UUID | Foreign key ke maps |
| source_node_id | UUID | Node asal |
| target_node_id | UUID | Node tujuan |
| relationship | VARCHAR(100) | Jenis hubungan |
| created_at | TIMESTAMP | Waktu hubungan dibuat |

### Primary Key

```text
id
```

### Foreign Key

```text
map_id → maps.id
source_node_id → nodes.id
target_node_id → nodes.id
```

---

# 8. Relasi Antar Tabel

```text
users
  |
  └── maps
        ├── materials
        ├── nodes
        |     └── nodes (self relation)
        └── edges
```

---

# 9. Fitur yang Didukung Schema

| Fitur | Tabel |
|---|---|
| Register / Login | `users` |
| Membuat mind map | `maps` |
| Upload PDF | `materials` |
| Paste text | `materials` |
| Menyimpan konsep | `nodes` |
| Hubungan antar konsep | `edges` |
| Memindahkan konsep | `nodes.position_x`, `nodes.position_y` |
| Explain | `nodes.description` + AI |
| Expand | `nodes.parent_id` + `nodes` baru |
| Save Map | `maps`, `nodes`, `edges` |
| Membuka kembali map | `maps`, `nodes`, `edges` |

---

# 10. Keputusan Schema

Untuk MVP Mindboard:

- Database menggunakan **PostgreSQL**.
- Database akan menggunakan **Supabase atau Neon** sesuai stack yang ditentukan SOP.
- Setiap user dapat memiliki banyak mind map.
- Setiap mind map dapat memiliki materi.
- Setiap mind map memiliki banyak node.
- Node dapat memiliki parent node.
- Hubungan antar node disimpan pada tabel `edges`.
- Posisi node pada whiteboard disimpan di database agar posisi mind map tetap tersimpan ketika dibuka kembali.
- Schema tidak memasukkan fitur collaboration, sharing, social, atau analytics karena fitur tersebut berada di luar MVP.
