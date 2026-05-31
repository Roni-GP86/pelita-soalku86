export interface FallbackSubjectData {
  cp: string;
  element: string;
  topics: string[];
}

export const FALLBACK_CURRICULUMS: Record<string, FallbackSubjectData[]> = {
  // === MATEMATIKA ===
  "Matematika - Fase A": [
    {
      element: "Bilangan",
      cp: "Peserta didik menunjukkan pemahaman dan memiliki intuisi bilangan (number sense) pada bilangan cacah sampai 100, mereka dapat membaca, menulis, menentukan nilai tempat, membandingkan, mengurutkan, serta melakukan penjumlahan dan pengurangan bilangan cacah sampai 20.",
      topics: ["Mengenal Bilangan Cacah 1-99", "Nilai Tempat Puluhan dan Satuan", "Penjumlahan dan Pengurangan Sederhana", "Mengurutkan Bilangan Bulat Kecil"]
    },
    {
      element: "Aljabar",
      cp: "Peserta didik mengidentifikasi, menduplikasi, dan mengembangkan pola gambar dan pola bilangan sederhana dengan meniru pola yang sudah ada secara urut.",
      topics: ["Pola Gambar Segitiga dan Lingkaran", "Melengkapi Pola Bilangan 1-20", "Pola Berulang dengan Benda Konkrit"]
    },
    {
      element: "Pengukuran",
      cp: "Peserta didik memperkirakan dan mengukur panjang dan berat benda menggunakan satuan tidak baku (jengkal, depa, langkah kaki) serta membandingkan dua objek secara langsung.",
      topics: ["Mengukur Panjang dengan Jengkal", "Membandingkan Berat Dua Benda di Kelas", "Konsep Waktu Pagi Siang dan Malam"]
    },
    {
      element: "Geometri",
      cp: "Peserta didik mengenal berbagai bangun datar (segitiga, segi empat, lingkaran) dan bangun ruang (balok, kubus, bola) sederhana dalam kehidupan praktis sehari-hari.",
      topics: ["Ciri Sederhana Bangun Datar", "Perpindahan Lokasi Objek", "Memilah Bentuk Kubus dan Bola"]
    }
  ],
  "Matematika - Fase B": [
    {
      element: "Bilangan",
      cp: "Peserta didik menunjukkan pemahaman bilangan cacah sampai 10.000, menentukan nilai tempat, melakukan operasi perkalian dan pembagian, serta memahami pecahan senilai dan pecahan desimal persepuluhan.",
      topics: ["Nilai Tempat Ribuan dan Ratusan", "Operasi Perkalian dan Pembagian", "Pecahan Senilai & Sederhana", "Mengenal Desimal dan Persentase"]
    },
    {
      element: "Aljabar",
      cp: "Peserta didik mengidentifikasi pola gambar membesar dan mengecil, serta menggunakan operasi penjumlahan dan pengurangan dalam kalimat matematika terbuka menggunakan simbol variabel sederhana.",
      topics: ["Pola Gambar Membesar dan Menyusut", "Kalimat Terbuka dengan Simbol Kotak Sederhana", "Menyusun Pola Bilangan Lompat"]
    },
    {
      element: "Pengukuran",
      cp: "Peserta didik mengukur panjang dan luas menggunakan satuan baku (m, cm, kg, g, liter) serta menghitung keliling bangun datar sederhana.",
      topics: ["Mengukur dengan Penggaris dan Meteran", "Menghitung Keliling Persegi dan Segitiga", "Membaca Waktu Menggunakan Jam Dinding"]
    },
    {
      element: "Geometri",
      cp: "Peserta didik mendeskripsikan ciri-ciri berbagai bentuk bangun datar segitiga dan segi empat, serta menyusun (komposisi) atau mengurai (dekomposisi) bentuk geometri tersebut.",
      topics: ["Sifat Segitiga Siku-Siku dan Sama Kaki", "Sifat Persegi dan Persegi Panjang", "Jaring-Jaring Kubus Sederhana"]
    },
    {
      element: "Analisis Data",
      cp: "Peserta didik mengumpulkan data secara sederhana, mengurutkan, membandingkan, serta menyajikannya dalam bentuk tabel atau diagram batang.",
      topics: ["Membaca Diagram Batang Kelas", "Mengelompokkan Data Warna Kesukaan", "Menyusun Data Nilai Hasil Belajar"]
    }
  ],
  "Matematika - Fase C": [
    {
      element: "Bilangan",
      cp: "Peserta didik memahami bilangan cacah sampai 1.000.000, bilangan bulat negatif dalam skala termometer, melakukan operasi hitung pecahan (perkalian dan pembagian), serta memahami konsep rasio dan skala.",
      topics: ["Operasi Bilangan Bulat Negatif", "Perkalian dan Pembagian Pecahan Campuran", "Penerapan Skala pada Peta", "Menghitung Rasio dan Perbandingan Jumlah Benda"]
    },
    {
      element: "Aljabar",
      cp: "Peserta didik menganalisis dan menyelesaikan persamaan linear satu variabel sederhana dengan simbol, serta merancang tabel perbandingan senilai.",
      topics: ["Mencari Nilai Variabel Misterius", "Persamaan Linear Satu Variabel Sederhana", "Tabel Perbandingan Senilai dan Grafik"]
    },
    {
      element: "Pengukuran",
      cp: "Peserta didik menghitung keliling dan luas daerah lingkaran, luas permukaan gabungan, serta menghitung volume bangun ruang seperti kubus dan balok.",
      topics: ["Luas dan Keliling Poligon Gabungan", "Menghitung Volume Balok Beserta Kubus", "Hubungan Volume Liter desimeter kubik"]
    },
    {
      element: "Geometri",
      cp: "Peserta didik mengidentifikasi sifat-sifat bangun datar dan bangun ruang kompleks, membangun jaring-jaring prisma/tabung, serta memahami koordinat Kartesius.",
      topics: ["Sifat Jaring Jaring Tabung dan Limas", "Menggambar Titik di Koordinat Kartesius", "Sifat Sudut Berpelurus dan Berseberangan"]
    },
    {
      element: "Analisis Data",
      cp: "Peserta didik menyajikan dan menganalisis data dalam diagram lingkaran, serta menentukan nilai rata-rata (mean), median, dan modus dari suatu data tunggal.",
      topics: ["Menganalisis Diagram Lingkaran", "Menghitung Nilai Rata-Rata (Mean) Raport", "Menentukan Median dan Nilai Paling Sering Muncul (Modus)"]
    }
  ],

  // === BAHASA INDONESIA ===
  "Bahasa Indonesia - Fase A": [
    {
      element: "Menyimak",
      cp: "Peserta didik mampu bersikap menjadi penyimak yang baik, memahami instruksi lisan sederhana, serta menangkap alur cerita anak yang dibacakan dengan santun.",
      topics: ["Menyimak Cerita Dongeng Guru", "Merespons Petunjuk Lisan Permainan", "Mengidentifikasi Tokoh dalam Fabel lisan"]
    },
    {
      element: "Membaca dan Memirsa",
      cp: "Peserta didik mengeja suku kata dengan lancar, membaca kosakata harian, memaknai teks petunjuk bergambar, serta memahami isi bacaan cerita anak bergambar.",
      topics: ["Mengeja Kata Berpola K-V-K-V", "Membaca Teks Pendek Bergambar", "Memahami Isi Pesan Poster Kebersihan"]
    },
    {
      element: "Berbicara dan Presentasi",
      cp: "Peserta didik menyampaikan gagasan secara mandiri, menceritakan kembali cerita pendek dengan runtut, serta bersikap santun saat berbicara dengan guru dan teman.",
      topics: ["Perkenalan Diri yang Santun", "Menceritakan Pengalaman Masa Libur", "Melafalkan Puisi Anak dengan Intonasi Tepat"]
    },
    {
      element: "Menulis",
      cp: "Peserta didik menulis kalimat pendek dengan huruf tegak bersambung, menulis ejaan sederhana (tanda titik dan huruf kapital di awal kalimat), serta mengisi formulir data diri.",
      topics: ["Menulis Huruf Tegak Bersambung", "Penggunaan Huruf Kapital dan Titik", "Menulis Nama Lengkap dan Hobi"]
    }
  ],
  "Bahasa Indonesia - Fase B": [
    {
      element: "Menyimak",
      cp: "Peserta didik memahami ide pokok lisan dari teks naratif/eksposisi, merangkum instruksi yang didengarnya, serta menanggapi pertanyaan secara tepat.",
      topics: ["Menangkap Ide Pokok Teks Berita", "Menulis Rangkuman Instruksi Kerja Bakti", "Menjawab Tanya Jawab Stimulus Audio"]
    },
    {
      element: "Membaca dan Memirsa",
      cp: "Peserta didik membaca dengan intonasi lancar, mengidentifikasi tokoh, watak, latar cerita, memahami arti kata baru dari kamus besar/teks, dan membedakan fakta dan opini.",
      topics: ["Membaca Lancar dengan Intonasi Tepat", "Menganalisis Watak Tokoh Cerita Rakyat", "Membedakan Fakta dan Opini dalam Paragraf"]
    },
    {
      element: "Berbicara dan Presentasi",
      cp: "Peserta didik berdiskusi aktif dengan teman, menyampaikan gagasan disertai argumentasi sederhana, mempresentasikan hasil karya atau laporan pengamatan secara lisan.",
      topics: ["Etika Berdiskusi Kelompok", "Presentasi Laporan Hasil Pengamatan Kelas", "Menyampaikan Tanggapan yang Sopan"]
    },
    {
      element: "Menulis",
      cp: "Peserta didik menulis teks narasi, prosedur, deskripsi, atau laporan pengamatan dengan EYD yang tepat, serta merangkai paragraf padu dengan kosakata baru.",
      topics: ["Menyusun Paragraf Narasi", "Menulis Urutan Teks Prosedur Kegiatan", "Menerapkan Tanda Baca Koma dan Tanda Tanya"]
    }
  ],
  "Bahasa Indonesia - Fase C": [
    {
      element: "Menyimak",
      cp: "Peserta didik menganalisis informasi, gagasan, pikiran, atau pesan dari teks lisan/audio secara kritis, serta mencatat ide pokok dan pendukung.",
      topics: ["Menganalisis Pidato Kepala Sekolah lisan", "Mencatat Gagasan Pokok Wawancara", "Menilai Pesan Terselubung Cerita lisan"]
    },
    {
      element: "Membaca dan Memirsa",
      cp: "Peserta didik menganalisis karakter tokoh, nilai-nilai, atau pesan moral dari berbagai genre bacaan, memilah informasi dari teks multimoda.",
      topics: ["Menemukan Pesan Moral Hikayat Nusantara", "Menganalisis Karya Infografis Ilmiah", "Membedakan Kalimat Utama dan Penjelas"]
    },
    {
      element: "Berbicara dan Presentasi",
      cp: "Peserta didik berpidato, memerankan tokoh, memimpin diskusi kelompok dengan sopan, serta mempresentasikan data ilmiah sederhana secara runtut.",
      topics: ["Berpidato Tema Kemerdekaan RI", "Memimpin Rapat Musyawarah Kelas", "Apresiasi Seni Drama Singkat Kelas"]
    },
    {
      element: "Menulis",
      cp: "Peserta didik menulis karya sastra sederhana (pantun, puisi, cerpen), laporan ilmiah, teks eksposisi secara mandiri menggunakan EYD, konjungsi, dan variasi kalimat efektif.",
      topics: ["Menulis Pantun Nasihat Berima A-B-A-B", "Menyusun Laporan Penelitian Sains Sederhana", "Menulis Teks Eksposisi Argumentatif"]
    }
  ],

  // === PENDIDIKAN PANCASILA ===
  "Pendidikan Pancasila - Fase A": [
    {
      element: "Pancasila",
      cp: "Peserta didik mengenal simbol dan sila Pancasila, menceritakan hubungan simbol dengan sila, serta menerapkan nilai Pancasila di rumah dan sekolah.",
      topics: ["Simbol Garuda Pancasila", "Menghafal Sila-Sila Pancasila", "Contoh Gotong Royong Karakter Pancasila"]
    },
    {
      element: "Undang-Undang Dasar Negara Republik Indonesia Tahun 1945",
      cp: "Peserta didik mengenal aturan di rumah dan di sekolah, menaati aturan tersebut, serta menyebutkan hak dan kewajiban.",
      topics: ["Aturan Makan dan Belajar di Rumah", "Kewajiban Memakai Seragam di Sekolah", "Menaati Guru dan Orang Tua"]
    },
    {
      element: "Bhinneka Tunggal Ika",
      cp: "Peserta didik menyebutkan identitas diri dan teman, menghargai perbedaan fisik dan kegemaran, serta menyebutkan keberagaman di sekolah.",
      topics: ["Saling Menghargai Perbedaan Fisik", "Keberagaman Suku Bangsa Teman Sekelas", "Sikap Toleransi Keberagaman"]
    },
    {
      element: "Negara Kesatuan Republik Indonesia",
      cp: "Peserta didik mengenal karakteristik lingkungan rumah dan sekolah, menceritakan contoh gotong-royong, serta menjaga persatuan lingkungan sekitar.",
      topics: ["Mengenal Bagian Lingkungan Rumah", "Kerja Bakti Bersama Keluarga", "Sikap Menjaga Persatuan Pertemanan"]
    }
  ],
  "Pendidikan Pancasila - Fase B": [
    {
      element: "Pancasila",
      cp: "Peserta didik menyusun urutan sila Pancasila, menceritakan makna simbol, menerapkan nilai Pancasila dalam kehidupan sehari-hari, serta mengidentifikasi gotong royong dan kebersamaan.",
      topics: ["Makna Filosofis Simbol Pancasila", "Penerapan Nilai Kejujuran Sila Kesatu", "Kegiatan Kerja Sama dan Gotong Royong"]
    },
    {
      element: "Undang-Undang Dasar Negara Republik Indonesia Tahun 1945",
      cp: "Peserta didik mengidentifikasi aturan di sekolah, rumah, dan lingkungan sekitar, menaati aturan tersebut, serta hak dan kewajiban sebagai warga sekolah dan anggota keluarga.",
      topics: ["Melaksanakan Aturan di Lingkungan RT", "Hak Anak Mendapatkan Nilai Belajar", "Kewajiban Piket Kebersihan Kelas"]
    },
    {
      element: "Bhinneka Tunggal Ika",
      cp: "Peserta didik mengidentifikasi karakteristik fisik dan non-fisik orang, menghargai perbedaan adat istiadat, serta kerja sama dalam keberagaman suku nusantara.",
      topics: ["Menghargai Keberagaman Rumah Adat", "Sikap Kerja Sama Antarumat Beragama", "Melestarikan Permainan Tradisional Indonesia"]
    },
    {
      element: "Negara Kesatuan Republik Indonesia",
      cp: "Peserta didik mengenal wilayah kabupaten/kota, batas wilayah tempat tinggal, serta mengenali bagian NKRI dan sikap cinta tanah air.",
      topics: ["Struktur Organisasi Kelurahan dan Kecamatan", "Mengenal Batas Wilayah Kabupaten", "Sikap Cinta Tanah Air Menghormati Pahlawan"]
    }
  ],
  "Pendidikan Pancasila - Fase C": [
    {
      element: "Pancasila",
      cp: "Peserta didik memahami kedudukan Pancasila sebagai dasar negara, pandangan hidup bangsa, ideologi negara, dan menerapkannya dalam kehidupan sehari-hari secara konsisten, serta bangga terhadap keutuhan tanah air.",
      topics: ["Pancasila Sebagai Dasar Negara", "Peran Panitia Sembilan Perumus Pancasila", "Mengamalkan Sila-Sila dalam Kebijakan Kelas"]
    },
    {
      element: "Undang-Undang Dasar Negara Republik Indonesia Tahun 1945",
      cp: "Peserta didik menyajikan hasil identifikasi aturan di sekolah, rumah, masyarakat, menerapkan norma susila, kesopanan, hukum, serta memahami pelaksanaan hak, kewajiban, dan tanggung jawab.",
      topics: ["Pengejawantahan Norma Kesopanan di Sekolah", "Sanksi Pelanggaran Norma Hukum", "Keseimbangan Pelaksanaan Hak dan Kewajiban Warga Negara"]
    },
    {
      element: "Bhinneka Tunggal Ika",
      cp: "Peserta didik mengidentifikasi keragaman suku, bahasa daerah, pakaian adat, kesenian daerah, ras, agama di tingkat nasional dan melestarikannya secara bangga.",
      topics: ["Upaya Pelestarian Kebudayaan Nasional", "Menghargai Keberagaman Agama Nasional", "Mencegah Sikap Diskriminasi Rasial"]
    },
    {
      element: "Negara Kesatuan Republik Indonesia",
      cp: "Peserta didik mengidentifikasi batas-batas kedaulatan NKRI, menjelaskan peran tokoh perjuangan kemerdekaan, menjaga keutuhan NKRI, and berpartisipasi mewujudkan persatuan nasional.",
      topics: ["Tokoh Perjuangan Proklamasi Kemerdekaan", "Batas Astronomis dan Geografis NKRI", "Sikap Bela Negara Mempertahankan Persatuan"]
    }
  ],

  // === IPAS ===
  "IPAS - Fase A": [
    {
      element: "Pemahaman IPAS",
      cp: "Peserta didik mengidentifikasi anggota tubuh manusia, panca indra besertakan fungsinya, cara merawat kesehatan, serta mengenal hewan dan tumbuhan di sekitar lingkungan rumah.",
      topics: ["Mengidentifikasi Lima Panca Indra", "Merawat Kebersihan Gigi dan Rambut", "Mengenali Hewan Jinak dan Liar", "Bagian Daun dan Bunga Tumbuhan Sekitar"]
    },
    {
      element: "Keterampilan Proses",
      cp: "Peserta didik melakukan pengamatan mandiri terhadap gejala cuaca harian dan perubahan benda cair maupun padat di sekitar mereka.",
      topics: ["Mempraktekkan Siklus Es Batu Cair", "Mengukur Suhu Hangat dan Dingin", "Melihat Gejala Cuaca Hujan Cerah Mendung"]
    }
  ],
  "IPAS - Fase B": [
    {
      element: "Pemahaman IPAS (Sains)",
      cp: "Peserta didik mengidentifikasi bagian tubuh tumbuhan, proses fotosintesis, siklus hidup makhluk hidup, wujud zat dan perubahannya, bentuk gaya (gesek, magnet, gravitasi) dan energi dalam kehidupan sehari-hari.",
      topics: ["Fotosintesis Dapur Pembuatan Makanan", "Siklus Hidup Kupu-Kupu dan Katak", "Wujud Zat Padat Cair Gas dan Menguap", "Hubungan Gaya Tarik dan Dorong terhadap Benda"]
    },
    {
      element: "Pemahaman IPAS (Sosial)",
      cp: "Peserta didik mengidentifikasi ragam bentang alam, letak kabupaten/provinsi tempat tinggal melalui peta, peta tematik, kegiatan ekonomi masyarakat, dan interaksi sosial harian.",
      topics: ["Morfologi Wilayah Pantai dan Gunung", "Sektor Kegiatan Ekonomi Jasa dan Dagang", "Mengenal Sejarah Kerajaan Hindu Budha", "Sikap Toleransi Interaksi Sosial Beradab"]
    },
    {
      element: "Keterampilan Proses",
      cp: "Peserta didik merencanakan dan melaksanakan penyelidikan ilmiah kecil, merekam pengamatan secara sistematis, serta menarik kesimpulan fisis dasar.",
      topics: ["Mengamati Pertumbuhan Kacang Hijau", "Menyusun Grafik Pertumbuhan Batang Tumbuhan", "Merancang Eksperimen Sifat Sifat Cahaya"]
    }
  ],
  "IPAS - Fase C": [
    {
      element: "Pemahaman IPAS (Sains)",
      cp: "Peserta didik mengidentifikasi sistem organ tubuh manusia (pernapasan, pencernaan, peredaran darah, gerak), rantai makanan dan jaring ekologi, siklus air secara global, listrik dasar dan magnet, serta konversi/kekekalan energi.",
      topics: ["Sistem Organ Pernapasan Paru-Paru", "Rantai Makanan Produsen Konsumen Pengurai", "Tahapan Siklus Hidup Air Evaporasi", "Konsep Menyalakan Lampu Sirkuit Listrik"]
    },
    {
      element: "Pemahaman IPAS (Sosial)",
      cp: "Peserta didik memahami kondisi geografis Indonesia sebagai negara kepulauan, negara maritim/agraris, sejarah perjuangan bangsa di berbagai kerajaan, masa kolonial, proklamasi kemerdekaan, keragaman ekonomi.",
      topics: ["Karakteristik Maritim Kehidupan Indonesia", "Penjajahan Kolonial Belanda dan Jepang", "Peristiwa Rengasdengklok Proklamasi Kemerdekaan", "Kegiatan Impor Ekspor Indonesia Modern"]
    },
    {
      element: "Keterampilan Proses",
      cp: "Peserta didik merancang eksperimen ilmiah mandiri, mencatat data kuantitatif menggunakan alat bantu ukur relevan, mengomunikasikan kesimpulan ilmiah dalam bentuk laporan tertulis.",
      topics: ["Langkah Pengukuran Derajat Termometer", "Menguji Kekuatan Magnet Sederhana", "Menulis Laporan Pengaruh Cahaya pada Tanaman"]
    }
  ],

  // === BAHASA INGGRIS ===
  "Bahasa Inggris - Fase A": [
    {
      element: "Listening & Speaking (Menyimak & Berbicara)",
      cp: "Students use simple English to interact in social and school environments with formulaic language (greetings, introduced themselves, requests, thank you).",
      topics: ["Greetings and Saying Goodbye", "Introducing My Name and Age", "Responding to Simple Classroom Rules"]
    },
    {
      element: "Reading & Viewing (Membaca & Memirsa)",
      cp: "Students understand the main ideas of simple illustrated texts containing common words and matching them with pictures.",
      topics: ["Matching Animal Pictures in English", "Identifying Colors of Objects", "Reading Simple Picture Books"]
    },
    {
      element: "Writing & Presenting (Menulis & Mempresentasikan)",
      cp: "Students write basic english alphabets, trace vocabulary, and label objects using accurate letter formations.",
      topics: ["Tracing English Alphabet and Letters", "Labeling Classroom Stationery", "Writing My Favorite Food Name"]
    }
  ],
  "Bahasa Inggris - Fase B": [
    {
      element: "Listening & Speaking (Menyimak & Berbicara)",
      cp: "Students interact in simple english using repetitive structured phrases, expressing likes/dislikes, locations of objects, and asking simple prices.",
      topics: ["Expressing Favorite Foods and Drinks", "Asking 'Where is My Pencil?'", "Shopping Game Asking for Prices"]
    },
    {
      element: "Reading & Viewing (Membaca & Memirsa)",
      cp: "Students read short paragraph texts smoothly with good pronunciation, understanding specific basic key facts of the stories.",
      topics: ["Reading Story about Outdoor Pets", "Answering What Who Where on English text", "Identifying Verbs of Daily Activities"]
    },
    {
      element: "Writing & Presenting (Menulis & Mempresentasikan)",
      cp: "Students write short descriptions or simple messages with accurate capitalization, spelling, and basic punctuation.",
      topics: ["Writing Short Sentences about My Family", "Completing Pronouns He She They in senteces", "Using Capitals on Names and Days"]
    }
  ],
  "Bahasa Inggris - Fase C": [
    {
      element: "Listening & Speaking (Menyimak & Berbicara)",
      cp: "Students participate actively in simple dialogues, expressing future plans, describing past experiences, and asking for or giving help politely.",
      topics: ["Talking about Last Weekend Holiday", "Using 'Can You Help Me?' Polite Phrases", "Discussing Future Hobby Plans"]
    },
    {
      element: "Reading & Viewing (Membaca & Memirsa)",
      cp: "Students analyze main ideas, supporting details, and predict outcomes in fiction or informative paragraphs.",
      topics: ["Analyzing Main Ideas on English Posters", "Predicting Story Ends in Tales", "Understanding Recipes or Step Guides"]
    },
    {
      element: "Writing & Presenting (Menulis & Mempresentasikan)",
      cp: "Students write multi-sentence descriptions, emails, letters, and create graphic organizers using varied vocabulary.",
      topics: ["Writing Simple Letter to a Friend", "Describing My School in Two Paragraphs", "Designing English Infographics and Vocabulary lists"]
    }
  ],

  // === PJOK ===
  "PJOK - Fase A": [
    {
      element: "Keterampilan Gerak",
      cp: "Peserta didik mempraktikkan keterampilan gerak dasar lokomotor (berjalan, berlari, melompat), non-lokomotor (menekuk, meliuk), dan manipulatif (melempar, menangkap bola besar).",
      topics: ["Teknik Berlari Lurus dan Berkelok", "Melompat Rintangan Rendah", "Melempar Bola Mengarah ke Keranjang"]
    },
    {
      element: "Pengetahuan Gerak",
      cp: "Peserta didik mengidentifikasi konsep bagian tubuh yang bergerak, arah gerak harian, serta prinsip keseimbangan statis.",
      topics: ["Arah Gerak Ke Atas dan Ke Samping", "Menjaga Keseimbangan Berdiri Satu Kaki", "Mengidentifikasi Kelompok Otot Gerak Lokomotor"]
    },
    {
      element: "Pemanfaatan Aktivitas",
      cp: "Peserta didik melakukan permainan tradisional untuk menjaga kebugaran jasmani ringan dan kebersihan pakaian.",
      topics: ["Permainan Tradisional Gobak Sodor", "Kebersihan Pakaian dan Mandi Setelah Olahraga", "Makanan Sehat Menunjang Energi Tubuh"]
    }
  ],
  "PJOK - Fase B": [
    {
      element: "Keterampilan Gerak",
      cp: "Peserta didik mempraktikkan variasi pola gerak lakomotor, non-lokomotor, manipulatif pada olahraga beregu kaki (kasti, sepak bola dasar) dan senam lantai.",
      topics: ["Menggiring Bola Sepak Bola", "Memukul Bola Kasti dengan Pemukul Kayu", "Sikap Lilin Senam Lantai"]
    },
    {
      element: "Pengetahuan Gerak",
      cp: "Peserta didik memahami cara melakukan teknik menendang, melempar, menangkap, berayun, berguling secara aman.",
      topics: ["Teknik Melempar Kasti Melambung", "Analisis Sikap Awal Berguling Depan Matras", "Taktik Bertahan dalam Gobak Sodor"]
    },
    {
      element: "Pemanfaatan Aktivitas",
      cp: "Peserta didik mempraktikkan bentuk latihan kekuatan dan kelenturan, serta menghitung denyut jantung sebelum dan sesudah latihan harian.",
      topics: ["Latihan Plank dan Push Up Sederhana", "Menghitung Detak Jantung Per Menit", "Manfaat Melakukan Pemanasan Otot"]
    }
  ],
  "PJOK - Fase C": [
    {
      element: "Keterampilan Gerak",
      cp: "Peserta didik mempraktikkan kombinasi gerak dasar lokomotor, non-lokomotor, manipulatif pada permainan bola besar (basket, voli) dan atletik (dari estafet).",
      topics: ["Kombinasi Layup Shoot Bola Basket", "Set Up Service Bawah Voli", "Keterampilan Berlari Serah Estafet Tongkat"]
    },
    {
      element: "Pengetahuan Gerak",
      cp: "Peserta didik menganalisis taktik menyerang serta bertahan sederhana pada permainan tradisional/olahraga pilihan secara aman.",
      topics: ["Taktik Menyerang Pola 2 Lawan 1 Basket", "Menganalisis Titik Tolak Lompat Jauh", "Aturan Resmi Pertandingan Bola Voli"]
    },
    {
      element: "Pemanfaatan Aktivitas",
      cp: "Peserta didik menganalisis dan mempraktikkan latihan kebugaran jasmani intensitas sedang (interval training), merawat kesehatan reproduksi remaja.",
      topics: ["Merancang Jadwal Mingguan Interval Training", "Merawat Kebersihan Organ Reproduksi Remaja", "Pemberian P3K pada Luka Gores Memar"]
    }
  ],

  // === SENI RUPA ===
  "Seni Rupa - Fase A": [
    {
      element: "Mengalami",
      cp: "Peserta didik mengidentifikasi unsur rupa (garis, bentuk tunggal, warna primer merah kuning biru) dari benda-benda alam di sekitarnya.",
      topics: ["Mengenal Tiga Warna Primer", "Menemukan Garis Lurus dan Lengkung di Alam", "Mengelompokkan Bentuk Lingkaran Kotak"]
    },
    {
      element: "Menciptakan",
      cp: "Peserta didik membuat karya 2 dimensi menggunakan media pewarna kering (pensil warna, krayon) dengan teknik menggunting dan menempel kertas origami.",
      topics: ["Karya Mewarnai Pemandangan Asri", "Kolase Menempel Origami Satwa", "Menggambar Ekspresi Wajah Riang"]
    },
    {
      element: "Merefleksikan",
      cp: "Peserta didik menjelaskan alasan menyukai bagian karya gambarnya sendiri atau karya temannya menggunakan bahasa lisan yang santun.",
      topics: ["Mengapresiasi Gambar Teman dengan Pujian Sopan", "Menceritakan Arti Gambar Buatan Sendiri"]
    }
  ],
  "Seni Rupa - Fase B": [
    {
      element: "Mengalami",
      cp: "Peserta didik mengidentifikasi warna sekunder, tekstur (kasar, halus, licin), keseimbangan simetris pada objek-objek buatan manusia dan alam sekitar.",
      topics: ["Murnikan Warna Sekunder Hijau Jingga Ungu", "Mencerna Tekstur Kasar Halus Melalui Sentuhan", "Menganalisis Keseimbangan Simetris Dua Sisi Sempurna"]
    },
    {
      element: "Menciptakan",
      cp: "Peserta didik merancang dan membuat karya anyaman sederhana kertas, gambar bermotif batik flora, atau relief kecil menggunakan tanah liat/plastisin secara terampill.",
      topics: ["Membuat Anyaman Geometris Kertas", "Menggambar Dekoratif Ragam Hias Batik Flora", "Membentuk Relief Plastisin Bertema Hewan Laut"]
    },
    {
      element: "Merefleksikan",
      cp: "Peserta didik mengapresiasi dan membandingkan unsur keindahan visual dari berbagai karya seni rupa tradisional nusantara secara tertata.",
      topics: ["Mengapresiasi Keindahan Tenun Ikat Indonesia", "Membuat Ulasan Singkat Keindahan Gambar Lukisan"]
    }
  ],
  "Seni Rupa - Fase C": [
    {
      element: "Mengalami",
      cp: "Peserta didik mengidentifikasi komposisi warna tersier, proporsi antropometri wajah manusia, serta perspektif gambar linear satu titik hilang pada bidang gambar vertikal.",
      topics: ["Perspektif Satu Titik Hilang Jalan Raya", "Proporsi Wajah Menggambar Sketsa Manusia", "Mengenal Peran Intensitas Cahaya Gelap Terang"]
    },
    {
      element: "Menciptakan",
      cp: "Peserta didik merancang dan membuat produk seni dekoratif kriya (misal keramik hias, maket rumah tradisional) secara mandiri memanfaatkan barang bekas lingkungan sekitar.",
      topics: ["Merancang Kaleng Celengan Hias Unik", "Membuat Maket Rumah Adat dari Dus Bekas", "Merajut Kain Aksesoris Gantungan Kunci"]
    },
    {
      element: "Merefleksikan",
      cp: "Peserta didik menulis ulasan apresiatif kritis sederhana mengenai teknik penggambaran motif tradisional khas ragam budaya daerah di Indonesia.",
      topics: ["Menganalisis Makna Ornamen Ukiran Kayu Toraja", "Menulis Esai Kritik Seni Rupa Aliran Realis"]
    }
  ],

  // === SENI TARI ===
  "Seni Tari - Fase A": [
    {
      element: "Mengalami",
      cp: "Peserta didik memperagakan kombinasi gerak anggota tubuh (kepala, tangan, kaki) menirukan gerakan flora fauna di sawah atau hembusan angin sepoi-sepoi.",
      topics: ["Gerakan Meniru Kupu-Kupu Terbang", "Menirukan Pohon Tertiup Angin Topan", "Menirukan Gerakan Petani Menanam Padi"]
    },
    {
      element: "Menciptakan",
      cp: "Peserta didik menyusun gerak tari sederhana berdurasi pendek berdasarkan tempo ketukan musik pengiring yang riang gembira.",
      topics: ["Menyusun Urutan Tari Riang 30 Detik", "Menciptakan Tepukan Irama Mengiringi Langkah Tari", "Tarian Kelompok Kecil Saling Meniru Gerak"]
    }
  ],
  "Seni Tari - Fase B": [
    {
      element: "Mengalami",
      cp: "Peserta didik memperagakan variasi koordinasi gerak tari tradisional daerah asal dengan menerapkan konsep ruang, tingkat kelenturan tubuh, dan keselarasan wiraga.",
      topics: ["Koordinasi Langkah Silang Kaki Tari", "Gerak Lincah Selendang Penari Tradisional", "Mematuhi Batasan Ruang Gerak Pentas"]
    },
    {
      element: "Menciptakan",
      cp: "Peserta didik merangkai jalinan gerakan tari bertema permainan anak nusantara secara beregu sesuai pola lantai diagonal maupun lingkaran yang bervariasi.",
      topics: ["Merancang Pola Lantai Lingkaran Tarian Beregu", "Tari Kreatif Bertema Permainan Jamuran", "Menggabungkan Properti Caping dalam Gerakan"]
    }
  ],
  "Seni Tari - Fase C": [
    {
      element: "Mengalami",
      cp: "Peserta didik memperagakan kombinasi tingkat kerumitan gerak tari daerah nusantara dengan memperhatikan keselarasan irama tempo (wirama), wiraga, dan wirasa.",
      topics: ["Keselarasan Ketukan Tari dengan Gendang", "Menghayati Karakter Tegas Tarian Kepahlawanan", "Kombinasi Gerak Tari Saman Tangan Cepat"]
    },
    {
      element: "Menciptakan",
      cp: "Peserta didik memproduksi pagelaran drama tari kelompok kecil bertema heroisme pahlawan nasional, mengombinasikan tata rias dan properti tari yang relevan.",
      topics: ["Uji Peran Teatrikal Drama Tari Pahlawan", "Menyusun Konsep Tata Rias Kostum Tari Daerah", "Mengembangkan Kreasi Gerak Tari Kontemporer Nasional"]
    }
  ],

  // === SENI MUSIK ===
  "Seni Musik - Fase A": [
    {
      element: "Mengalami",
      cp: "Peserta didik mengidentifikasi tinggi-rendah nada (pitch), cepat-lambat tempo secara auditori, serta menirukan decak suara alam harian seperti kicau burung atau tetes air hujan.",
      topics: ["Membedakan Suara Tinggi Melengking dan Berat Bass", "Menirukan Ketukan Detik Jam Dinding", "Bernyanyi Ekspresif Lagu Pelangi-Pelangi"]
    },
    {
      element: "Menciptakan",
      cp: "Peserta didik membuat pola ritme sederhana menggunakan permainan tepuk tangan, hentakan kaki, atau alat perkusi sederhana buatan sendiri (botol pasir, kaleng).",
      topics: ["Ketukan Berirama Ganda Melalui Tepukan", "Membuat Perkusi Botol Pasir Unik", "Mengiringi Lagu Potong Bebek Angsa dengan Tebakan Nada"]
    }
  ],
  "Seni Musik - Fase B": [
    {
      element: "Mengalami",
      cp: "Peserta didik mengidentifikasi birama (2/4, 3/4, 4/4), membedakan kualitas timbre alat musik gesek, tiup, pukul khas nusantara harian.",
      topics: ["Mengidentifikasi Ketukan Birama Tiga Per Empat", "Mengenal Perbedaan Suara Seruling dan Angklung", "Membaca Notasi Angka Solmisasi Sederhana"]
    },
    {
      element: "Menciptakan",
      cp: "Peserta didik menyanyikan kumpulan melodi pendek menggunakan alat tiup dasar (melodika/rekorder) dengan teknik pernapasan perut aman.",
      topics: ["Meniup Melodika Notasi Lagu Ibu Kita Kartini", "Teknik Pernapasan Perut Saat Bernyanyi Paduan", "Membuat Aransemen Ketukan Alternatif"]
    }
  ],
  "Seni Musik - Fase C": [
    {
      element: "Mengalami",
      cp: "Peserta didik mengidentifikasi tangga nada diatonis mayor dan minor, serta membaca partitur not angka sederhana dengan lancar dalam paduan vokal.",
      topics: ["Membedakan Lagu Ceria Mayor dan Sedih Minor", "Membaca Simbol Istirahat Berhenti Bernyanyi", "Menganalisis Nada Dasar Do=C pada Partitur"]
    },
    {
      element: "Menciptakan",
      cp: "Peserta didik mengaransemen paduan suara vokal grup sederhana (2 suara) untuk menyanyikan lagu daerah nusantara diiringi harmonika/gitar.",
      topics: ["Aransemen Suara Alto dan Sopran Lagu Apuse", "Menyanyikan Kanon Kelompok Bersahut-Sahutan", "Menggabungkan Iringan Pianika dalam Lagu Nasional"]
    }
  ],

  // === PENDIDIKAN AGAMA ISLAM ===
  "Pendidikan Agama Islam - Fase A": [
    {
      element: "Al-Qur'an dan Hadis",
      cp: "Peserta didik mengenal huruf hijaiyah bersambung, melafalkan Surah Al-Fatihah, Al-Ikhlas, Al-Falaq, An-Nas dengan tartil dan benar.",
      topics: ["Mengenal Huruf Hijaiyah Berharakat", "Membaca Surah Al-Ikhlas Tartil", "Penerapan Hadis Kebersihan Iman"]
    },
    {
      element: "Akidah",
      cp: "Peserta didik mengenal Rukun Iman (Iman kepada Allah, Malaikat, Kitab, Rasul, Hari Kiamat, Qada Qadar) serta memahami Asmaul Husna Al-Rahman Al-Rahim.",
      topics: ["Makna Asmaul Husna Ar-Rahman Ar-Rahim", "Mengimani Sifat Allah Yang Maha Pencipta", "Mengenal Nama Sepuluh Malaikat Allah"]
    },
    {
      element: "Akhlak",
      cp: "Peserta didik membiasakan perilaku terpuji, bersikap sopan kepada orang tua, guru, menyayangi binatang, tumbuhan di lingkungan sekitar.",
      topics: ["Adab Berbicara dengan Orang Tua", "Berterima Kasih dan Minta Maaf", "Akhlak Menjaga Tanaman Kelestarian Lingkungan"]
    },
    {
      element: "Fikih",
      cp: "Peserta didik mengenal tata cara bersuci (wudu, tayamum) secara tertib, melafalkan azan dan ikamah, serta gerakan salat berjamaah.",
      topics: ["Rukun dan Cara Berwudu Sempurna", "Melafalkan Bacaan Lafal Azan", "Mengenali Gerakan Salat Lima Waktu"]
    }
  ],
  "Pendidikan Agama Islam - Fase B": [
    {
      element: "Al-Qur'an dan Hadis",
      cp: "Peserta didik membaca Al-Qur'an dengan tajwid izhar, ikhfa, idgam, memahami Surah Al-Hujurat ayat 13 tentang perdamaian, serta hadis tentang keragaman.",
      topics: ["Membaca Izhar Bilaghunnah Tajwid", "Memahami Surah Al-Ma'un Tentang Sosial", "Hadis Kewajiban Menuntut Ilmu"]
    },
    {
      element: "Akidah",
      cp: "Peserta didik memahami sifat wajib Allah, mengenal kitab-kitab suci Allah, serta nabi dan rasul yang termasuk Ulul Azmi.",
      topics: ["Mengimani Kitab Taurat, Zabur, Injil, Al-Qur'an", "Kisah Ketabahan Nabi Ibrahim Ulul Azmi", "Sifat Wajid Wujud, Qidam, Baqa"]
    },
    {
      element: "Akhlak",
      cp: "Peserta didik mempraktikkan sikap rendah hati, jujur, amanah, serta menghindari sikap berdusta dan sombong.",
      topics: ["Pentingnya Amanah Menjaga Barang Titipan", "Sikap Rendah Hati (Tawadhu) di Sekolah", "Mencegah Perbuatan Sombong (Takabur)"]
    },
    {
      element: "Fikih",
      cp: "Peserta didik memahami rukun salat, syarat sah salat, membatalkan salat, serta melafalkan zikir dan doa setelah salat.",
      topics: ["Rukun-Rukun Salat Berjumlah Tujuh Belas", "Syarat Sah Salat Menutup Aurat", "Zikir Tasbih, Tahmid, Takbir"]
    }
  ],
  "Pendidikan Agama Islam - Fase C": [
    {
      element: "Al-Qur'an dan Hadis",
      cp: "Peserta didik membaca dan menghafal Surah Al-Qadr, Al-Alaq, menganalisis hukum tajwid mad, membaca hadis menyayangi sesama manusia.",
      topics: ["Hukum Mad Thabii dan Far'i", "Tafsir Surah Al-Qadr Malam Kemuliaan", "Hadis Larangan Berbuat Zalim Sesama"]
    },
    {
      element: "Akidah",
      cp: "Peserta didik memahami iman kepada Hari Akhir (Kiamat Sugra dan Kubra), nama-nama lain hari kiamat, serta hikmah mengimani qada dan qadar.",
      topics: ["Tanda-Tanda Kiamat Sugra dan Kubra", "Yauumul Mizan dan Yaumul Mahsyar", "Hikmah Qada Qadar Berpikir Positif"]
    },
    {
      element: "Akhlak",
      cp: "Peserta didik membiasakan akhlak mulia kepedulian sosial, berbakti kepada orang tua (birrul walidain), serta cinta tanah air.",
      topics: ["Berbakti Sepenuh Hati Kepada Orang Tua", "Sifat Kepedulian Sosial Membantu Kaum Dhuafa", "Cinta Tanah Air Adalah Sebagian dari Iman"]
    },
    {
      element: "Fikih",
      cp: "Peserta didik menganalisis ketentuan zakat fitrah, zakat mal, puasa Ramadan, serta puasa sunah harian secara fikih.",
      topics: ["Ketentuan Pelaksanaan Zakat Fitrah", "Ketentuan Syarat Puasa Ramadan wajib", "Perjalanan Ibadah Haji dan Kurban"]
    }
  ],

  // === PENDIDIKAN AGAMA KRISTEN ===
  "Pendidikan Agama Kristen - Fase A": [
    {
      element: "Allah Pencipta",
      cp: "Peserta didik memuji kebesaran Allah yang menciptakan dirinya unik, menciptakan alam semesta, memelihara hewan dan tumbuhan.",
      topics: ["Allah Menciptakan Mataku Sempurna", "Taman Eden Ciptaan Allah Semesta", "Allah Memelihara Bunga Bakung di Ladang"]
    },
    {
      element: "Akhlak Hidup Kristen",
      cp: "Peserta didik membiasakan mengasihi keluarga, menghormati ayah ibu, bersikap ramah menolong teman di sekolah dasar.",
      topics: ["Melayani Ayah dan Ibu di Rumah", "Mengasihi Kakak dan Adik", "Mengucapkan Terima Kasih Atas Bantuan Teman"]
    }
  ],
  "Pendidikan Agama Kristen - Fase B": [
    {
      element: "Allah Pemelihara",
      cp: "Peserta didik memahami pemeliharaan Allah dalam kehidupan keluarga, mengatasi kesulitan, bersyukur atas keragaman bangsa.",
      topics: ["Nuh dan Bahtera Penyelamatan Allah", "Yusuf yang Mengampuni Saudara-saudaranya", "Allah Memelihara Bangsa Indonesia dalam Damai"]
    },
    {
      element: "Akhlak Hidup Kristen",
      cp: "Peserta didik mempraktikkan sikap disiplin belajar, jujur tidak menyontek, menjaga kerukunan antarsuku di sekolah.",
      topics: ["Kejujuran dalam Ulangan Sekolah", "Disiplin Waktu Belajar Ibadah", "Berteman dengan Semua Suku Bangsa"]
    }
  ],
  "Pendidikan Agama Kristen - Fase C": [
    {
      element: "Allah Penyelamat",
      cp: "Peserta didik memahami karya keselamatan Allah melalui Yesus Kristus, kematian dan kebangkitan Yesus, keselamatan hidup kekal.",
      topics: ["Yesus Menyembuhkan Orang Buta", "Kematian Yesus di Bukit Golgota", "Makna Kebangkitan Paskah Bagi Kita"]
    },
    {
      element: "Kemasyarakatan",
      cp: "Peserta didik menunjukkan tanggung jawab melestarikan kelestarian alam, melayani masyarakat, menyebarkan keadilan damai.",
      topics: ["Menjaga Kelestarian Hutan Air Dunia", "Sikap Adil Tidak Membeda-bedakan Teman", "Melayani Gereja dan Lingkungan Sekitar"]
    }
  ],

  // === PENDIDIKAN AGAMA KATOLIK ===
  "Pendidikan Agama Katolik - Fase A": [
    {
      element: "Pribadi Peserta Didik",
      cp: "Peserta didik mengenal dirinya sebagai pribadi yang dicintai Allah, mengenal anggota tubuhnya sebagai karunia Allah yang luhur, serta mengenal anggota keluarga dan teman-teman dekat.",
      topics: ["Aku Diri yang Unik Dicintai", "Merawat Anggota Tubuhku Mandiri", "Keluargaku yang Penuh Kasih Sayang", "Teman-Teman Sahabat di Sekitar Kelas"]
    },
    {
      element: "Yesus Kristus",
      cp: "Peserta didik mengenal kisah kelahiran Yesus, kisah masa kanak-kanak Yesus, serta meneladani kasih-Nya bagi orang miskin dan lemah.",
      topics: ["Misteri Kelahiran Yesus di Betlehem", "Keluarga Kudus Nazaret Panutan", "Yesus Menyayangi Anak-Anak Kecil"]
    }
  ],
  "Pendidikan Agama Katolik - Fase B": [
    {
      element: "Pribadi Peserta Didik",
      cp: "Peserta didik memahami keunikan dirinya sebagai citra Allah yang mulia, menyadari kelebihan dan keterbatasan diri, serta menghormati kesederhanaan sesama.",
      topics: ["Akulah Citra Hebat Allah", "Mengembangkan Kemampuanku Dengan Bersyukur", "Saling Menolong di Lingkungan Paroki"]
    },
    {
      element: "Gereja",
      cp: "Peserta didik memahami makna persekutuan murid Kristus, mengenali sakramen baptis, sakramen ekaristi, dan sakramen tobat sebagai karya rahmat.",
      topics: ["Rahmat Pembaptisan Menjadi Anak Allah", "Perjamuan Ekaristi Pemecah Roti Kudus", "Kerendahan Hati Mengaku Dosa Sakramen Tobat"]
    }
  ],
  "Pendidikan Agama Katolik - Fase C": [
    {
      element: "Kemasyarakatan",
      cp: "Peserta didik memahami jati diri perempuan dan laki-laki yang saling melengkapi, menyadari perannya dalam melestarikan ekologi alam, mewujudkan keadilan sosial.",
      topics: ["Perempuan dan Laki-laki Setara Sejajar", "Menjaga Ibu Bumi dari Kerusakan Sampah", "Mewujudkan Keadilan bagi Kelompok Rentan"]
    },
    {
      element: "Dialog Kemajemukan",
      cp: "Peserta didik menghargai perbedaan agama, membangun kerukunan antarumat beragama, berpartisipasi damai di Indonesia.",
      topics: ["Membangun Dialog Persaudaraan Iman Mandiri", "Dokumen Persaudaraan Manusia Abu Dhabi", "Sikap Toleran di Tengah Kemajemukan Nasional"]
    }
  ],

  // === PENDIDIKAN AGAMA HINDU ===
  "Pendidikan Agama Hindu - Fase A": [
    {
      element: "Kitab Suci Yadnya",
      cp: "Peserta didik mengenal ajaran Weda sebagai kitab suci umat Hindu, memahami arti bait mantra Tri Sandhya harian.",
      topics: ["Weda Sebagai Kitab Suci Utama", "Melafalkan Bait Pertama Tri Sandhya", "Mengenal Tri Kaya Parisudha Berbuat Baik"]
    },
    {
      element: "Karakter Etika",
      cp: "Peserta didik menerapkan ajaran kasih sayang makhluk hidup di sekitar rumah dan patuh pada guru rupaka (orang tua).",
      topics: ["Menyayangi Binatang Peliharaan Rumah", "Bakti Kepada Guru Rupaka di Rumah", "Menghormati Guru Pengajar di Sekolah"]
    }
  ],
  "Pendidikan Agama Hindu - Fase B": [
    {
      element: "Tatwa dan Filsafat",
      cp: "Peserta didik memahami konsep Panca Sradha sebagai lima pilar keyakinan Hindu, mengenal Sang Hyang Widhi Wasa.",
      topics: ["Membahas Panca Sradha Lima Aspek", "Atman Sebagai Sumber Hidup Jiwa", "Hukum Karma Phala Sebab Akibat"]
    },
    {
      element: "Yadnya Praktis",
      cp: "Peserta didik mempraktikkan tata cara sembahyang kramaning sembah, merangkai sarana upakara canang sari sederhana.",
      topics: ["Tata Cara Kramaning Sembah Lima Tahap", "Makna Warna Canang Sari Wadah Canang", "Jenis Yadnya pada Hari Suci Saraswati"]
    }
  ],
  "Pendidikan Agama Hindu - Fase C": [
    {
      element: "Ethika Tri Hita Karana",
      cp: "Peserta didik menganalisis dan menerapkan ajaran kehidupan harmonis Tri Hita Karana (Parahyangan, Pawongan, Palemahan).",
      topics: ["Parahyangan Hubungan Suci dengan Widhi", "Pawongan Keharmonisan Pertemanan Antarmurid", "Palemahan Bersih Menjaga Pura Lingkungan"]
    },
    {
      element: "Nusantara dan Sejarah",
      cp: "Peserta didik menjelaskan kejayaan peradaban Hindu nusantara, peninggalan candi-candi, heroisme tokoh sejarah ksatria.",
      topics: ["Kejayaan Majapahit Mpu Prapanca", "Situs Suci Candi Prambanan Keindahan", "Tokoh Kepemimpinan Gajah Mada Bersatu"]
    }
  ],

  // === PENDIDIKAN AGAMA BUDDHA ===
  "Pendidikan Agama Buddha - Fase A": [
    {
      element: "Sejarah Buddha",
      cp: "Peserta didik mengenal kisah kelahiran Pangeran Siddharta, kemegahan istana Kapilawastu, nama ayah ibu Pangeran.",
      topics: ["Melahirkan Sang Juru Selamat Siddharta", "Kasih Sayang Ratu Mahamaya Luhur", "Siddharta Kecil Belajar dengan Cerdas"]
    },
    {
      element: "Etika Pancasila",
      cp: "Peserta didik mematuhi pancasila buddhis dasar (pantangan membunuh, mencuri, berbohong, menyakiti) dalam kehidupan ramah.",
      topics: ["Pantangan Menyakiti Serangga Kecil", "Kejujuran Sifat Pancasila Buddha", "Adab Berkunjung ke Vihara Sembahyang"]
    }
  ],
  "Pendidikan Agama Buddha - Fase B": [
    {
      element: "Dharma Sastra",
      cp: "Peserta didik memahami ajaran hukum kesunyataan Empat Kebenaran Mulia (Ariya Sacca), menghargai kumpul biksu Sangha.",
      topics: ["Empat Kebenaran Mulia Jalan Tengah", "Sebab Duka Berasal dari Keinginan", "Menghormati Sangha Penjaga Ajaran Dharma"]
    },
    {
      element: "Meditasi Fokus",
      cp: "Peserta didik mempraktikkan duduk tenang meditasi pernapasan Anapanasati untuk konsentrasi belajar harian.",
      topics: ["Mempraktekkan Meditasi Duduk Anapanasati", "Menjaga Ketenangan Pikiran Sebelum Mengisi Soal", "Sikap Cinta Kasih Maitri Karuna"]
    }
  ],
  "Pendidikan Agama Buddha - Fase C": [
    {
      element: "Hukum Karma Reinkarnasi",
      cp: "Peserta didik menganalisis hukum sebab-akibat karma (Kamma), memahami roda reinkarnasi samsara, mencapai kedamaian nibbana.",
      topics: ["Hukum Karma Memandu Takdir Sehari-hari", "Upacara Hari Tri Suci Waisak Agung", "Arti Lambang Bunga Teratai Mekar Suci"]
    },
    {
      element: "Situs Kebudayaan",
      cp: "Peserta didik menjelaskan fakta kemegahan Candi Borobudur sebagai mandala Buddha terbesar di dunia, peradaban dinasti Syailendra.",
      topics: ["Sejarah Pembangunan Borobudur Abad Delapan", "Membaca Relief Kisah Jataka di Dinding Candi", "Wisata Religi Mendut dan Pawon"]
    }
  ],

  // === PENDIDIKAN AGAMA KHONGHUCU ===
  "Pendidikan Agama Khonghucu - Fase A": [
    {
      element: "Nabi Kongzi",
      cp: "Peserta didik mengenal Sang Nabi Kongzi sebagai utusan Tian, merayakan hari kelahiran Nabi, menyayangi saudara keluarga.",
      topics: ["Kelahiran Istimewa Nabi Kongzi", "Bakti Kepada Xiao Menyayangi Orang Tua", "Tanda Hormat Persembahan Altar Sederhana"]
    },
    {
      element: "Ibadah Ritual",
      cp: "Peserta didik mempraktikkan sikap hormat bersoja menggunakan telapak tangan rapat yang santun harian.",
      topics: ["Cara Melakukan Sembah Bersoja Benar", "Mengenali Sembahyang Hari Imlek Baru", "Nilai Kasih Cinta Kasih Teman"]
    }
  ],
  "Pendidikan Agama Khonghucu - Fase B": [
    {
      element: "Kitab Sishu",
      cp: "Peserta didik memahami ajaran klasik kitab suci Sishu, mendalami empat sifat mulia kemanusiaan (Ren, Yi, Li, Zhi).",
      topics: ["Kitab Suci Sishu Empat Kompilasi", "Sifat Ren Cinta Kasih Universal", "Sifat Li Kesusilaan Tata Krama Etika"]
    },
    {
      element: "Watak Sejati",
      cp: "Peserta didik mempraktikkan pengembangan watak sejati (Xing) yang bajik dari Tian dengan rajin belajar.",
      topics: ["Watak Sejati Xing Anugerah Suci Tian", "Pentingnya Belajar Menuntut Ilmu Kongbucu", "Menghindari Sifat Licik Xiaoren"]
    }
  ],
  "Pendidikan Agama Khonghucu - Fase C": [
    {
      element: "Etika Sosial Bakti",
      cp: "Peserta didik menganalisis ajaran bakti (Xiao) mendalam, menghargai arwah leluhur, melestarikan kuil kelenteng.",
      topics: ["Nilai Filosofi Bakti Xiao Anak Sholeh Kristen Buddha Islam Hindu", "Sembahyang Ceng Beng Doa Bersama Leluhur", "Struktur Bangunan Litang dan Kelenteng"]
    },
    {
      element: "Negara dan Kemasyarakatan",
      cp: "Peserta didik memahami konsep kerukunan nasional, mencintai persatuan NKRI, toleransi beragama di Indonesia.",
      topics: ["Bela Negara Konsep Kebajikan Junzi", "Toleransi Antaragama Menghargai Ritual lain", "Merayakan Cap Go Meh Persatuan Budaya"]
    }
  ]
};

