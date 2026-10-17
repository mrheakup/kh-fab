/* ================= KH Fab — reference data: mining machines, bucket types, parts we can fabricate =================
   Figures from manufacturer / dealer specification pages (see `src`). Values change by configuration and market —
   always confirm against the machine's own spec sheet before quoting. */
const MCAT = [
  ['lhd', 'Далд уурхайн ачигч (LHD)'],
  ['exc', 'Экскаватор, шанагат'],
  ['wl', 'Дугуйт ачигч'],
  ['truck', 'Өөрөө буулгагч'],
  ['dozer', 'Бульдозер']
];
// w: operating / empty weight (t) · gvw: gross (t) · kW: engine · cap: [min, max] m³ (bucket / body heaped) · std: standard bucket m³
// pay: payload / tramming capacity (t) · bw: bucket width (mm)
const MACHINES = [
  // ---- underground LHD
  { id: 'lh515i', make: 'Sandvik', model: 'Toro LH515i', cat: 'lhd', pay: 15, w: 39.6, kW: 265, cap: [6.3, 7.5], std: 6.3, bw: 2740, note: 'Шанага: G.E.T. 6.3 м³ (2740 мм), ир шүдгүй 6.8 м³, G.E.T. 7.5 м³ (3066 мм), түлхэгчтэй 6.3 м³ (2830 мм). Хөдөлгүүр Volvo TAD1181VE.', src: ['https://www.mining.sandvik/en/products/equipment/loaders/lh515i-underground-loader/', 'https://www.mining.sandvik/siteassets/product-documents/loaders/diesel-loaders/lh515i-technical-specifications-english.pdf'] },
  { id: 'lh517i', make: 'Sandvik', model: 'Toro LH517i', cat: 'lhd', pay: 17, w: 48.4, kW: null, cap: [7.0, 9.1], std: null, bw: null, note: 'Машины хэмжээ 11 500 × 3 100 × 2 800 мм.', src: ['https://www.mining.sandvik/en/products/equipment/loaders/lh517i-underground-lhd'] },
  { id: 'lh621', make: 'Sandvik', model: 'LH621 / LH621i', cat: 'lhd', pay: 21, w: 56.8, kW: 352, cap: [8.0, 10.7], std: 8.0, bw: null, note: 'Шанага 8.0 (стандарт), 9.0, 9.8, 10.7 м³. Хөдөлгүүр Volvo TAD1344VE 352 кВт.', src: ['https://www.mining.sandvik/globalassets/products/underground-loaders-and-trucks/pdf/lh621-specification-sheet-english.pdf'] },
  { id: 'lh410', make: 'Sandvik', model: 'Toro LH410', cat: 'lhd', pay: 10, w: null, kW: null, cap: null, std: null, bw: null, note: '10 т даацын ангилал.', src: ['https://www.e-mj.com/breaking-news/sandvik-launches-new-toro-lh410-loader/'] },
  { id: 'st14', make: 'Epiroc', model: 'Scooptram ST14', cat: 'lhd', pay: 14, w: 39.1, kW: 250, cap: [4.7, 7.8], std: null, bw: 3040, note: 'Стандарт шанага 4.7–7.8 м³ (материалын нягт 3.0–1.8 т/м³), EOD түлхэгчтэй 6.0 м³ (2850 мм).', src: ['https://app.epiroc.com/content/dam/epiroc/underground-mining-and-tunneling/lhd/diesel-scooptram/st14/9869%200057%2001g%20Scooptram%20ST14%20Technical%20Specification%20Eng_lowres.pdf'] },
  { id: 'st18', make: 'Epiroc', model: 'Scooptram ST18', cat: 'lhd', pay: 17.5, w: 51.5, kW: 352, cap: [6.3, 9.7], std: null, bw: 3330, note: 'Шанага 6.3, 6.7, 7.3, 7.9, 8.8, 9.7 м³; EOD 7.1, 7.4 м³. Tier 3 хувилбар 336 кВт.', src: ['https://app.epiroc.com/content/dam/epiroc/underground-mining-and-tunneling/lhd/diesel-scooptram/st18/9869%200065%2001e_Scooptram%20ST18%20technical%20specification_english.pdf'] },
  { id: 'r1700', make: 'Caterpillar', model: 'R1700', cat: 'lhd', pay: 15.0, w: 43.2, kW: 257, cap: [5.7, 8.6], std: null, bw: null, note: 'Даац 33 069 lb, жин 95 189 lb, 345 hp (Stage V).', src: ['https://wheelercat.com/new/machines/underground-hard-rock/r1700-underground-mining-loader'] },
  { id: 'r2900g', make: 'Caterpillar', model: 'R2900G', cat: 'lhd', pay: 17.2, w: 50.2, kW: 299, cap: [6.3, 8.9], std: null, bw: null, note: 'Дөрвөн хэмжээний шанагатай.', src: ['https://trakindo.co.id/r2900g-18234906'] },
  // ---- excavators / shovels
  { id: 'pc200', make: 'Komatsu', model: 'PC200LC-8M0', cat: 'exc', pay: null, w: 21.96, kW: 103, cap: [0.97, 0.97], std: 0.97, bw: null, note: 'Барилга, уурхайн туслах ажлын түгээмэл экскаватор.', src: ['https://www.komatsu.com/en-au/products/equipment/excavators/crawler-excavators/pc200lc-8m0'] },
  { id: 'pc300', make: 'Komatsu', model: 'PC300-8M0', cat: 'exc', pay: null, w: 33.8, kW: 187, cap: [1.68, 1.68], std: 1.68, bw: null, note: 'Стандарт GP шанага 2.2 yd³ ≈ 1.68 м³.', src: ['https://www.ritchiespecs.com/model/komatsu-pc300-8m0-hydraulic-excavator'] },
  { id: 'pc1250', make: 'Komatsu', model: 'PC1250-11', cat: 'exc', pay: null, w: 123.6, kW: 565, cap: [4.1, 7.3], std: null, bw: null, note: '', src: ['https://www.komatsu.com/en-au/products/equipment/excavators/crawler-excavators/pc1250-11'] },
  { id: 'pc2000', make: 'Komatsu', model: 'PC2000-11', cat: 'exc', pay: null, w: 206.1, kW: 780, cap: [13.7, 13.7], std: 13.7, bw: null, note: 'Хуудсанд нэг шанагын багтаамж 13.7 м³ заасан.', src: ['https://www.komatsu.com/en-au/products/equipment/excavators/crawler-excavators/pc2000-11'] },
  { id: 'ex1200', make: 'Hitachi', model: 'EX1200-7', cat: 'exc', pay: null, w: 117, kW: 567, cap: [5.2, 7.5], std: 5.2, bw: null, note: 'Backhoe 5.2 м³ (ISO 7451); урд шанага 5.9–7.5 м³; BE-Front 7.0–8.0 м³. Cummins QSK23.', src: ['https://hitachicm.com/global/en/solutions/mining-business/products/large-excavators/product.ex1200-7'] },
  { id: 'ex2600', make: 'Hitachi', model: 'EX2600-7', cat: 'exc', pay: null, w: 260, kW: 1119, cap: [15.0, 19.5], std: null, bw: null, note: 'Backhoe 18.0–19.5 м³; урд шанага 15.0–16.5 м³. MTU хувилбар 1150 кВт.', src: ['https://hitachicm.com/global/en/solutions/mining-business/products/large-excavators/product.ex2600-7'] },
  { id: 'r9400', make: 'Liebherr', model: 'R 9400 G6', cat: 'exc', pay: null, w: 345.5, kW: 1250, cap: [22, 24], std: 24, bw: null, note: 'Backhoe 24 м³, урд шанага 22 м³ (1.8 т/м³). Урд шанагатай 353 т.', src: ['https://www.liebherr.com/en/can/products/mining-equipment/mining-excavators/details/r9400.html'] },
  { id: 'cat6015', make: 'Caterpillar', model: '6015 / 6015B', cat: 'exc', pay: null, w: 140, kW: 606, cap: [8.1, 8.1], std: 8.1, bw: null, note: 'Backhoe шанага 8.1 м³ (1:1).', src: ['https://www.cat.com/en_AU/products/new/equipment/hydraulic-mining-shovels/hydraulic-mining-shovels/130421.html'] },
  // ---- wheel loaders
  { id: 'wa600', make: 'Komatsu', model: 'WA600-8', cat: 'wl', pay: null, w: 57.46, kW: 395, cap: [6.4, 7.8], std: 7.8, bw: 3805, note: '', src: ['https://www.komatsu.com/en-au/products/equipment/wheel-loaders/wa600-8-lc'] },
  { id: 'wa900', make: 'Komatsu', model: 'WA900-8R', cat: 'wl', pay: null, w: 116.4, kW: 672, cap: [11.5, 13.0], std: null, bw: null, note: '', src: ['https://www.komatsu.com/en-br/products/equipment/wheel-loaders/surface-mining-wheel-loaders/wa900-8r'] },
  { id: 'wa1200', make: 'Komatsu', model: 'WA1200-6', cat: 'wl', pay: null, w: 216.4, kW: 1316, cap: [20, 40], std: 20, bw: null, note: 'Стандарт шанага 20 м³; хуудсанд 21.5–40 м³ хүрээ мөн заасан (материалаас хамаарна).', src: ['https://www.komatsu.com/en-au/products/equipment/wheel-loaders/wa1200-6'] },
  { id: 'cat992k', make: 'Caterpillar', model: '992K', cat: 'wl', pay: null, w: 99.8, kW: 607, cap: [10.7, 12.3], std: null, bw: null, note: 'Өндөр өргөлттэй хувилбар 100.6 т.', src: ['https://petersoncat.com/products/new/large-wheel-loaders/992k'] },
  { id: 'cat994k', make: 'Caterpillar', model: '994K', cat: 'wl', pay: null, w: 242.6, kW: 1297, cap: [19.1, 24.5], std: null, bw: null, note: '', src: ['https://ritchiespecs.com/model/caterpillar-994k-wheel-loader'] },
  // ---- haul trucks
  { id: 'hd785', make: 'Komatsu', model: 'HD785-7', cat: 'truck', pay: 91.7, w: null, gvw: 163.8, kW: 879, cap: [60, 60], note: 'Тэвш 40 м³ тэгш, 60 м³ овоолсон (2:1).', src: ['https://www.komatsu.com/en-au/products/equipment/dump-trucks/mechanical-rigid-trucks/hd785-7'] },
  { id: 'cat777g', make: 'Caterpillar', model: '777G', cat: 'truck', pay: 96.6, w: null, gvw: 164.7, kW: 711, cap: [60.2, 64.1], note: 'Dual Slope 60.2 м³, X Body 64.1 м³. Доторлогоотой үед даац 89–92 т.', src: ['https://www.zeppelin.cz/fileadmin/helios_files/JPG/ToM/OHT/777G/777G-RDR_AEXQ2671-00_Tech_Specs_2020.pdf'] },
  { id: 'belaz75131', make: 'БелАЗ', model: '75131', cat: 'truck', pay: 130, w: 107.1, gvw: null, kW: 1194, cap: [67, 67], note: 'Cummins KTA50-C.', src: ['https://www.lectura-specs.com/en/model/construction-machinery/rigid-dump-trucks-belaz/75131-11738566'] },
  { id: 'cat793f', make: 'Caterpillar', model: '793F', cat: 'truck', pay: 231, w: null, gvw: 386.0, kW: 1848, cap: [159, 191], note: 'HP тэвш 162–191 м³, MSD II 159–190 м³.', src: ['https://kz.borusancat.com/en/equipment/new/470/off-highway-trucks/18092621/793f'] },
  { id: 'k830e', make: 'Komatsu', model: '830E-5', cat: 'truck', pay: 230, w: null, gvw: 408.9, kW: 2014, cap: [158, 158], note: 'Цахилгаан хөтлөгчтэй. 2700 hp сонголттой үед 2014 кВт.', src: ['https://www.komatsu.com/en-au/products/equipment/dump-trucks/electric-drive-mining-trucks/830e-5'] },
  { id: 'k930e', make: 'Komatsu', model: '930E-5', cat: 'truck', pay: 304, w: null, gvw: 521.6, kW: 2014, cap: [171, 211], note: 'Тэвш 171 м³ тэгш, 211 м³ овоолсон.', src: ['https://www.komatsu.com/en-au/products/equipment/dump-trucks/electric-drive-mining-trucks/930e-5'] },
  { id: 'cat797f', make: 'Caterpillar', model: '797F', cat: 'truck', pay: 363, w: null, gvw: 623.7, kW: 2828, cap: [252, 252], note: '', src: ['https://kz.borusancat.com/en/equipment/new/470/off-highway-trucks/18093014/797f'] },
  // ---- dozers
  { id: 'catd10', make: 'Caterpillar', model: 'D10', cat: 'dozer', pay: null, w: 70.3, kW: 449, cap: [18.5, 22], note: 'Ир: 10SU 18.5 м³, 10U 22 м³ (SAE J1265).', src: ['https://www.westrac.com.au/products/d10-115080'] },
  { id: 'd375a', make: 'Komatsu', model: 'D375A-8', cat: 'dozer', pay: null, w: 72.9, kW: 455, cap: [22, 22], note: '', src: ['https://www.komatsu.com/en-au/products/equipment/dozers/surface-mining-dozers/d375a-8'] }
];
// what a fabrication shop typically makes or repairs for each class
const MFAB = {
  lhd: ['Шанага бүтнээр (ир, хажуу, ёроол, нуруу)', 'Ирний хавтан, хажуугийн ир', 'Ёроол ба хажуугийн элэгдлийн хавтан, тууз', 'Өсгийн хамгаалалт (heel shroud)', 'Түлхэгчтэй шанагын түлхүүр хавтан'],
  exc: ['Шанага (GP, HD, хадны, хэт хүнд)', 'Ирний хавтан, хажуугийн хамгаалалт', 'Элэгдлийн тууз, шанагын доторлогоо', 'Чих, холбоосны хавтан, бут', 'Сум (boom) ба гарын засварын хавтан'],
  wl: ['Шанага (ерөнхий, хадны, өндөр буулгалттай)', 'Ирний хавтан (cutting edge) ба хэсэгчилсэн ир', 'Элэгдлийн хавтан, хажуугийн хамгаалалт', 'Чих, холбоосны хавтан'],
  truck: ['Тэвшний ёроол, хажуугийн доторлогоо (Hardox)', 'Тэвшний арын ирмэг, хамгаалалт', 'Чулуу гаргагч (rock ejector), шавар хаалт', 'Шат, тавцан, бариул'],
  dozer: ['Ирний хавтан, булангийн ир (end bit)', 'Ирний элэгдлийн хавтан', 'Хамгаалалтын хавтан (guard)', 'Хагалуурын шүдний хамгаалалт']
};
// bucket types — general engineering guidance
const BTYPES = [
  { id: 'gp', name: 'Ерөнхий зориулалтын (GP)', for: 'exc wl', use: 'Сул хөрс, шороо, элс, хайрга ачих.', build: 'Нимгэн хавтан, шүдтэй ир. Элэгдлийн хамгаалалт бага.', mat: 'Бүтэц: S355. Ир: Hardox 400/450.' },
  { id: 'hd', name: 'Хүнд даацын (HD)', for: 'exc wl', use: 'Нягт хөрс, шавар, жижиг чулуу, элэгдэл дунд зэрэг.', build: 'Зузаан ир, хажуугийн ир, ёроолын элэгдлийн тууз.', mat: 'Бүтэц: S355/Strenx. Элэгдэл: Hardox 450.' },
  { id: 'rock', name: 'Хадны (Rock)', for: 'exc wl', use: 'Тэсэлсэн чулуу, хүдэр.', build: 'Зузаан ирний хавтан (spade эсвэл шулуун), хажуугийн хамгаалалт, ёроол бүтэн доторлогоотой, өсгийн хамгаалалт.', mat: 'Hardox 450/500 элэгдлийн хэсэг.' },
  { id: 'xhd', name: 'Хэт хүнд (Severe / XHD)', for: 'exc wl lhd', use: 'Маш элэгдэлтэй, нүдлэгтэй хүдэр, кварцит.', build: 'Бүх гадаргуу доторлогоотой, chocky bar эсвэл wear button, давхар ир.', mat: 'Hardox 500/600 доторлогоо.' },
  { id: 'coal', name: 'Нүүрс, хөнгөн материал', for: 'exc wl', use: 'Нүүрс, мод, үр тариа зэрэг нягт багатай материал.', build: 'Том багтаамжтай, өргөн, хавтан нимгэн.', mat: 'S355, ир Hardox 400.' },
  { id: 'skel', name: 'Шигшүүр (Skeleton)', for: 'exc wl', use: 'Чулуу ялгах, шигших.', build: 'Ёроол, нуруу нь сараалжтай.', mat: 'S355 + Hardox сараалж.' },
  { id: 'ditch', name: 'Суваг цэвэрлэгч', for: 'exc', use: 'Налуу засах, суваг цэвэрлэх.', build: 'Өргөн, гүехэн, шүдгүй шулуун ир, ус гаргах нүхтэй.', mat: 'S355, ир Hardox 400.' },
  { id: 'trench', name: 'Нарийн суваг (Trenching)', for: 'exc', use: 'Кабель, хоолойн суваг.', build: 'Нарийн, гүн, шүдтэй.', mat: 'S355, Hardox 450 ир.' },
  { id: 'fs', name: 'Урд шанага (Face shovel / Loading shovel)', for: 'exc', use: 'Том уурхайн экскаваторын ачилт.', build: 'Доороос нээгддэг (clamshell) эсвэл хөмрөх; маш зузаан ир, том багтаамж.', mat: 'Strenx бүтэц, Hardox 500 элэгдэл.' },
  { id: 'lhdget', name: 'LHD шанага — шүдтэй (G.E.T.)', for: 'lhd', use: 'Тэсэлсэн хүдэр, далд уурхай.', build: 'Хавтгай өргөн ёроол, богино нуруу, солигддог шүд/хамгаалалт (Sandvik Shark, Epiroc).', mat: 'Hardox 450/500, ир 60–100 мм.' },
  { id: 'lhdbare', name: 'LHD шанага — шүдгүй ир (Bare lip)', for: 'lhd', use: 'Нарийн хүдэр, цэвэрлэгээ, зам засвар.', build: 'Шулуун ирний хавтан, багтаамж арай их.', mat: 'Hardox 500 ир.' },
  { id: 'lhdeod', name: 'LHD түлхэгчтэй шанага (EOD)', for: 'lhd', use: 'Нам таазтай газар, машинд буулгах.', build: 'Дотор нь түлхэгч хавтан — шанага хөмрөхгүйгээр буулгана.', mat: 'Hardox 450 + түлхэгчийн чиглүүлэгч.' },
  { id: 'hdump', name: 'Өндөр буулгалттай / хажуу буулгагч', for: 'wl', use: 'Өндөр тэвшинд ачих, нарийн газар.', build: 'Нэмэлт холбоос эсвэл хажуу тийш хөмрөх механизм.', mat: 'S355, Hardox 450.' }
];
// loose densities for bucket sizing — typical handbook-level values
const DENS = [['Хөрс, шороо (сул)', 1.5], ['Хайрга', 1.8], ['Тэсэлсэн чулуу', 1.8], ['Төмрийн хүдэр', 2.3], ['Зэсийн хүдэр', 2.0], ['Нүүрс', 0.9], ['Шавар (нойтон)', 1.7], ['Элс (хуурай)', 1.5]];
// public sources of DXF / CAD files (user downloads under their own account; licences differ per file)
const EXTLIBS = [
  { name: 'GrabCAD', url: 'https://grabcad.com/library', kind: '3D CAD (STEP, IGES, Inventor)', lic: 'Ихэнх нь хувийн хэрэглээнд. Арилжаанд ашиглахад зохиогчийн зөвшөөрөл хэрэгтэй. Брэндийн загварыг арилжаанд ашиглахгүй.' },
  { name: '3axis.co', url: 'https://3axis.co/', kind: 'DXF, SVG (лазер/CNC)', lic: 'Файл бүрийн лицензийг шалгана (License хуудас).' },
  { name: 'Scan2CAD', url: 'https://www.scan2cad.com/free-downloads/dxf/', kind: 'DXF', lic: 'Гишүүдэд зориулсан багц, нөхцөлийг шалгана.' },
  { name: 'Traceparts', url: 'https://www.traceparts.com/', kind: 'Стандарт эд анги (боолт, холхивч) 3D', lic: 'Үйлдвэрлэгчийн каталог — бүртгэлтэй, үнэгүй.' },
  { name: 'McMaster-Carr', url: 'https://www.mcmaster.com/', kind: 'Стандарт эд анги 2D/3D', lic: 'Каталогийн эд ангид зориулсан.' }
];
