export type MockupCard = { title: string; category: string; description: string; image: string };

export const mockupImages = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuABNeXhsnRJCvgBOyh59FQn3RZniP5_6PyoEFLG4YCe3OV3doTfjbFjy62Ovf4YAVowDqI7fy7NDTeruqUnEgD1sRnBb1XiKz30jFh_IPSIA9FFisEgDlpaeIjvDX3HB5bBuyg9cK_Usx_rhQQNmLhMc3Q5pvaqV92MHpMksW594Zc02twLHo5LxprsM29Eio_aBQNjzx5Kq9Tfvnij7T4C6BK1VNxbQh2mMymGC97QmO3gX1i2mEhgbQ",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBnBQK46YLRuzVzi0ylaDXeCcliJAPd5NhQsA88poKT-_Sb5IZmYPxoARUGf8WQRuMN_ExUZu22e3HTPklFay0csN0c8lD99uFc3CrXHa61sUqj3617BAR8iJ6MEqNVaQ2Ov5ms-AV32DYsn_lyq-qotJ6i7uZah6lagPP-Ymm4ft2AjTN3Nm2ZMntp5NlQ835UlNkbRun50Z-Uwza39svnLL90JtyeJEdiqTyVmxS8B4mu7wvGxZ3jcA",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA36xGouVzIpZJPR4el3gjnj00UR1bq8a0E7sLRmMEoXQ2Ao-vHvTwv55ohIrof5TGsm6r3t107avM7wHhTOcQLEkD0deBZ4E4WqRDJYr-KwEG3zDkeYiFhaWIroSL8reUxqlxLDORgNK28bLNn3JAqewfRzHWsk-P5mUdQCCMoPMQR82kRBTrql7R3FvGhB08ODOcvWxRR25vo5QSqXbQ1rsAudzawC4QCPwr0q4ivIy3yq5iZkrm8bQ",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA3LFgZDuPXRBLNculDyApF7-mIN4_QZKDgAKJ5-2i6Zz1uIKAX1CNccjdpSFrUR5x-kqp1Y25Q0qy_ZllBVwyavEzFMtCMW15S2DBjStVyRX0ykVPTJEfl5x_EFP4ncwSR6bQn-Vt-99i1QORIrbgqTJNHW0lR_-9whciUPjhEeZCV7LCGwEzadhsaQkIX7T2Cp_FMS2rrPZfKI4zJnlpkZsT-8jjj3orxtp6dndrSA4X2R8LycPEZuw",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA66mkQxes2JOXw6vFhlX_l6Rw1zlfiGTsuKLG1tI9jOtmgNaGxamn2Vd4dKruBbM4Msg_v288Yr5gFzkjMt9zXxWqYXX-lGV3AC2v_fHxy_mf04s6OozlwPlO8iKX0PBEnM8qM7I9Hx6uOhWeAnTXWNHc14TOoaVpdcgQBZWvbkQpiOUfjIvHZJlA3CjqkuLvblqxpLF-NO-b3ci_-0JGR2lVcfqa1uAetO-u_EN6bHDFGk6R8ZV8zQg",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA8p_2-CyFhMMUEqGEmgoJsix-8vNdBTYXFWoD4GNUL8mPjrJSA2uQ8jtV0pV3cxveOU7uxFuBSnijNWHpSQfj8JpZWOg_2L1rGx3XyndPDeUG5g06Tqy0ZdRYwR9NpPudqwDul5UCxwM1KX1_af-0Qp2Vgjamir30TL-bNA4MTvAY2nemUjbUGXdSgQTq76nloWAK8Xm6hBE3LOcj6CJ8lIvULEaNvcKynYF0WKUoxUxxJIXWjV4mo1A",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAFd_ndCp_0GcwS1WtrhBfZKl18zd8bgXLpz--ZBrh-g0eE7kSmWKWf_jTzpcKPcpzgaUOK3CJ-rjJ8U7cEGGy10mpbyoz8mAuf8WwH8HX_UPl0niRtOk2xVMA2Qrtf3AwjFjcjBuJu31pe3ElGTYZ4DRsD_p22c1mnnnL7n8cQ1iE6VRcsk7GcjcdU3VLlTx_cJtV6chgkjaqZGVMSeklRh3tTab762t9oO9WvSAVI4Zd2vV9JTzj0iQ",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAdy2ggTmQ2MP1FEdpFSgYCRZ_Vw6ElaktdopdtNd6dSWiATwAFCsSrGzcgd41pCj90Pz_1tX0uSqmX4XEZ1Lb55nyEbTGtV_ClZRssf1VCyINwWeiCedlIfih9HNIUJufYqLjW-rQbHHvct_3aUwDRpIp6ZUnswqPZOZnImUofnBfY8hBphGFzHnKEXVrRd0aCbuOTz-vx0iIolfB4fQOX7cusvJuFpahG203UDDpPTzRU9sQXip6JxA",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAK5bTp3kIHs9cYmgn_DInlseQAXK-MinADrHPlsSCZAXau-iB0cp5khU_tSrBePJ_3_EIO1xiTSfVSABolUp_mfiabWJS5AAfOC8ZoJiqQx0aiUqQLTpeDTlU0OcG27XwQEpbiR184f_5c2Xhq8gOOhx1MoFUrc-nZcIwmwEtsrQsjfJPYPAchhq0ux2GnhwW0aSYKwiH6gsr8Rr1zzvv3VSCb3Ai6OS21CN51JGxQIFtjlRYtW8Dqg",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAoajfOJ6G9ABwdEZ5U_84Oa6beGzvqka6Mv538HwYRqyvfSyRdScRw1LU94_NIu77BKO301trAGsKVreNYJHB4N7d0u7f3yiQY8acKxV8zqKIB-4TwZrKom4IGm5awUwIRKHkU0RiQI4w0Szgipkhxo9DycNWt3pMIFrVjr9GhuOD1MKYZ2Y3GpG-anU-D17jleddB0LkW9fnjYHRFTP1YUJ_52Bajp4FWVcdehGI6oLHG8taH-71mFw",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAP6CBk6HDk1C2STyr5qIH0Ec2Cs4hjL7UiJEGt5_851xtoFJMkumW7rj-jzHGTPaI9kGBCS2tiFGkOZYwwGDOZFRtMRhpOjt3C2GV-5Es1t1MP4hIoR1NUgCX5LuA-CW646AVHS5lYUAtqq8jfkHdVs96HW4Zd17yzhf1S8Fb3eUopQGDEjVQvlrxjfdpM2xlv3ZvE08XloRFDdJd12gjrVI122aPlxl7TCC9-8rzwoXikRjugdpxcoA",
];