// Map specific topic names to elements & cp
export function getTopicMetadata(subject: string, topicName: string, phaseParam?: string) {
  const currentPhase = phaseParam || "Fase B";
  const keyName = `${subject} - ${currentPhase}`;
  const curriculum = FALLBACK_CURRICULUMS[keyName] || FALLBACK_CURRICULUMS[`${subject} - Fase B`] || FALLBACK_CURRICULUMS["Matematika - Fase B"];
  
  const matched = curriculum.find(item => item.topics.includes(topicName));
  if (matched) {
    return { element: matched.element, cp: matched.cp };
  }
  
  return {
    element: "Penerapan Kompetensi",
    cp: `Peserta didik menguasai konsep dan pengaplikasian praktis materi pokok ${topicName} dalam kehidupan sehari-hari berdasarkan Kurikulum Merdeka ${currentPhase}.`
  };
}

export function generateFallbackKisiKisi(schoolInfo: any, subject: string, selectedTopics: string[], questionConfigs: any[]) {
  const rows: any[] = [];
  let numberIndex = 1;

  const currentPhase = ["Kelas 1", "Kelas 2"].includes(schoolInfo?.gradeClass) 
    ? "Fase A" 
    : ["Kelas 3", "Kelas 4"].includes(schoolInfo?.gradeClass) 
      ? "Fase B" 
      : "Fase C";

  // Create a randomized copy of selectedTopics to distribute topics and materials unpredictably
  const shuffledTopics = [...selectedTopics];
  for (let i = shuffledTopics.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffledTopics[i];
    shuffledTopics[i] = shuffledTopics[j];
    shuffledTopics[j] = temp;
  }

  // Indicator templates to dynamically rotate and avoid duplicate text
  const indicatorTemplates = {
    "Level 1": [
      (topic: string) => `Disajikan pertanyaan langsung tentang konsep dasar dan definisi dari ${topic}, siswa dapat menunjukkan contoh konkritnya secara tepat.`,
      (topic: string) => `Disajikan kutipan penjelasan singkat bertema ${topic}, siswa mampu mengidentifikasi komponen penyusun utamanya secara benar.`,
      (topic: string) => `Disajikan sekumpulan data ringkas terkait ${topic}, siswa dapat melengkapi pernyataan rumpang yang sesuai dengan lancar.`,
      (topic: string) => `Disajikan istilah teknis dasar mengenai ${topic}, siswa mampu menyebutkan fungsi dan kegunaannya secara cepat.`
    ],
    "Level 2": [
      (topic: string) => `Disajikan sebuah stimulus deskriptif sederhana kehidupan sehari-hari anak tentang ${topic}, siswa mampu mengimplementasikan penyelesaian yang akurat.`,
      (topic: string) => `Disajikan skenario aktivtas kerjasama kelompok bermateri ${topic}, siswa mampu menentukan langkah-langkah praktis penerapan yang sesuai.`,
      (topic: string) => `Disajikan tabel data teks sederhana atau daftar inventaris sekolah tentang ${topic}, siswa dapat mengklasifikasikan kategori berdasarkan sifatnya.`,
      (topic: string) => `Disajikan prosedur pelaksanaan aktivitas fisik atau harian yang melibatkan ${topic}, siswa mampu menguraikan tahapan kegiatan secara urut.`
    ],
    "Level 3": [
      (topic: string) => `Disajikan skenario pemecahan masalah (HOTS) terkait ${topic} di lingkungan sekolah dasar, siswa mampu menganalisis kesimpulan secara tepat.`,
      (topic: string) => `Disajikan permasalahan kompleks atau situasi rumpang tentang ${topic}, siswa mampu mengevaluasi tindakan paling bijak demi kerukunan bersama.`,
      (topic: string) => `Disajikan teks karya sastra anak, cuplikan puisi, atau dialog berseling yang memuat nilai ${topic}, siswa dapat menyimpulkan amanat tersirat mendalam.`,
      (topic: string) => `Disajikan deskripsi anomali atau kasus menantang terkait konsep ${topic}, siswa mampu merumuskan alternatif solusi yang logis dan kreatif.`
    ]
  };

  for (const config of questionConfigs) {
    const count = Number(config.count) || 0;
    const type = config.type || "Pilihan Ganda";
    const levelIndex = config.cognitiveLevel || "Level 2";
    const resolvedLevel = levelIndex.includes("Level 1") ? "Level 1" : levelIndex.includes("Level 3") ? "Level 3" : "Level 2";

    for (let i = 0; i < count; i++) {
      // Pick a topic randomly from our shuffled topic collection (recycling if we run out)
      const topic = shuffledTopics.length > 0 
        ? shuffledTopics[Math.floor(Math.random() * shuffledTopics.length)]
        : "Matematika";
      const meta = getTopicMetadata(subject, topic, currentPhase);

      const templates = indicatorTemplates[resolvedLevel];
      // Select template completely at random
      const randTemplateIdx = Math.floor(Math.random() * templates.length);
      const templateFn = templates[randTemplateIdx];
      const stimulus = templateFn(topic);

      let answerKeyDesc = "Jawaban singkat benar";
      if (type === "Pilihan Ganda") {
        const letters = ["A", "B", "C", "D"];
        const randIdx = Math.floor(Math.random() * 4);
        answerKeyDesc = letters[randIdx];
      } else if (type === "Uraian") {
        answerKeyDesc = "Penjelasan/uraian benar terkait " + topic;
      }

      rows.push({
        number: numberIndex,
        cp: meta.cp,
        element: meta.element,
        materi: topic,
        indicator: stimulus,
        cognitiveLevel: resolvedLevel + (resolvedLevel === "Level 3" ? " - Menganalisis (HOTS)" : resolvedLevel === "Level 2" ? " - Mengaplikasikan" : " - Memahami"),
        questionType: type,
        answerKey: answerKeyDesc
      });

      numberIndex++;
    }
  }

  return rows;
}

