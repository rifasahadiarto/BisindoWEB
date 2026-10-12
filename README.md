# BISINDO Kids

Aplikasi web sederhana untuk belajar dasar Bahasa Isyarat Indonesia (BISINDO) melalui deteksi gerakan tangan dari kamera.

## Fitur

- Deteksi bentuk tangan dan huruf menggunakan kamera.
- Menampilkan huruf terdeteksi dalam visualisasi 3D.
- Menyusun huruf menjadi kata.
- Membacakan kata melalui fitur suara browser.
- Panduan bentuk isyarat dasar.

## Struktur project

```text
BisindoWEB/
├── index.html
├── style.css
├── script.js
├── README.md
└── .gitignore
```

Pastikan ketiga file aplikasi (`index.html`, `style.css`, dan `script.js`) tetap berada di folder yang sama.

## Menjalankan

Buka `index.html` di browser, tekan **Mulai Belajar**, lalu izinkan akses kamera.

Project ini memuat Three.js, MediaPipe, font, dan ikon dari layanan CDN, jadi koneksi internet diperlukan. Browser juga harus mengizinkan akses kamera untuk halaman yang dibuka.

## Teknologi

- HTML, CSS, dan JavaScript
- [Three.js](https://threejs.org/) untuk visualisasi 3D
- [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) untuk deteksi tangan

## Upload ke GitHub

1. Buat repository baru di GitHub.
2. Upload semua file dari folder ini, termasuk `.gitignore` dan `README.md`.
3. Pastikan `index.html`, `style.css`, dan `script.js` berada di root repository agar tautan antarfile tetap sesuai.
