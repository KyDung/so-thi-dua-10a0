// Web mở lên phải vào đúng tuần nào?
function tuanMoiNhat(ds, homNay){
  ds = ds.filter(t=>t.MaTuan).slice().sort((a,b)=> a.TuNgay < b.TuNgay ? -1 : 1);
  if(!ds.length) return null;
  let chon = ds.find(t => t.TuNgay <= homNay && homNay <= t.DenNgay);
  if(!chon){ const daQua = ds.filter(t => t.TuNgay <= homNay);
             chon = daQua.length ? daQua[daQua.length-1] : ds[0]; }
  return chon;
}
const T=(so,tu,den)=>({MaTuan:'T'+tu,SoTuan:so,TuNgay:tu,DenNgay:den});
let pass=0,fail=0;
const kt=(ten,got,mong)=>{ const g=got?got.SoTuan:null;
  if(g===mong){pass++;console.log('  ok   '+ten.padEnd(46)+'-> tuần '+g);}
  else{fail++;console.log('  FAIL '+ten.padEnd(46)+'-> '+g+' (mong '+mong+')');} };

console.log('=== Tạo trang dần theo tuần (cách dùng bình thường) ===');
const a=[T(1,'2026-08-31','2026-09-06'),T(2,'2026-09-07','2026-09-13'),
         T(3,'2026-09-14','2026-09-20'),T(4,'2026-09-21','2026-09-27')];
kt('Hôm nay nằm trong tuần 3', tuanMoiNhat(a,'2026-09-16'), 3);
kt('Hôm nay là ngày cuối tuần 4', tuanMoiNhat(a,'2026-09-27'), 4);
kt('Hôm nay sau tuần cuối (chưa tạo trang mới)', tuanMoiNhat(a,'2026-10-02'), 4);
kt('Hôm nay trước khi khai giảng', tuanMoiNhat(a,'2026-08-20'), 1);

console.log('\n=== Lỡ tạo sẵn trang cho cả năm (lỗi cũ: nhảy vào tháng 5) ===');
const b=[]; let d=new Date(2026,7,31);
for(let i=1;i<=39;i++){ const tu=new Date(d); const den=new Date(tu); den.setDate(den.getDate()+6);
  const f=x=>x.toISOString().slice(0,10); b.push(T(i,f(tu),f(den))); d.setDate(d.getDate()+7); }
kt('39 trang tạo sẵn, hôm nay 30/9', tuanMoiNhat(b,'2026-09-30'), 5);
console.log('   (trước đây lấy "ngày lớn nhất" -> ra tuần 39, tháng 5/2027)');

console.log('\n=== Bỏ qua tuần nghỉ Tết ===');
const c=[T(22,'2027-01-25','2027-01-31'), T(23,'2027-02-15','2027-02-21')];
kt('Đang trong kỳ nghỉ Tết (5/2)', tuanMoiNhat(c,'2027-02-05'), 22);
kt('Đã đi học lại (17/2)', tuanMoiNhat(c,'2027-02-17'), 23);

console.log('\n=== Chưa có trang tuần nào ===');
kt('Sheet trống', tuanMoiNhat([],'2026-09-30'), null);

console.log('\n'+pass+' đạt, '+fail+' lỗi');
process.exit(fail?1:0);