export const interiorServices: MockupCard[] = [
  { title: "Kitchen Set & Island", category: "01 / Dapur", description: "Kitchen set minimalis HPL/Duco anti rayap dengan solid surface quartz dan hardware soft-close.", image: mockupImages[2] },
  { title: "Living Room & Credenza", category: "02 / Ruang Keluarga", description: "Panel backdrop TV gantung, rak pajangan terintegrasi warm lighting, dan konsol tanpa kabel terlihat.", image: mockupImages[3] },
  { title: "Bedroom & Wardrobe Suite", category: "03 / Kamar Tidur", description: "Walk-in wardrobe custom, hidden storage, dan ambience lighting untuk ruang istirahat yang tenang.", image: mockupImages[4] },
  { title: "Custom Built-in & Partisi", category: "04 / Custom", description: "Partisi fungsional dan built-in furniture yang mengikuti dimensi ruang secara presisi.", image: mockupImages[5] },
  { title: "Full Home Interior End-to-End", category: "05 / Full Interior", description: "Satu tim untuk merancang, memproduksi, dan memasang seluruh kebutuhan interior hunian.", image: mockupImages[6] },
];

export const exteriorServices: MockupCard[] = [
  { title: "Modern Canopy", category: "01 / Canopy", description: "Kanopi baja dan kaca dengan struktur ramping, kuat, dan menyatu dengan fasade hunian.", image: mockupImages[7] },
  { title: "Gate & Pagar Minimalis", category: "02 / Gerbang", description: "Pagar powder-coat dan laser-cut dengan detail rapi untuk keamanan sekaligus karakter fasade.", image: mockupImages[8] },
  { title: "Railing Tangga & Balkon", category: "03 / Railing", description: "Railing custom untuk tangga dan balkon dengan perhitungan struktur yang aman.", image: mockupImages[9] },
  { title: "Rangka & Mezzanine Custom", category: "04 / Struktur", description: "Fabrikasi rangka dan mezzanine yang siap dipasang oleh tim workshop berpengalaman.", image: mockupImages[10] },
];

