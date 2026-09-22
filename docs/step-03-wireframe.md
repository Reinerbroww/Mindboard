# STEP 3 — Wireframe

## 1. Tujuan

Wireframe digunakan untuk menentukan struktur, susunan, dan fungsi utama setiap halaman Mindboard sebelum masuk ke tahap visual design.

Wireframe tidak menentukan warna, font, ilustrasi, atau detail visual final.

---

# 2. Daftar Halaman

Mindboard memiliki halaman utama berikut:

1. Landing Page
2. Login
3. Register
4. Dashboard
5. Create New Map
6. AI Processing
7. Interactive Whiteboard

---

# 3. Landing Page

## Tujuan

Menjelaskan secara singkat fungsi Mindboard dan mengarahkan pengguna untuk mulai menggunakan aplikasi.

## Struktur

```text
------------------------------------------------
| Logo Mindboard                  Login        |
------------------------------------------------
|                                              |
|        Turn your study materials             |
|        into an interactive knowledge space   |
|                                              |
|        Penjelasan singkat Mindboard           |
|                                              |
|             [ Get Started ]                  |
|                                              |
------------------------------------------------

Elemen
Logo / nama Mindboard
Tombol Login
Headline
Deskripsi singkat produk
Tombol Get Started
Aksi

Get Started → Login / Register

Login → Login Page

4. Login Page
Tujuan

Memungkinkan pengguna masuk ke akun Mindboard.

Struktur
--------------------------------
|          Mindboard            |
|                              |
|          Welcome Back        |
|                              |
| Email                        |
| [____________________]       |
|                              |
| Password                     |
| [____________________]       |
|                              |
|        [ Login ]             |
|                              |
| Don't have an account?       |
| Register                     |
--------------------------------
Elemen
Logo / nama Mindboard
Input email
Input password
Tombol Login
Link Register
Aksi

Login → Dashboard

Register → Register Page

5. Register Page
Tujuan

Memungkinkan pengguna membuat akun baru.

Struktur
--------------------------------
|          Mindboard            |
|                              |
|       Create Account         |
|                              |
| Name                         |
| [____________________]       |
|                              |
| Email                        |
| [____________________]       |
|                              |
| Password                     |
| [____________________]       |
|                              |
|       [ Register ]           |
|                              |
| Already have an account?     |
| Login                        |
--------------------------------
Elemen
Nama
Email
Password
Tombol Register
Link Login
Aksi

Register berhasil → Dashboard

6. Dashboard
Tujuan

Menjadi halaman utama pengguna setelah login dan tempat untuk mengelola mind map yang telah dibuat.

Struktur
------------------------------------------------
| Mindboard                    Profile / Logout |
------------------------------------------------
|                                              |
| My Learning Maps                             |
|                                              |
| [ + Create New Map ]                         |
|                                              |
| -------------------------------------------- |
| | Machine Learning                         | |
| | Last edited: Today                       | |
| |                         [ Open ]          | |
| -------------------------------------------- |
|                                              |
| -------------------------------------------- |
| | Database Systems                          | |
| | Last edited: Yesterday                   | |
| |                         [ Open ]          | |
| -------------------------------------------- |
------------------------------------------------
Elemen
Header
Nama Mindboard
Profile / Logout
Judul halaman
Tombol Create New Map
Daftar mind map
Informasi waktu terakhir diperbarui
Tombol Open
Aksi

Create New Map → Create New Map Page

Open → Interactive Whiteboard

7. Create New Map
Tujuan

Memungkinkan pengguna memasukkan materi yang ingin diubah menjadi mind map.

Struktur
------------------------------------------------
| ← Back                 Create New Map        |
------------------------------------------------
|                                              |
|        Add your study material               |
|                                              |
|  [ Upload PDF ]                             |
|                                              |
|                 OR                           |
|                                              |
|  Paste your material                        |
|  ------------------------------------------  |
|  |                                        | |
|  |                                        | |
|  |                                        | |
|  ------------------------------------------  |
|                                              |
|              [ Generate Mind Map ]           |
------------------------------------------------
Elemen
Back button
Judul halaman
Upload PDF
Area paste text
Tombol Generate Mind Map
Aksi

Upload PDF → File terpilih ditampilkan

Paste Text → Materi ditampilkan pada text area

Generate Mind Map → AI Processing

8. AI Processing
Tujuan

Memberikan feedback visual kepada pengguna ketika AI sedang menganalisis materi dan membuat mind map.

Struktur
------------------------------------------------
|                                              |
|                                              |
|              Creating your map               |
|                                              |
|                 [ Loading ]                  |
|                                              |
|       Reading your material...               |
|       Finding key concepts...                |
|       Understanding relationships...         |
|       Building your knowledge map...         |
|       Drawing your mind map...               |
|                                              |
------------------------------------------------
Elemen
Status proses
Loading animation
Progress information
Tahapan Status
Reading your material...
Finding key concepts...
Understanding relationships...
Building your knowledge map...
Drawing your mind map...
Aksi

Setelah proses selesai → Interactive Whiteboard

9. Interactive Whiteboard
Tujuan

Menjadi ruang utama untuk melihat, mengeksplorasi, dan mengembangkan mind map.

Struktur
----------------------------------------------------------------
| ← Dashboard | Map Title                         [ Save ]      |
----------------------------------------------------------------
|                                                              |
|                                                              |
|                    [ Main Concept ]                           |
|                          |                                   |
|              ------------+------------                       |
|              ↓                         ↓                     |
|       [ Concept A ]              [ Concept B ]               |
|              |                         |                     |
|              ↓                         ↓                     |
|       [ Sub Concept ]             [ Sub Concept ]            |
|                                                              |
|                                                              |
|                                             [ Zoom + ]       |
|                                             [ Zoom - ]       |
|                                             [ Fit Map ]      |
----------------------------------------------------------------
Elemen
Header
Back to Dashboard
Map title
Save button
Whiteboard
Root concept
Main concepts
Sub-concepts
Connections
Infinite canvas
Canvas Controls
Zoom in
Zoom out
Fit map
Concept Interaction

Ketika pengguna memilih sebuah konsep, muncul panel atau menu tindakan:

-------------------------
| Selected Concept      |
|                       |
| [ Explain ] [ Expand ]|
-------------------------
Explain

User memilih Explain.

AI memberikan penjelasan mengenai konsep yang dipilih berdasarkan materi yang digunakan.

Penjelasan muncul pada panel di dalam whiteboard.

Expand

User memilih Expand.

AI menghasilkan sub-konsep baru.

Sub-konsep tersebut ditambahkan langsung ke whiteboard.

Contoh:

SVM
 |
 +-- Hyperplane
 +-- Margin
 +-- Support Vector
 +-- Kernel
10. Navigasi Antar Halaman
Landing Page
    |
    +------ Login
    |         |
    |         v
    +------ Register
              |
              v
          Dashboard
              |
              +----------------+
              |                |
              v                v
       Create New Map      Open Map
              |                |
              v                |
        AI Processing           |
              |                |
              v                |
      Interactive Whiteboard <-+
              |
              v
            Save
              |
              v
          Dashboard
11. Prinsip Wireframe
Fokus pada fungsi dan struktur, bukan visual final.
Setiap halaman harus memiliki tujuan yang jelas.
User harus dapat berpindah dari satu tahap ke tahap berikutnya tanpa alur yang membingungkan.
Interactive Whiteboard menjadi halaman utama setelah mind map berhasil dibuat.
Explain dan Expand harus tetap berada dalam konteks whiteboard.
Jangan menambahkan fitur di luar PRD MVP tanpa persetujuan.

### Yang penting dari STEP 3 ini

Sekarang kita sudah menentukan **kerangka aplikasinya**, tapi belum menentukan:

- warna,
- jenis font,
- style node,
- style garis,
- animasi final,
- estetika whiteboard.

Itu memang **belum kita kerjakan sekarang**, karena SOP memisahkan wireframe dari **STEP 5 — Style & Mood**. :contentReference[oaicite:1]{index=1}

Jadi urutannya sekarang:

**STEP 1 — PRD ✅**  
**STEP 2 — Persona & User Flow ✅**  
**STEP 3 — Wireframe ← sekarang**  
↓  
**STEP 4 — Database Schema**  
↓  
**STEP 5 — Style & Mood + `coldstart.md`**

Kalau wireframe ini sudah sesuai, kita jadikan `step-03-wireframe.md`, lalu lanjut **STEP 4 — Database Schema**.