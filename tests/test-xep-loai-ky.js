const src = require('fs').readFileSync('apps-script/XepLoai.gs','utf8');
// lấy phần thuần logic, bỏ các hàm chạm SpreadsheetApp
eval(src.slice(0, src.indexOf('function tinhLaiTatCa')));
eval(src.slice(src.indexOf('function xepLoaiMotKy'), src.indexOf('/** Chốt 1 tháng')));

let pass=0, fail=0;
function t(ten, ds, mong){
  const kq = xepLoaiMotKy(ds);
  if(kq===mong){pass++; console.log('  ok  ',ten,'->',kq);}
  else {fail++; console.log('  FAIL',ten,'-> got',kq,'muốn',mong);}
}
console.log('--- xếp loại học kỳ (HK1 = T9,10,11,12,1) ---');
t('Tốt cả 5 tháng', ['TOT','TOT','TOT','TOT','TOT'], 'TOT');
t('1 tháng Đạt ở T9 (2 tháng đầu)', ['DAT','TOT','TOT','TOT','TOT'], 'TOT');
t('1 tháng Đạt ở T12 (cuối kỳ)', ['TOT','TOT','TOT','DAT','TOT'], 'KHA');
t('Toàn Khá', ['KHA','KHA','KHA','KHA','KHA'], 'KHA');
t('Khá + Tốt lẫn lộn', ['KHA','TOT','KHA','TOT','KHA'], 'KHA');
t('1 CĐ ở T10 (đầu kỳ)', ['TOT','CHUA_DAT','TOT','TOT','TOT'], 'KHA');
t('1 CĐ ở T1 (cuối kỳ)', ['TOT','TOT','TOT','TOT','CHUA_DAT'], 'DAT');
t('2 CĐ', ['CHUA_DAT','CHUA_DAT','TOT','TOT','TOT'], 'DAT');
t('Toàn CĐ', ['CHUA_DAT','CHUA_DAT','CHUA_DAT','CHUA_DAT','CHUA_DAT'], 'CHUA_DAT');
t('Tiến bộ dần', ['DAT','DAT','KHA','TOT','TOT'], 'KHA');
t('Chưa có dữ liệu', [null,null,null,null,null], null);
t('Mới có T9', ['TOT',null,null,null,null], 'TOT');

console.log('\n--- hạ bậc ---');
const hb=(b,n)=>haBac(b,n);
console.log('  TOT hạ 1 =',hb('TOT',1),'| hạ 2 =',hb('TOT',2),'| hạ 3 =',hb('TOT',3),'| hạ 9 =',hb('TOT',9));
console.log('  thấp hơn(TOT,KHA) =',thapHon('TOT','KHA'));

console.log('\n'+pass+' đạt, '+fail+' lỗi');
process.exit(fail?1:0);