export const portfolioItems: MockupCard[] = [
  { title: "Warm Minimal Kitchen", category: "Kitchen Set", description: "Bekasi · HPL Walnut + White Oak Quartz", image: mockupImages[1] },
  { title: "Minimalist Steel Canopy", category: "Canopy", description: "Jakarta Selatan · Powder-Coated Steel", image: mockupImages[7] },
  { title: "Modern Bedroom Storage", category: "Bedroom", description: "Tangerang · Smoked Glass & Walnut", image: mockupImages[4] },
  { title: "Fluted Oak Credenza", category: "Living Room", description: "BSD City · Solid Oak & Microcement", image: mockupImages[3] },
  { title: "Laser-Cut Sliding Gate", category: "Pagar", description: "Pondok Indah · Steel & Powder Coat", image: mockupImages[8] },
  { title: "Tempered Glass Railing", category: "Railing", description: "Cipete · Structural Glass & Teak", image: mockupImages[9] },
  { title: "Steel Mezzanine & Staircase", category: "Metalwork", description: "Bandung · Heavy Duty Steel", image: mockupImages[10] },
  { title: "Compact Island & Wet Kitchen", category: "Kitchen Set", description: "Kelapa Gading · Solid Surface & Sage Duco", image: mockupImages[5] },
  { title: "Cantilever Carport Shelter", category: "Canopy", description: "Bintaro · Solar Glass Roof", image: mockupImages[6] },
  { title: "Sun-Shading Steel Facade", category: "Metalwork", description: "Menteng · Perforated Aluminium Panels", image: mockupImages[0] },
  { title: "Master Suite Bed Frame", category: "Bedroom", description: "Puri Indah · Stained Ash Textured Finish", image: mockupImages[4] },
  { title: "Minimalist Hollow Steel Gate", category: "Pagar", description: "Depok · Electrostatic Powder Coat", image: mockupImages[8] },
];

export const faqItems = [
  ["Berapa estimasi waktu pengerjaan proyek interior/eksterior?", "Untuk interior custom, durasi rata-rata berkisar 14–25 hari kerja di workshop, dilanjutkan 2–4 hari instalasi bersih di lokasi. Pengerjaan kanopi atau pagar berkisar 10–18 hari kerja tergantung kompleksitas."],
  ["Apakah melayani pemesanan di luar area Jabodetabek?", "Ya, kami menangani proyek hunian dan villa untuk area Bandung, Serang, Karawang, hingga Cirebon. Penyesuaian biaya survei dan logistik akan dijelaskan transparan di awal penawaran."],
  ["Bagaimana sistem dan termin pembayaran pengerjaan?", "Kami menerapkan termin terstruktur: DP 40% saat SPK dan approval desain, 40% saat fabrikasi siap kirim, dan pelunasan 20% setelah serah terima instalasi serta checklist garansi."],
  ["Apakah bisa custom model dari referensi Pinterest atau arsitek pribadi?", "Sangat bisa. Tim teknik akan mengaudit dimensi struktural dan merekomendasikan kombinasi material yang paling efisien serta tahan lama."],
];
