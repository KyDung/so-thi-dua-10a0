// Kiểm tra cách tính điểm lưới khớp với ảnh sổ giấy (tuần 3, tháng 9/2026)
const DIEM = { CONG: 1, NHO_TRUONG: -2, NHO_LOP: -1, HB_TRUONG: -6, HB_LOP: -2, HK_YEU: -12 };
const tachMuc = s => String(s||'').split(/[,;\n]+/).map(x=>x.trim()).filter(x=>x.length);
const tinhDong = o => Object.keys(DIEM).reduce((t,k)=> t + tachMuc(o[k]).length * DIEM[k], 0);

// Chép đúng từ ảnh
const so = [
  ['Học sinh thử 1', { CONG:'Hoá*, 10 Toán, 10 Toán', NHO_LOP:'MTT (Anh)' },  2],
  ['Học sinh thử 2',  { CONG:'Anh+1, Anh+1' },                                  2],
  ['Học sinh thử 3',  { CONG:'9 sinh', NHO_LOP:'MTT (Anh)' },                   0],
  ['Học sinh thử 4',         { NHO_LOP:'MTT (Anh)' },                                 -1],
  ['Học sinh thử 5',        {},                                                       0],
  ['Học sinh thử 6',           {},                                                       0],
  ['Học sinh thử 7',       {},                                                       0],
  ['Học sinh thử 8',{ CONG:'Anh+1' },                                       1],
  ['Học sinh thử 9',      { CONG:'Anh+1, 9 sinh' },                                 2],
  ['Học sinh thử 10',    {},                                                       0],
  ['Học sinh thử 11',          { CONG:'Hoá*, 9 sinh, 10 Toán', NHO_LOP:'MTT (Anh)' },    2],
  ['Học sinh thử 12',  {},                                                       0],
];

let pass=0, fail=0, tong=0;
console.log('=== Đối chiếu từng dòng với ảnh sổ ===');
so.forEach(([ten,o,mong])=>{
  const got = tinhDong(o); tong += got;
  if (got===mong) { pass++; console.log('  ok   '+ten.padEnd(24)+' = '+String(got).padStart(3)); }
  else { fail++; console.log('  FAIL '+ten.padEnd(24)+' = '+got+' (sổ ghi '+mong+')'); }
});

console.log('\n=== Dòng tổng cuối sổ ===');
const coSan = 5, thuong = 5;
const kt = (ten, got, mong) => {
  if (got===mong) { pass++; console.log('  ok   '+ten.padEnd(24)+' = '+got); }
  else { fail++; console.log('  FAIL '+ten.padEnd(24)+' = '+got+' (sổ ghi '+mong+')'); }
};
kt('TỔNG', tong, 8);
kt('ĐIỂM CÓ SẴN', coSan, 5);
kt('ĐIỂM TỔNG', tong+coSan+thuong, 18);

console.log('\n=== Tách mục ===');
kt('"a, b, c" -> 3 mục', tachMuc('a, b, c').length, 3);
kt('ô trống -> 0 mục', tachMuc('').length, 0);
kt('"a,,  ,b" -> 2 mục', tachMuc('a,,  ,b').length, 2);
kt('xuống dòng cũng tách', tachMuc('a\nb\nc').length, 3);

console.log('\n=== Nhóm cột -> hạnh kiểm ===');
const NHOM = { CONG:'', NHO_TRUONG:'NHO', NHO_LOP:'NHO', HB_TRUONG:'HA_BAC', HB_LOP:'HA_BAC', HK_YEU:'CHUA_DAT' };
kt('lỗi trường -2đ là lỗi nhỏ', NHOM.NHO_TRUONG, 'NHO');
kt('hạ bậc lớp -2đ là hạ bậc', NHOM.HB_LOP, 'HA_BAC');
kt('HK yếu -12đ là chưa đạt', NHOM.HK_YEU, 'CHUA_DAT');

console.log('\n'+pass+' đạt, '+fail+' lỗi');
process.exit(fail?1:0);