export function generateFallbackSoal(schoolInfo: any, subject: string, kisiKisi: any[]) {
  const questions: any[] = [];

  const currentPhase = ["Kelas 1", "Kelas 2"].includes(schoolInfo?.gradeClass) 
    ? "Fase A" 
    : ["Kelas 3", "Kelas 4"].includes(schoolInfo?.gradeClass) 
      ? "Fase B" 
      : "Fase C";

  const commonNames = {
    guru: ["Pak Bambang", "Ibu Sri", "Pak Hartono", "Ibu Ratih", "Pak Joko", "Ibu Shinta", "Ibu Melinda", "Pak Priyadi"],
    murid: ["Andi", "Budi", "Cici", "Dedi", "Evi", "Fandi", "Gita", "Hari", "Iwan", "Julia", "Rian", "Sari", "Dian", "Tono", "Wati", "Edo", "Lani", "Siti"],
    desa: ["Desa Sukamaju", "Desa Makmur", "Kota Harapan", "Desa Subur", "Desa Sari mulia", "Kecamatan Kenanga"],
    sekolah: ["SD Negeri Nusantara", "SD Merdeka", "SD Harapan Bangsa", "SD Bakti Luhur", "SD Pancasila", "SD Tunas Bangsa"]
  };

  for (const row of kisiKisi) {
    const num = row.number;
    const topic = row.materi;
    const type = row.questionType;
    const level = row.cognitiveLevel;

    // Names instantiated dynamically with a random offset so they vary on every generation run
    const nameOffset = Math.floor(Math.random() * 100);
    const nameA = commonNames.murid[(num + nameOffset) % commonNames.murid.length];
    const nameB = commonNames.murid[(num + 1 + nameOffset) % commonNames.murid.length];
    const nameC = commonNames.murid[(num + 2 + nameOffset) % commonNames.murid.length];
    const nameGuru = commonNames.guru[(num + nameOffset) % commonNames.guru.length];
    const desa = commonNames.desa[(num + nameOffset) % commonNames.desa.length];
    const sekolah = commonNames.sekolah[(num + nameOffset) % commonNames.sekolah.length];

    let sc = ""; // SVG Content
    let stim = ""; // Stimulus Text
    let qtext = ""; // Question Text
    let opts: string[] = [];
    let key = "a";
    let expl = "";

    const subjLower = (subject || "").toLowerCase();
    const topicLower = (topic || "").toLowerCase();

    // Subject-specific dynamic template routing
    if (subjLower.includes("matematika")) {
      // 1. Pecahan (Rotating 3 variations)
      if (topicLower.includes("pecahan")) {
        const variations = [
          {
            stim: `Saat berkunjung ke perkebunan melon buah segar di pinggiran ${desa}, Kakak membeli kue melon harum berbentuk lingkaran sempurna. Kakak memotong kue tersebut menjadi 4 bagian sama besar untuk dibagikan kepada ${nameA} dan ${nameB}.`,
            qtext: `${nameA} mendapatkan 2/4 bagian dari kue melon tersebut. Manakah di bawah ini pecahan yang senilai dengan kue yang diterima oleh ${nameA}?`,
            opts: ["A. 1/2", "B. 1/3", "C. 2/3", "D. 3/8"],
            key: "a",
            expl: "Pecahan 2/4 jika disederhanakan dengan membagi pembilang dan penyebut dengan angka 2 akan menghasilkan 1/2. Maka 2/4 senilai dengan 1/2.",
            sc: `<svg viewBox="0 0 120 120" style="max-width: 110px; display: block; margin: 8px auto;">
              <circle cx="60" cy="60" r="50" stroke="#334155" stroke-width="3" fill="none"/>
              <path d="M 60 10 A 50 50 0 0 1 110 60 A 50 50 0 0 1 60 110 L 60 60 Z" fill="#22c55e" stroke="#334155" stroke-width="2"/>
              <line x1="60" y1="10" x2="60" y2="110" stroke="#334155" stroke-width="2"/>
              <line x1="10" y1="60" x2="110" y2="60" stroke="#334155" stroke-width="2"/>
              <text x="60" y="5" font-family="sans-serif" font-size="8" text-anchor="middle" font-weight="bold">Kue Melon</text>
            </svg>`
          },
          {
            stim: `Kakak memiliki seutas pita merah sepanjang 3/6 meter untuk menghias tepi meja belajar adiknya agar tampak rapi.`,
            qtext: `Manakah pecahan paling sederhana di bawah ini yang nilainya setara dengan ukuran panjang pita milik Kakak?`,
            opts: ["A. 1/4", "B. 1/2", "C. 2/3", "D. 3/4"],
            key: "b",
            expl: "Pecahan 3/6 disederhanakan dengan membagi pembilang dan penyebut masing-masing dengan 3, didapatkan 1/2. Jadi pecahan yang senilai adalah 1/2."
          },
          {
            stim: `Ibu membeli pizza bundar untuk santapan sore. Pizza tersebut dipotong secara merata menjadi 8 bagian. Adik kemudian memakan sebanyak 4 bagian.`,
            qtext: `Berapakah sisa atau bagian pizza yang telah dimakan oleh Adik jika dinyatakan dalam bentuk pecahan paling sederhana?`,
            opts: ["A. 1/4", "B. 1/3", "C. 1/2", "D. 3/5"],
            key: "c",
            expl: "Bagian pizza yang dimakan adalah 4 dari total 8 potongan, dituliskan 4/8. Pecahan paling sederhana dari 4/8 adalah 1/2."
          }
        ];
        const v = variations[Math.floor(Math.random() * variations.length)];
        stim = v.stim; qtext = v.qtext; opts = v.opts; key = v.key; expl = v.expl; sc = v.sc || "";
      } 
      // 2. Bilangan Cacah / Nilai tempat (Rotating 3 variations)
      else if (topicLower.includes("cacah") || topicLower.includes("bilangan") || topicLower.includes("tempat") || topicLower.includes("angka")) {
        const variations = [
          {
            stim: `Di sebuah toko kelontong di dekat pasar rakyat ${desa}, ${nameA} membantu ibunya menghitung jumlah buah jeruk segar di dalam dua kotak kayu kecil. Setelah digabungkan, jumlah jeruk tersebut sebanyak 42 buah.`,
            qtext: `Pada angka bilangan 42, angka manakah yang secara tepat menempati nilai tempat puluhan?`,
            opts: ["A. Angka 4", "B. Angka 2", "C. Angka 0", "D. Angka 10"],
            key: "a",
            expl: "Dalam bilangan 42, angka 4 berada di tempat puluhan (bernilai 40) and angka 2 berada di tempat satuan (bernilai 2). Jadi puluhan ditempati oleh angka 4."
          },
          {
            stim: `Perpustakaan sekolah ${sekolah} menerima kiriman buku bacaan dongeng anak sebanyak 4.250 buah buku sumbangan alumni.`,
            qtext: `Manakah angka pada bilangan 4.250 yang menempati nilai tempat ratusan?`,
            opts: ["A. Angka 4", "B. Angka 2", "C. Angka 5", "D. Angka 0"],
            key: "b",
            expl: "Pada bilangan 4.250 nilai tempatnya adalah: 4 sebagai ribuan, 2 sebagai ratusan, 5 sebagai puluhan, dan 0 sebagai satuan. Jadi angka ratusan adalah 2."
          },
          {
            stim: `Panitia bakti sosial di ${desa} mengumpulkan paket beras bantuan berisikan 785 kantong untuk disalurkan ke keluarga kurang mampu.`,
            qtext: `Nilai angka 8 pada bilangan jumlah paket beras 785 tersebut menunjukkan nilai tempat apa?`,
            opts: ["A. Satuan", "B. Ratusan", "C. Puluhan", "D. Ribuan"],
            key: "c",
            expl: "Pada bilangan 785, angka 7 menempati ratusan (700), angka 8 menempati puluhan (80) dan angka 5 menempati satuan (5). Maka angka 8 bernilai puluhan."
          }
        ];
        const v = variations[Math.floor(Math.random() * variations.length)];
        stim = v.stim; qtext = v.qtext; opts = v.opts; key = v.key; expl = v.expl;
      }
      // 3. KPK, FPB, Perkalian, Pembagian
      else if (topicLower.includes("kpk") || topicLower.includes("fpb") || topicLower.includes("pembagian") || topicLower.includes("perkalian") || topicLower.includes("hitung")) {
        const variations = [
          {
            stim: `${nameA} dan ${nameB} yang rumahnya berdampingan saling membantu di tempat ibadah secara aktif. ${nameA} menyapu halaman masjid dan gereja setiap 4 hari sekali, sedangkan ${nameB} melakukannya setiap 6 hari sekali.`,
            qtext: `Jika hari ini mereka bersama-sama membersihkan tempat ibadah tersebut, berapa hari lagikah mereka akan bertemu kembali untuk beraktivitas bersama?`,
            opts: ["A. 8 hari", "B. 10 hari", "C. 12 hari", "D. 24 hari"],
            key: "c",
            expl: "Pertemuan bersama dihitung dengan menggunakan Kelipatan Persekutuan Terkecil (KPK) dari 4 dan 6. Kelipatan 4 = 4, 8, 12, 16... Kelipatan 6 = 6, 12, 18... KPK terkecil adalah 12."
          },
          {
            stim: `Pihak pengelola festival budaya di taman kota menyediakan 12 balon merah and 18 bendera kertas kecil untuk dibagikan secara adil kepada kelompok anak-anak di tempat rekreasi tanpa ada sisa.`,
            qtext: `Berapakah jumlah maksimal anak-anak yang dapat menerima pembagian balon dan bendera secara adil dan merata tersebut?`,
            opts: ["A. 3 anak", "B. 6 anak", "C. 9 anak", "D. 12 anak"],
            key: "b",
            expl: "Jumlah maksimal penerima dicari menggunakan Faktor Persekutuan Terbesar (FPB) dari 12 and 18. Faktor dari 12 adalah 1,2,3,4,6,12. Faktor dari 18 adalah 1,2,3,6,9,18. FPB-nya adalah 6."
          },
          {
            stim: `Sebuah kotak kardus memuat 8 pak kelereng mainan. Masing-masing pak kelereng tersebut berisikan tepat 12 butir kelereng aneka warna.`,
            qtext: `Berapakah jumlah keseluruhan seluruh kelereng mainan yang terletak di dalam kotak kardus tersebut jika dihitung bersama?`,
            opts: ["A. 20 butir", "B. 80 butir", "C. 96 butir", "D. 112 butir"],
            key: "c",
            expl: "Total kelereng dihitung dengan perkalian langsung: 8 pak x 12 butir per pak = 96 butir kelereng."
          }
        ];
        const v = variations[Math.floor(Math.random() * variations.length)];
        stim = v.stim; qtext = v.qtext; opts = v.opts; key = v.key; expl = v.expl;
      }
      // 4. Pengukuran Luas/Keliling
      else if (topicLower.includes("luas") || topicLower.includes("keliling") || topicLower.includes("persegi") || topicLower.includes("panjang") || topicLower.includes("lingkaran")) {
        const variations = [
          {
            stim: `Sebuah kebun jeruk segar milik kelompok tani di kawasan lereng pegunungan ${desa} berbentuk persegi panjang dengan ukuran panjang 15 meter dan lebar 10 meter.`,
            qtext: `Berapakah luas keseluruhan dari petak kebun jeruk lereng gunung tersebut?`,
            opts: ["A. 25 meter persegi", "B. 50 meter persegi", "C. 150 meter persegi", "D. 300 meter persegi"],
            key: "c",
            expl: "Luas persegi panjang dihitung dengan mengalikan panjang dan lebar. Luas = 15 meter x 10 meter = 150 meter persegi.",
            sc: `<svg viewBox="0 0 150 100" style="max-width: 140px; display: block; margin: 8px auto;">
              <rect x="15" y="15" width="120" height="70" fill="#f1f5f9" stroke="#334155" stroke-width="3"/>
              <text x="75" y="10" font-family="sans-serif" font-size="10" text-anchor="middle">Panjang: 15 m</text>
              <text x="140" y="55" font-family="sans-serif" font-size="10" text-anchor="start">Lebar: 10 m</text>
              <text x="75" y="55" font-family="sans-serif" font-size="12" font-weight="bold" fill="#4f46e5" text-anchor="middle">Luas = ?</text>
            </svg>`
          },
          {
            stim: `Sebuah ubin marmer yang dipasang rapi memperindah lantai pelataran rumah ibadah di pusat ${desa} berbentuk persegi dengan ukuran panjang sisi luar sepanjang 30 sentimeter.`,
            qtext: `Berapakah keliling keseluruhan dari satu buah ubin marmer persegi pelataran tersebut?`,
            opts: ["A. 60 cm", "B. 90 cm", "C. 120 cm", "D. 900 cm"],
            key: "c",
            expl: "Keliling persegi dihitung dengan mengalikan panjang sisi dengan 4. Keliling = 4 x sisi = 4 x 30 cm = 120 cm."
          },
          {
            stim: `Sebuah meja pajangan karya kerajinan anyaman bambu di pusat pertokoan pasar seni berbentuk persegi panjang dengan ukuran panjang 120 cm dan lebar 50 cm.`,
            qtext: `Berapakah keliling dari pinggiran meja pajangan kerajinan rakyat tersebut?`,
            opts: ["A. 170 cm", "B. 340 cm", "C. 600 cm", "D. 6.000 cm"],
            key: "b",
            expl: "Keliling persegi panjang dihitung dengan rumus K = 2 x (panjang + lebar). K = 2 x (120 cm + 50 cm) = 2 x 170 cm = 340 cm."
          }
        ];
        const v = variations[Math.floor(Math.random() * variations.length)];
        stim = v.stim; qtext = v.qtext; opts = v.opts; key = v.key; expl = v.expl; sc = v.sc || "";
      }
      // 5. Geometri & Segitiga
      else if (topicLower.includes("segitiga") || topicLower.includes("geometri") || topicLower.includes("sudut") || topicLower.includes("bangun")) {
        const variations = [
          {
            stim: `Siswa sedang mempelajari bangun datar segitiga siku-siku menggunakan alat bantu stik korek api daur ulang.`,
            qtext: `Jika sebuah segitiga memiliki salah satu titik sudut yang besarnya tepat 90 derajat, segitiga tersebut digolongkan sebagai jenis apa?`,
            opts: ["A. Segitiga Sama Sisi", "B. Segitiga Siku-Siku", "C. Segitiga Sama Kaki", "D. Segitiga Sembarang"],
            key: "b",
            expl: "Segitiga yang mempunyai satu sudut sebesar 90 derajat didefinisikan sebagai Segitiga Siku-siku.",
            sc: `<svg viewBox="0 0 120 100" style="max-width: 110px; display: block; margin: 8px auto;">
              <polygon points="20,80 100,80 20,20" fill="#f8fafc" stroke="#334155" stroke-width="3"/>
              <rect x="20" y="70" width="10" height="10" fill="none" stroke="#334155" stroke-width="1.5"/>
              <text x="15" y="85" font-size="10" font-family="sans-serif">A</text>
              <text x="105" y="85" font-size="10" font-family="sans-serif">B</text>
              <text x="15" y="15" font-size="10" font-family="sans-serif">C</text>
              <text x="35" y="65" font-size="9" fill="#e11d48">90°</text>
            </svg>`
          },
          {
            stim: `Sebuah jam dinding bundar di ruang belajar menunjukkan waktu tepat pukul 09.00 pagi hari saat bel istirahat berbunyi.`,
            qtext: `Bentuk sudut terkecil manakah yang dibentuk oleh kedua jarum jam dinding ruang belajar tersebut?`,
            opts: ["A. Sudut Lancip (kurang dari 90°)", "B. Sudut Tumpul (lebih dari 90°)", "C. Sudut Siku-Siku (tepat 90°)", "D. Sudut Lurus (180°)"],
            key: "c",
            expl: "Pada pukul 09.00, jarum pendek menunjuk angka 9 dan jarum panjang menunjuk angka 12, membentuk sudut tegak lurus sebersar 90° yang merupakan sudut siku-siku."
          },
          {
            stim: `${nameA} menggambar kotak mainan yang memiliki enam buah sisi berbentuk bujur sangkar yang sama rata luasnya.`,
            qtext: `Bangun ruang geometri tiga dimensi manakah yang digambar oleh ${nameA} tersebut?`,
            opts: ["A. Balok", "B. Tabung", "C. Kubus", "D. Prisma Segitiga"],
            key: "c",
            expl: "Bangun ruang yang memiliki enam sisi berbentuk persegi atau bujur sangkar sama besar dinamakan Kubus."
          }
        ];
        const v = variations[Math.floor(Math.random() * variations.length)];
        stim = v.stim; qtext = v.qtext; opts = v.opts; key = v.key; expl = v.expl; sc = v.sc || "";
      }
      // General Matematika Fallback (highly custom dynamic numbers)
      else {
        const baseNum1 = 20 + (num * 3);
        const baseNum2 = 5 + num;
        stim = `Dalam simulasi pemecahan numerik di ${sekolah}, ${nameA} sedang meneliti data kuantitas terkait konsep ${topic} di laboratorium sekolah.`;
        qtext = `Jika ${nameA} memiliki kelipatan nilai dasar ${baseNum1} unit, lalu ditambahkan sebanyak ${baseNum2} unit sisa dari materi ${topic}, berapa total agregat akhirnya?`;
        opts = [
          `A. ${baseNum1 + baseNum2} unit`,
          `B. ${baseNum1 + baseNum2 + 5} unit`,
          `C. ${baseNum1 * 2} unit`,
          `D. ${baseNum1 - baseNum2} unit`
        ];
        key = "a";
        expl = `Total akhir didapatkan dengan menambahkan kelipatan nilai dasar (${baseNum1} unit) dengan sisa materi (${baseNum2} unit) menghasilkan tepat ${baseNum1 + baseNum2} unit.`;
      }
    }
    else if (subjLower.includes("bahasa indonesia")) {
      // 1. Ejaan, menulis, EYD, huruf kapital
      if (topicLower.includes("ejaan") || topicLower.includes("menulis") || topicLower.includes("eyd") || topicLower.includes("kapital") || topicLower.includes("baca")) {
        const variations = [
          {
            stim: `Bacalah kalimat pendek berikut secara seksama! ${nameA} berkunjung ke rumah pamannya yang terletak di perkampungan dekat perbatasan kota.`,
            qtext: "Manakah penulisan kalimat di bawah ini yang paling tepat sesuai dengan tata ejaan Bahasa Indonesia yang baik dan benar?",
            opts: [
              "A. andi pergi ke desa makmur kemarin sore.",
              "B. Andi pergi ke Desa Makmur kemarin sore.",
              "C. andi Pergi Ke Desa Makmur Kemarin Sore.",
              "D. Andi pergi ke desa Makmur kemarin Sore."
            ],
            key: "b",
            expl: "Huruf kapital wajib digunakan di awal kalimat (Andi) dan pada huruf pertama nama unsur geografi (Desa Makmur). Maka jawaban yang tepat adalah B."
          },
          {
            stim: `Perhatikan teks berikut! pada hari senin kemarin, kancil berlari kencang menghindari terkaman ular sawah di hutan rimba.`,
            qtext: "Kata manakah pada teks bacaan di atas yang penulisan huruf pertamanya wajib menggunakan huruf kapital besar?",
            opts: ["A. hari", "B. senin dan kancil", "C. kancil dan ular", "D. pada dan senin"],
            key: "d",
            expl: "Kata 'pada' berada di awal kalimat sehingga wajib berhuruf kapital ('Pada'). Kata 'senin' merupakan nama hari sehingga wajib juga berhuruf kapital ('Senin')."
          },
          {
            stim: `Keluarga besar ${nameB} berasal dari suku jawa, sedangkan tetangga sebelah rumahnya bersuku sunda. Mereka hidup rukun berdampingan.`,
            qtext: "Perbaikan penulisan kata 'suku jawa' dan 'suku sunda' yang tepat sesuai kaidah kebahasaan adalah...",
            opts: ["A. Suku Jawa dan Suku Sunda", "B. suku Jawa dan suku Sunda", "C. Suku jawa dan Suku sunda", "D. suku jawa dan suku sunda"],
            key: "b",
            expl: "Nama suku bangsa atau suku bahasa ditulis huruf kapital pada huruf pertama unsur nama sukunya (Jawa, Sunda), sedangkan kata 'suku' ditulis dengan huruf kecil. Jadi, 'suku Jawa' dan 'suku Sunda'."
          }
        ];
        const v = variations[Math.floor(Math.random() * variations.length)];
        stim = v.stim; qtext = v.qtext; opts = v.opts; key = v.key; expl = v.expl;
      } 
      // General Bahasa Indonesia (rotating comprehension questions)
      else {
        const variations = [
          {
            stim: `Bacalah teks berikut! ${nameA} sangat rajin merawat koleksi buku miliknya di rumah. Setiap hari Sabtu pagi, ia rutin membersihkan lemari buku memakai kemoceng bulu ayam agar bebas dari debu.`,
            qtext: `Berdasarkan isi teks bacaan di atas, tindakan apa yang dilakukan oleh ${nameA} untuk merawat buku koleksinya?`,
            opts: [
              "A. Membeli tumpukan buku komik baru di pasar kota terbesar",
              "B. Menyimpan seluruh kardus mainan lamanya di teras belakang",
              "C. Membersihkan lemari buku memakai kemoceng setiap hari Sabtu",
              "D. Meminjamkan seluruh isi lemari bukunya kepada teman satu kelas"
            ],
            key: "c",
            expl: "Sesuai informasi eksplisit paragraf, setiap hari Sabtu pagi ia rutin merawat dengan membersihkan debu-debu lemari bukunya memakai alat kemoceng."
          },
          {
            stim: `Bacalah pengantar dongeng berikut! Di sebuah telaga bersih, hiduplah seekor bebek kecil bernama Joli yang sangat senang menolong temannya yang kesulitan mencari makan.`,
            qtext: "Bagaimanakah watak, sifat, atau karakter tokoh bebek kecil bernama Joli dalam penggalan cerita dongeng di atas?",
            opts: ["A. Suka menolong dan baik hati", "B. Sombong dan suka pamer", "C. Pemarah dan pelit", "D. Penakut dan pendiam"],
            key: "a",
            expl: "Sifat Joli digambarkan 'sangat senang menolong temannya', yang mencerminkan watak penolong dan baik hati."
          },
          {
            stim: `Rusa berlari lari kencang menghindari kejaran pemburu.\nIa bersembunyi di semak tinggi hutan lebat.\nAkhirnya rusa itu selamat dari bahaya yang mengintai.\n(Paragraf Narasi Tokoh Binatang)`,
            qtext: "Apakah gagasan pokok utama atau tema yang paling menggambarkan cuplikan cerita di atas?",
            opts: ["A. Petualangan berburu binatang buruan", "B. Cara rusa menghindari bahaya dari kejaran pemburu", "C. Persahabatan rusa dengan semak-semak hutan", "D. Keindahan rimba hutan lebat nusantara"],
            key: "b",
            expl: "Seluruh kalimat menceritakan kronologi usaha lari, sembunyi, dan selamatnya si rusa dari pemburu, sehingga tema utamanya adalah cara rusa menghindari bahaya."
          }
        ];
        const v = variations[Math.floor(Math.random() * variations.length)];
        stim = v.stim; qtext = v.qtext; opts = v.opts; key = v.key; expl = v.expl;
      }
    }
    else if (subjLower.includes("pancasila") || subjLower.includes("pkn") || subjLower.includes("kewarganegaraan")) {
      // 1. Simbol, lambang Pancasila
      if (topicLower.includes("simbol") || topicLower.includes("pancasila") || topicLower.includes("lambang") || topicLower.includes("sila")) {
        const variations = [
          {
            stim: `Perisai di dada Burung Garuda Pancasila memuat berbagai simbol sila luhur perjuangan bangsa Indonesia yang sangat indah dipandang mata.`,
            qtext: "Manakah lambang atau simbol dari sila kedua Pancasila pada perisai burung Garuda?",
            opts: ["A. Bintang emas bersudut lima", "B. Rantai emas lingkaran bersambung", "C. Pohon beringin rindang", "D. Kepala banteng hitam tegak"],
            key: "b",
            expl: "Simbol Sila kedua Pancasila (Kemanusiaan yang Adil dan Beradab) diwakili oleh lambang Rantai Emas. Bintang adalah sila ke-1, Beringin ke-3, Kepala Banteng ke-4, Padi & Kapas ke-5.",
            sc: `<svg viewBox="0 0 100 100" style="max-width: 95px; display: block; margin: 8px auto;">
              <rect x="10" y="10" width="80" height="80" rx="10" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>
              <circle cx="50" cy="50" r="22" stroke="#b45309" stroke-width="4" fill="none"/>
              <text x="50" y="54" font-family="sans-serif" font-size="12" font-weight="black" text-anchor="middle" fill="#b45309">⛓️</text>
            </svg>`
          },
          {
            stim: `Negara Indonesia berlandaskan Pancasila sebagai dasar negara. Sila ke-3 berbunyi "Persatuan Indonesia" memiliki lambang pohon pelindung hijau yang teduh.`,
            qtext: "Simbol apakah yang mewakili bunyi nilai Sila ke-3 Persatuan Indonesia tersebut?",
            opts: ["A. Kepala Banteng", "B. Padi dan Kapas", "C. Pohon Beringin", "D. Bintang Emas"],
            key: "c",
            expl: "Simbol sila ke-3 Persatuan Indonesia pada perisai Garuda Pancasila adalah Pohon Beringin."
          },
          {
            stim: `Anak-anak kelas ${schoolInfo?.gradeClass || "4"} di ${sekolah} bangga melafalkan lambang negara secara fasih dan menyanyikan lagu nasional bersama guru.`,
            qtext: "Bintang emas merupakan simbol yang melambangkan sila pertama. Bunyi Sila Pertama Pancasila tersebut adalah...",
            opts: ["A. Persatuan Indonesia", "B. Keadilan sosial bagi seluruh rakyat Indonesia", "C. Kemanusiaan yang adil dan beradab", "D. Ketuhanan Yang Maha Esa"],
            key: "d",
            expl: "Sudut perisai Bintang melambangkan Sila ke-1 yang berbunyi 'Ketuhanan Yang Maha Esa'."
          }
        ];
        const v = variations[Math.floor(Math.random() * variations.length)];
        stim = v.stim; qtext = v.qtext; opts = v.opts; key = v.key; expl = v.expl; sc = v.sc || "";
      } 
      // Gottong royong, aturan harian, kebinekaan (rotating)
      else {
        const variations = [
          {
            stim: `Siswa-siswi di ${sekolah} selalu mengamalkan nilai gotong royong dan kebersamaan rukun dalam persahabatan mereka di sekolah dasar.`,
            qtext: `Di bawah ini, manakah kegiatan terpuji yang mencerminkan pengamalan sila ketiga (Persatuan Indonesia) ketika berada di sekolah?`,
            opts: [
              "A. Memilih-milih teman bermain berdasarkan warna kulit atau asal daerahnya",
              "B. Melaksanakan piket kerja bakti membersihkan kelas bersama semua murid secara gembira",
              "C. Mencontek hasil pekerjaan rumah milik teman sebangku saat kelas sepi",
              "D. Mengabaikan sapaan hormat dari guru kelas ketika sedang berpapasan"
            ],
            key: "b",
            expl: "Piket kebersihan bersama memupuk kebersamaan tanpa diskriminasi, melatih persatuan, persahabatan, dan cinta kebersihan sesuai pengamalan Sila ke-3."
          },
          {
            stim: `Setiap warga sekolah memiliki hak dan juga kewajiban harian demi menciptakan ketertiban kenyamanan suasana belajar mengajar.`,
            qtext: "Tindakan manakah di bawah ini yang tergolong dalam kewajiban utama seorang murid di dalam lingkungan sekolah?",
            opts: [
              "A. Mendapatkan ruang kelas bersih yang sudah disapu penjaga sekolah",
              "B. Mematuhi aturan tata tertib kelas dan mendengarkan penjelasan guru",
              "C. Menerima pujian dan penghargaan rapor dari kepala sekolah dasar",
              "D. Bermain di halaman olahraga sepuasnya tanpa batas waktu istirahat"
            ],
            key: "b",
            expl: "Mematuhi tata tertib sekolah dan menyimak bimbingan bapak/ibu guru adalah kewajiban dasar seorang murid, sedangkan mendapatkan kelas bersih adalah contoh hak murid."
          },
          {
            stim: `Meskipun siswa kelas ${schoolInfo?.gradeClass || "4"} menganut keyakinan berbeda dan berasal dari daerah adat yang beragam, mereka selalu bertegur sapa ramah.`,
            qtext: "Semboyan luhur negara Indonesia yang mengajarkan kita untuk tetap bersatu meskipun beraneka ragam suku bangsa adalah...",
            opts: ["A. Tut Wuri Handayani", "B. Garuda Pancasila Is My Pride", "C. Bhinneka Tunggal Ika", "D. Tut Wuri Marilah Bersama"],
            key: "c",
            expl: "Semboyan Bhinneka Tunggal Ika tertulis di pita kaki burung Garuda yang artinya 'Berbeda-beda tetapi tetap satu jua'."
          }
        ];
        const v = variations[Math.floor(Math.random() * variations.length)];
        stim = v.stim; qtext = v.qtext; opts = v.opts; key = v.key; expl = v.expl;
      }
    }
    else if (subjLower.includes("ipas") || subjLower.includes("ipa") || subjLower.includes("ips") || subjLower.includes("sains")) {
      // 1. Suhu, zat, wujud
      if (topicLower.includes("zat") || topicLower.includes("wujud") || topicLower.includes("suhu") || topicLower.includes("air") || topicLower.includes("siklus")) {
        const variations = [
          {
            stim: `Dalam praktikum IPA di teras ${sekolah}, ${nameA} melihat air mentah di dalam panci ketika direbus terus-menerus akan mengeluarkan uap membubung tinggi.`,
            qtext: "Perubahan wujud benda dari zat cair berubah rupa menjadi zat gas udara tersebut dinamakan istilah apa?",
            opts: ["A. Mencair", "B. Membeku", "C. Menguap", "D. Mengembun"],
            key: "c",
            expl: "Perubahan wujud zat dari benda cair menjadi zat gas dipicu panas dinamakan Menguap."
          },
          {
            stim: `${nameB} mengambil sebuah es batu padat dari dalam kulkas lalu meletakkannya di atas piring terbuka di bawah sinar matahari hangat.`,
            qtext: "Proses perubahan bentuk es batu yang semula padat berubah wujud menjadi air cair disebut...",
            opts: ["A. Menguap", "B. Mencair", "C. Menyublim", "D. Membeku"],
            key: "b",
            expl: "Es batu padat yang ditaruh di tempat bersuhu tinggi menyerap energi kalor panas bumi dan mencair menjadi air cair."
          },
          {
            stim: `Ibu menaruh kapur barus wangi berbentuk bulat padat ke dalam lemari pakaian. Setelah beberapa minggu, kapur barus tersebut mengecil lalu habis.`,
            qtext: "Peristiwa perubahan benda padat langsung beralih wujud menjadi gas harum tersebut dinamakan...",
            opts: ["A. Mengembun", "B. Menyublim", "C. Mengkristal", "D. Menguap"],
            key: "b",
            expl: "Menyublim adalah perubahan wujud suatu zat dari bentuk padat langsung menguap menjadi bentuk gas tanpa melalui fasa cair terlebih dahulu."
          }
        ];
        const v = variations[Math.floor(Math.random() * variations.length)];
        stim = v.stim; qtext = v.qtext; opts = v.opts; key = v.key; expl = v.expl;
      } 
      // 2. Tumbuhan, akar, fotosintesis
      else if (topicLower.includes("fotosintesis") || topicLower.includes("organ") || topicLower.includes("akar") || topicLower.includes("tubuh") || topicLower.includes("daun") || topicLower.includes("tumbuhan") || topicLower.includes("hewan")) {
        const variations = [
          {
            stim: `Saat meneliti taman belakang kelas, ${nameA} memperhatikan berbagai bagian struktur penting tanaman hias jenis daun serabut.`,
            qtext: "Manakah bagian inti dari tumbuhan yang memiliki fungsi utama menyerap pasokan air dan unsur hara (mineral) di dalam tanah?",
            opts: ["A. Daun hijau lebar", "B. Batang kayu penyangga", "C. Kuncup bunga hias", "D. Akar serabut bawah"],
            key: "d",
            expl: "Akar berfungsi menancap di tanah untuk menyerap suplai air serta garam mineral tanah menuju organ atas tumbuhan.",
            sc: `<svg viewBox="0 0 100 100" style="max-width: 95px; display: block; margin: 8px auto;">
              <rect x="45" y="10" width="10" height="60" fill="#a16207"/>
              <circle cx="50" cy="25" r="20" fill="#15803d"/>
              <path d="M 50 70 Q 30 80 15 90 M 50 75 Q 40 85 30 95 M 50 70 Q 70 80 85 90 M 50 75 Q 60 85 70 95" stroke="#78350f" stroke-width="2.5" fill="none"/>
              <text x="80" y="80" font-family="sans-serif" font-size="8" fill="#78350f" font-weight="bold">Akar</text>
            </svg>`
          },
          {
            stim: `Tumbuhan hijau dikenal istimewa karena melakukan fotosintesis di bawah siraman matahari guna mencukupi kebutuhan makanannya sendiri secara mandiri.`,
            qtext: "Gas rill apakah di udara yang diserap oleh daun tumbuhan hijau sebagai bahan baku pembuatan makanan saat proses fotosintesis?",
            opts: ["A. Oksigen (O2)", "B. Karbon Dioksida (CO2)", "C. Nitrogen (N2)", "D. Helium (He)"],
            key: "b",
            expl: "Dalam proses menghasilkan karbohidrat fotosintesis, daun menyerap gas Karbon Dioksida (CO2) dari udara bebas dan memancarkan oksigen (O2) kembali."
          },
          {
            stim: `Klorofil adalah zat hijau daun alami pada tumbuhan yang menangkap energi cahaya matahari menyokong siklus hidup tanaman di bumi.`,
            qtext: "Di dalam bagian sel tumbuhan manakah zat hijau daun (klorofil) tersebut terletak?",
            opts: ["A. Kloroplas", "B. Dinding Sel", "C. Membran Sel", "D. Inti Sel/Nukleus"],
            key: "a",
            expl: "Klorofil disimpan dan berproses menangkap sinar matahari di dalam organel khusus sel tumbuhan yang dikenal dengan nama Kloroplas."
          }
        ];
        const v = variations[Math.floor(Math.random() * variations.length)];
        stim = v.stim; qtext = v.qtext; opts = v.opts; key = v.key; expl = v.expl; sc = v.sc || "";
      }
      // General IPAS Fallback
      else {
        const variations = [
          {
            stim: `Keseimbangan ekosistem sangat dipengaruhi oleh kelancaran hubungan rantai makanan antara tumbuhan sebagai produsen dan hewan sebagai konsumen.`,
            qtext: `Makhluk hidup yang berperan menguraikan sisa organisme mati dalam suatu rantai ekosistem alam terkait dinamakan kedudukan apa?`,
            opts: ["A. Dekomposer (Pengurai)", "B. Konsumen Tingkat I", "C. Produsen Utama", "D. Konsumen Puncak"],
            key: "a",
            expl: "Dekomposer (seperti bakteri dan jamur tanah) bertugas mengurai sisa makhluk hidup yang mati agar kembali menjadi nutrisi subur tanah pelindung."
          },
          {
            stim: `Sains menyelidiki gejala alam secara empiris, melatih siswa kelas ${schoolInfo?.gradeClass || "4"} di ${desa} menggunakan nalar kritis.`,
            qtext: `Di bawah ini, panca indera manusia manakah yang memiliki fungsi khusus asis pendengar gelombang getaran suara harian?`,
            opts: ["A. Selaput Hidung", "B. Selaput Indra Telinga", "C. Indra Lidah Perasa", "D. Bola Mata Utama"],
            key: "b",
            expl: "Telinga adalah organ panca indra manusia yang mendeteksi, menangkap, dan memproses rangsang suara/getaran bunyi eksternal."
          }
        ];
        const v = variations[Math.floor(Math.random() * variations.length)];
        stim = v.stim; qtext = v.qtext; opts = v.opts; key = v.key; expl = v.expl;
      }
    }
    else if (subjLower.includes("agama")) {
      // Determine religious context based on specific religion name
      let religionLabel = "Agama";
      let holyBook = "Kitab Suci";
      let temple = "Tempat Ibadah";

      if (subjLower.includes("islam")) {
        religionLabel = "Agama Islam"; holyBook = "Al-Qur'an"; temple = "Masjid";
      } else if (subjLower.includes("kristen")) {
        religionLabel = "Agama Kristen"; holyBook = "Alkitab"; temple = "Gereja";
      } else if (subjLower.includes("katolik")) {
        religionLabel = "Agama Katolik"; holyBook = "Alkitab"; temple = "Gereja";
      } else if (subjLower.includes("hindu")) {
        religionLabel = "Agama Hindu"; holyBook = "Weda"; temple = "Pura";
      } else if (subjLower.includes("buddha")) {
        religionLabel = "Agama Buddha"; holyBook = "Tripitaka"; temple = "Vihara";
      } else if (subjLower.includes("khonghucu")) {
        religionLabel = "Agama Khonghucu"; holyBook = "Sishu Wujing"; temple = "Kelenteng";
      }

      const variations = [
        {
          stim: `Saat kelas bimbingan ${religionLabel} di ${sekolah}, bapak bimbingan mengajak semua siswa membiasakan sikap jujur dan rendah hati kepada siapa saja.`,
          qtext: `Di bawah ini, manakah contoh nyata dari sikap terpuji rendah hati (tawadhu/kasih) yang patut dipraktikkan murid di lingkungan pergaulan kelas?`,
          opts: [
            "A. Membanggakan kelebihan milik sendiri secara berlebihan di depan teman yang kesulitan",
            "B. Mau bergaul, menyapa hangat, dan bekerjasama dengan seluruh teman tanpa pandang kasta",
            "C. Menyela perkataan penjelasan teman yang sedang mempresentasikan tugas",
            "D. Mengeluhkan nasehat bijak penuh kasih yang disampaikan orang tua"
          ],
          key: "b",
          expl: "Bergaul hangat secara tulus dan menghormati siapapun tanpa diskriminasi merupakan core ajaran akhlak mulia dan kasih sayang universal di semua keyakinan."
        },
        {
          stim: `Setiap pemeluk keyakinan beribadah dengan khusyuk di dalam ${temple} serta senantiasa menjaga kebersihan hati pikiran sesuai tuntutan ${holyBook}.`,
          qtext: `Mengapa toleransi antar pemeluk agama yang berlainan harus senantiasa dipupuk kukuh dalam kehidupan berbangsa di Indonesia?`,
          opts: [
            "A. Supaya dapat membuktikan pemeluk agama mana yang paling benar",
            "B. Terciptanya kerukunan perdamaian rukun persatuan secara harmonis berkelanjutan",
            "C. Agar seluruh pemeluk keyakinan beribadah di satu tempat yang sama",
            "D. Menuntut semua warga memiliki tata cara beribadah yang seragam"
          ],
          key: "b",
          expl: "Toleransi dipupuk erat agar tercipta kerukunan nasional, persatuan kokoh bhinneka tunggal ika, dan keharmonisan bermasyarakat tanpa perseteruan."
        },
        {
          stim: `Kitab pedoman mulia (${holyBook}) menggariskan nilai kebajikan sosial tinggi agar kita berbakti mulia membantu warga miskin atau lemah di ${desa}.`,
          qtext: `Salah satu teladan pengamalan tindakan terpuji tersebut di kehidupan nyata sehari-hari adalah...`,
          opts: [
            "A. Menyisihkan uang saku mingguan secara sukarela untuk disumbangkan ke panti asuhan",
            "B. Menyimpan rapat seluruh makanan kebersihan tanpa berniat berbagi dengan adik kandung",
            "C. Memaksakan pengeluaran dana bantuan yatim yang dipatoki bunga pinjaman",
            "D. Acuh tak acuh menyembunyikan mainan agar tidak dipinjam oleh sepupu"
          ],
          key: "a",
          expl: "Menyisihkan uang saku secara sukarela tulus ikhlas adalah bakti nyata kemanusiaan yang selaras dengan seluruh petunjuk ajaran agama suci."
        }
      ];
      const v = variations[Math.floor(Math.random() * variations.length)];
      stim = v.stim; qtext = v.qtext; opts = v.opts; key = v.key; expl = v.expl;
    }
    else if (subjLower.includes("pjok") || subjLower.includes("jasmani") || subjLower.includes("olahraga") || subjLower.includes("penjas")) {
      const variations = [
        {
          stim: `Dalam modul kesehatan jasmani di lapangan ${sekolah}, ${nameA} sedang berlatih gerakan dasar lokomotor dan non-lokomotor yaitu menekuk lutut gembira.`,
          qtext: `Gerakan meliukkan badan atau membungkuk tanpa memindahkan posisi kaki tapak dari lantai merupakan contoh dari kelompok gerak dasar apa dalam PJOK?`,
          opts: [
            "A. Gerak Lokomotor",
            "B. Gerak Non-lokomotor",
            "C. Gerak Manipulatif",
            "D. Gerak Refleks"
          ],
          key: "b",
          expl: "Gerak non-lokomotor adalah aktivitas gerak fisik yang dilakukan di tempat mandiri tanpa disertai perpindahan koordinat tubuh seperti meliuk atau membungkuk."
        },
        {
          stim: `Guru olahraga meminta para murid berbaris estafet memindahkan bola dari satu regu siswa ke regu seberang menggunakan operan kaki bagian dalam.`,
          qtext: `Di bawah ini, manakah tujuan utama melakukan operan (passing) bola kaki bagian dalam secara konsisten dalam permainan sepak bola?`,
          opts: [
            "A. Melambungkan bola tinggi jauh tak terarah melintasi lapangan",
            "B. Mengoper pendek secara akurat, terukur, dan terarah menuju kaki teman satu tim",
            "C. Menembak bola keras liar agar dapat mencetak skor dari jarak setengah lapangan",
            "D. Melakukan gerakan lari kencang membelakangi pertahanan kawan"
          ],
          key: "b",
          expl: "Kaki bagian dalam memiliki luas bidang dorong datar optimal sehingga sangat disarankan untuk melakukan umpan bola jarak dekat-menengah secara presisi."
        },
        {
          stim: `Sebelum berlari kargo sirkuit lari cepat, ketua kelompok bimbingan olahraga ${nameGuru} selalu mengajak seluruh murid melaksanakan pemanasan statis dinamis.`,
          qtext: "Apakah tujuan esensial dari pelaksanaan tahapan pemanasan (warming-up) sendi otot tubuh sebelum kita masuk latihan berintensitas tinggi?",
          opts: [
            "A. Menghabiskan tenaga agar siswa merasa cepat mengantuk di kelas pelajaran",
            "B. Meningkatkan kelenturan otot sendi, menaikkan sirkulasi denyut jantung aman, serta mencegah cedera",
            "C. Menentukan sanksi denda bagi kelompok murid yang terlambat datang berbaris",
            "D. Mempercepat selesainya jalannya proses pertandingan olahraga agar cepat beristirahat"
          ],
          key: "b",
          expl: "Pemanasan secara fisiologis berfungsi mengalirkan darah beroksigen optimal ke sel otot, merentangkan kelenturan sendi pasif, sehingga meminimalisir kejadian kram cedera."
        }
      ];
      const v = variations[Math.floor(Math.random() * variations.length)];
      stim = v.stim; qtext = v.qtext; opts = v.opts; key = v.key; expl = v.expl;
    }
    else if (subjLower.includes("seni") || subjLower.includes("rupa") || subjLower.includes("musik") || subjLower.includes("tari") || subjLower.includes("teater")) {
      const variations = [
        {
          stim: `Belajar Seni di sekolah melepaskan kejenuhan kognitif siswa kelas ${schoolInfo?.gradeClass || "4"}. Siswa diberi kesempatan mencampur warna utama warna primer.`,
          qtext: `Jika ${nameA} menyilangkan cat warna biru murni dengan cat warna kuning terang di atas paletnya, warna sekunder paduan manakah yang akan tercipta?`,
          opts: ["A. Warna Jingga", "B. Warna Ungu", "C. Warna Hijau", "D. Warna Merah Bata"],
          key: "c",
          expl: "Hukum pencampuran warna primer: Biru + Kuning menghasilkan warna hijau sekunder murni."
        },
        {
          stim: `${nameB} sedang berlatih menarikan sebuah gerak tari tradisional khas nusantara dengan ritme langkah dinamis berseling.`,
          qtext: "Gerakan penari yang dirancang meniru menelan gerakan alam sekitar seperti dedaunan tertiup angin sepoi-sepoi dinamakan teknik gerak tari apa?",
          opts: ["A. Gerak Maknawi", "B. Gerak Imitatif (Tiruan Alam)", "C. Gerak Akrobatik Atas", "D. Gerak Refleks Seniman"],
          key: "b",
          expl: "Meniru fenomena kinetik benda alam (tumbuhan bergoyang, ombak bergulung, fauna terbang) digolongkan sebagai Gerak Imitatif murni bernilai estetis."
        },
        {
          stim: `Mempelajari instrumen tradisional angklung bambu membawa apresiasi budaya daerah tersendiri bagi siswa SD Merdeka ${desa}.`,
          qtext: "Bagaimanakah cara utama membunyikan alat musik bambu angklung pararel agar menghasilkan alunan nada getar merdu yang harmonis?",
          opts: ["A. Ditiup memakai corong bambu khusus", "B. Digetarkan atau digoyangkan secara berulang", "C. Dipetik kawat senarnya satu demi satu", "D. Digesek bagian bilahnya memakai busur kawat"],
          key: "b",
          expl: "Angklung berbunyi tatkala pipa-pipa bambu vertikalnya saling berbenturan ritmis saat digoyangkan/digetarkan oleh genggaman tangan pemain."
        }
      ];
      const v = variations[Math.floor(Math.random() * variations.length)];
      stim = v.stim; qtext = v.qtext; opts = v.opts; key = v.key; expl = v.expl;
    }
    else if (subjLower.includes("inggris") || subjLower.includes("english")) {
      const variations = [
        {
          stim: `In the English lesson, Mother ${nameGuru} is teaching about daily greetings and common expressions used inside the school class.`,
          qtext: `What is the most polite and proper response when a classmate says "Thank you very much for helping me clean the whiteboard"?`,
          opts: [
            "A. You are welcome. Glad to help you!",
            "B. I do not care. Go away please.",
            "C. Shut up and get out of here right now.",
            "D. Good morning, how are you feeling today?"
          ],
          key: "a",
          expl: "The standard and polite response for expressing gratitude (thank you) is 'You are welcome'."
        },
        {
          stim: `Every Friday morning, ${nameA} and his friends always clean their classroom together with joy. They put trash into the green dustbin.`,
          qtext: "According to the story above, what action does Andi and his friends always do inside their lovely classroom?",
          opts: [
            "A. They buy many snacks at the school canteen",
            "B. They clean their classroom together with joy",
            "C. They play football in the middle of school yard",
            "D. They fight with each other near the school gate"
          ],
          key: "b",
          expl: "The text explicitly states: 'They always clean their classroom together with joy'."
        },
        {
          stim: `I have a cute pet under my bed. It has four legs, soft white fur, and a long tail. It loves to say "meow" happily when hungry.`,
          qtext: "What animal is described in the short paragraph text above?",
          opts: ["A. A cute little rabbit", "B. A fluffy white puppy", "C. An innocent small cat", "D. A scary mouse in the kitchen"],
          key: "c",
          expl: "The hint 'meow' and 'four legs, fur, tail' clearly points to a cat (Kucing) as the described pet."
        }
      ];
      const v = variations[Math.floor(Math.random() * variations.length)];
      stim = v.stim; qtext = v.qtext; opts = v.opts; key = v.key; expl = v.expl;
    }
    // Universal Unspecified School Subject Fallback System (Generating 10 100% DISTINCT, beautiful templates rotating continuously)
    else {
      const genericTemplates = [
        {
          stim: `Saat meneliti topik pokok ${topic} di ${sekolah}, ${nameA} berdiskusi aktif menemukan gagasan utama yang berguna bagi kemajuan regu belajarnya.`,
          qtext: `Bagaimanakah sikap mental terbaik kita ketika berdiskusi tim merampungkan pemahaman rumit terkait ${topic}?`,
          opts: [
            "A. Mengakomodasi masukan tim secara santun rukun dan bekerjasama dengan lapang dada",
            "B. Menghakimi pendapat kelompok lain dan mendominasi seluruh jalannya keputusan",
            "C. Mengabaikan jalannya diskusi meja dan memilih untuk tertidur di bangku",
            "D. Menuntut teman sekelas memenangkan perlombaan tanpa andil kerja nyata"
          ],
          key: "a",
          expl: `Penyelesaian diskusi berbasis ${topic} diselesaikan dengan memupuk rukun kolaborasi, toleransi sapaan kritis, dan menghargai pendapat rekan setim.`
        },
        {
          stim: `Penerapan positif berkelanjutan dari materi ${topic} di ${sekolah} memotivasi seluruh siswa kelas ${schoolInfo?.gradeClass || "4"} untuk berbuat baik harian.`,
          qtext: `Apakah manfaat utama dari penguasaan terapan materi ${topic} pada kegiatan nyata kehidupan sehari-hari anak?`,
          opts: [
            "A. Memajukan daya pikir kreatif, memberi kemudahan pemecahan hambatan kerja, dan bersahabat",
            "B. Menumbuhkan watak congkak dan merendahkan martabat murid kelayakan lain",
            "C. Mempersulit waktu senggang bermain di sore hari bersama sepupu terdekat",
            "D. Menyinggung perasaan guru wali kelas karena melampaui kurikulum teoritis"
          ],
          key: "a",
          expl: `Penguasaan materi pokok ${topic} melatih daya pikat kemandirian kritis siswa bernalar mengahadapi tantangan nyata dunia kontekstual.`
        },
        {
          stim: `Ibu Guru ${nameGuru} menugaskan pameran kliping interaktif bertajuk penguatan muatan kompetensi ${topic} untuk siswa tingkat dasar ${desa}.`,
          qtext: `Apabila ada butir soal uji latihan ${topic} yang masih dinilai lumayan membingungkan, langkah bijak apakah yang selayaknya dilakukan siswa?`,
          opts: [
            "A. Langsung bersikap putus asa dan langsung mengosongkan keseluruhan sekat lembaran jawab",
            "B. Menanyakan sela penjelasan secara sopan ramah pada bapak/ibu guru pembimbing",
            "C. Menyandarkan lembar jawaban dari hasil mematai milik teman samping dengan kilat",
            "D. Menyalahkan instrumen materi ajar bertingkat tinggi yang ditentukan dinas"
          ],
          key: "b",
          expl: `Bertanya langsung secara sopan jujur berjiwa kandel pada bapak/ibu guru kelas memupuk jalinan komunikasi konstruktif proses belajar mengajar.`
        },
        {
          stim: `Melalui proyek mandiri materi ${topic}, kita diajarkan berkolaborasi memanfaatkan bahan sisa lingkungan sekolah yang bersih.`,
          qtext: `Apakah bentuk keterlibatan aktif berfaedah yang dipetik siswa dari pengerjaan karya bertema ${topic} tersebut?`,
          opts: [
            "A. Mengasuh kepedulian lingkungan, merajut rasa kebersamaan, dan meningkatkan kreativitas cipta",
            "B. Mengurangi konsentrasi belajar dalam kelas karena asik bermain sendiri tanpa target",
            "C. Menghilangkan minat bekerjasama karena tidak didukung fasilitas mewah pabrikan",
            "D. Memicu pertengkaran antar kelompok akibat bersaing memperebutkan nilai rapor tertinggi"
          ],
          key: "a",
          expl: `Kolaborasi aktif materi ${topic} menginternalisasi nilai kreativitas, cinta lingkungan bersih, dan toleransi sosial empati.`
        },
        {
          stim: `Dalam modul penunjang ${topic}, Guru ${nameGuru} memberikan apresiasi tinggi bagi kelancaran presentasi lisan yang disampaikan oleh kelompok ${nameB}.`,
          qtext: `Mengapa keberanian mengungkap argumen lisan yang lugas ramah anak sangat dinilai positif ketika membahas pembelajaran ${topic}?`,
          opts: [
            "A. Untuk melatih rasa percaya diri anak cerdas dan menghargai tata cara mengemukakan pendapat",
            "B. Supaya bisa memperlama jam belajar agar pelajaran mata kuliah lain digagalkan",
            "C. Untuk pamer kekuatan retorika berbicara dengan nada mendekte emosi teman",
            "D. Memungkinkan siswa mendapatkan hadiah materi khusus melekat secara eksklusif"
          ],
          key: "a",
          expl: `Mengungapkan pendapat lisan secara terstruktur memupuk rasa percaya diri serta melatih kematangan komunikasi sosial pembelajar Pancasila.`
        },
        {
          stim: `Mengenal aneksasi deskripsi ${topic} memberikan gambaran komprehensif bagi anak dalam menjaga ketertiban hidup rukun damai di area ${desa}.`,
          qtext: `Di bawah ini, manakah teladan tingkah laku yang sejalan dengan semangat kebersihan saat membahas pelajaran ${topic}?`,
          opts: [
            "A. Menaruh bungkus sisa jajanan di laci bangku kelas sampai menumpuk bau",
            "B. Membuang sampah harian pada tempat pembuangan sampah organik dan anorganik secara tertib",
            "C. Membiarkan percikan air kran koperasi menyembur membasahi koridor utama",
            "D. Memungut sisa guntingan prakarya teman lalu dibiarkan berserakan di bawah meja"
          ],
          key: "b",
          expl: `Penerapan cinta kebersihan di lingkungan belajar ${topic} merefleksikan perbuatan terpuji menjaga kelestarian alam dan sekolah sehat.`
        },
        {
          stim: `Materi pokok ${topic} menjadi perbincangan hangat yang seru antara ${nameA}, ${nameB}, dan ${nameC} saat jam istirahat di kantin ${sekolah}.`,
          qtext: `Bagaimana cara terbaik menjalin komunikasi yang bersahabat ketika kelompok teman bermain memiliki pandangan berbeda tentang konsep ${topic}?`,
          opts: [
            "A. Saling mendengarkan pandangan dengan lapang dada tanpa menghina argumen teman sebaya",
            "B. Bersikeras bahwa pemikiran kita adalah satu-satunya kebenaran murni tanpa sela",
            "C. Meninggalkan meja kantin dengan wajah cemberut menolak menyapa teman tersebut",
            "D. Mengajak teman lain untuk memusuhi kelompok teman yang berbeda pendapat"
          ],
          key: "a",
          expl: `Keragaman pandangan belajar ${topic} dihadapi dengan saling mendengarkan secara asertif, ramah anak, lapang dada, dan menjaga pilar persahabatan.`
        },
        {
          stim: `Di perpustakaan ${sekolah}, Ibu ${nameGuru} sedang membimbing penelusuran data literatur tertulis mengenai kehebatan sejarah ${topic}.`,
          qtext: `Manakah dari aktivitas gemar membaca literatur tentang ${topic} berikut yang memberikan dampak perluasan ilmu paling signifikan?`,
          opts: [
            "A. Membaca dengan tekun, penuh konsentrasi, mencatat poin penting, dan mendiskusikannya rukun",
            "B. Membuka halaman buku secara cepat sekilas hanya untuk melihat coretan ilustrasi belaka",
            "C. Merobek lembaran referensi perpustakaan yang memuat ringkasan paling padat",
            "D. Menumpuk buku-bibu tebal di meja sekadar untuk dipamerkan ke teman sekelas"
          ],
          key: "a",
          expl: "Kegemaran membaca literasi secara mendalam melatih daya analisis kognitif, memperkokoh retensi ingatan, serta memperkaya khasanah materi."
        },
        {
          stim: `Sebagai siswa yang berkarakter luhur, kita dibiasakan membantu adik kelas yang belum memegangi kompetensi dasar mengenai ${topic}.`,
          qtext: `Perbuatan mulia membantu sesama rekan dalam mendalami materi ${topic} laksana ketetapan budi pekerti mencerminkan sikap bernuansa...`,
          opts: [
            "A. Kepedulian sosial tinggi yang tulus tanpa didasari pamrih atau imbalan materi",
            "B. Motif tersembunyi agar dipuji secara berlebihan oleh kepala sekolah dasar",
            "C. Tindakan usil mencampuri urusan privasi pengerjaan evaluasi anak lain",
            "D. Sikap pamer kepintaran akademis di hadapan adik kelas yang masih belia"
          ],
          key: "a",
          expl: "Membantu sesama rekan mengenali pemecahan materi merepresentasikan sikap peduli dan empati sosial tinggi mencerminkan akhlak bernegara."
        },
        {
          stim: `Menuntaskan tantangan berjenjang bermateri ${topic} melatih otot berpikir kognitif siswa dalam fase tumbuh kembang di sekolah Merdeka ${desa}.`,
          qtext: `Jika kita berhasil mendapatkan perolehan evaluasi yang memuaskan pada kompetensi ${topic}, tindakan paling bijak yang patut dipelihara adalah...`,
          opts: [
            "A. Tetap rendah hati, tidak menyombongkan diri, serta terus konsisten belajar giat",
            "B. Berhenti mempelajari materi terkait karena berasumsi sudah mendominasi segala cabang ilmu",
            "C. Mengejek hasil kuis teman sebangku yang nilainya masih di bawah passing grade",
            "D. Meminta hadiah imbalan mahal dari orang tua dengan nada mendesak"
          ],
          key: "a",
          expl: "Kesuksesan pencapaian nilai disikapi dengan rendah hati ramah anak, avoiding sikap narsistik sombong, dan mempertahankan semangat belajar."
        }
      ];
      const template = genericTemplates[Math.floor(Math.random() * genericTemplates.length)];
      stim = template.stim;
      qtext = template.qtext;
      opts = template.opts;
      key = template.key;
      expl = template.expl;
    }

    // Adapt layout and instructions based on the target questionType (Isian Singkat or Uraian)
    let finalQText = qtext;
    let finalOpts = type === "Pilihan Ganda" ? [...opts] : [];
    let finalKey = type === "Pilihan Ganda" ? key : "Jawaban logis terverifikasi guru";
    let finalAlts = type === "Pilihan Ganda" ? [] : ["Jawaban alternatif berbobot benar dari siswa"];

    if (type === "Pilihan Ganda" && finalOpts.length > 0) {
      // Align correct answer position 100% with the Kisi-Kisi answerKey:
      let targetAnswerLetter = (row.answerKey || "").trim().toUpperCase();
      const letters = ["A", "B", "C", "D"];
      let targetIdx = -1;
      if (targetAnswerLetter && letters.includes(targetAnswerLetter)) {
        targetIdx = letters.indexOf(targetAnswerLetter);
      } else {
        // Fallback to seeded random choice if no key exists
        const seed = Math.sin((num + 19) * 21.3) * 10000;
        targetIdx = Math.floor((seed - Math.floor(seed)) * 4);
        targetAnswerLetter = letters[targetIdx];
      }

      // Extract the correct text and incorrect text items
      const correctIdxInOld = key.toLowerCase().charCodeAt(0) - 97;
      const cleanOptsContent = finalOpts.map(o => o.replace(/^[a-dA-D][.\s)]+/, "").trim());
      const correctText = cleanOptsContent[correctIdxInOld] || cleanOptsContent[0];
      const incorrectTexts = cleanOptsContent.filter((_, i) => i !== correctIdxInOld);

      // Shuffle the remaining three incorrect options
      let shuffledIncorrects = [...incorrectTexts];
      for (let i = shuffledIncorrects.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = shuffledIncorrects[i];
        shuffledIncorrects[i] = shuffledIncorrects[j];
        shuffledIncorrects[j] = temp;
      }

      // Assemble content, placing the correctText exactly at targetIdx
      const shuffledContent: string[] = [];
      let incIdx = 0;
      for (let i = 0; i < 4; i++) {
        if (i === targetIdx) {
          shuffledContent.push(correctText);
        } else {
          shuffledContent.push(shuffledIncorrects[incIdx] || `Pilihan ${letters[i]}`);
          incIdx++;
        }
      }

      // Re-assign option letter prefixes A, B, C, D
      finalOpts = shuffledContent.map((text, idx) => `${letters[idx]}. ${text}`);
      key = String.fromCharCode(97 + targetIdx); // lowercase 'a', 'b', etc.
      finalKey = finalOpts[targetIdx];
    }

    if (type === "Isian Singkat") {
      finalQText = qtext + " (Isilah titik-titik di atas dengan jawaban singkat berupa kata atau angka secara tepat!)";
      finalKey = "Siswa menjawab dengan kata kunci tepat terkait " + topic;
      finalAlts = ["Kesesuaian konsep terapan " + topic];
    } else if (type === "Uraian") {
      finalQText = "Jelaskanlah secara mandiri dan komprehensif mengenai pernyataan berikut: " + qtext;
      finalKey = "Penjelasan rincian kritis tertulis mandiri oleh siswa mencakup seluruh aspek konseptual " + topic + " secara runut.";
      finalAlts = ["Uraian argumentatif logis dari pemikiran mandiri siswa terkait " + topic];
    }

    questions.push({
      number: num,
      questionType: type,
      cognitiveLevel: level,
      materi: topic,
      stimulusText: stim,
      questionText: finalQText,
      options: finalOpts,
      answerKey: finalOpts.length > 0 ? finalOpts[key.charCodeAt(0) - 97] || finalOpts[0] : finalKey,
      alternativeAnswers: finalAlts,
      explanation: expl,
      svgContent: sc,
      imageUrl: ""
    });
  }

  return questions;
}
