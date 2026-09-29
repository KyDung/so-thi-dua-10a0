// Dọn lịch sử: chỉ giữ dòng HOAT_DONG, xoá hẳn DA_THAY / DA_XOA
const H=['Id','MaHS','Ngay','MaTuan','Thang','HocKy','Loai','Ma','Diem','MoTa','NguoiNhap','ThoiGian','TrangThai'];
const iTT=H.indexOf('TrangThai'), iId=H.indexOf('Id');
const don = vals => { const giu=vals.filter(r=>r[iTT]==='HOAT_DONG'&&r[iId]);
                      return {giu, soXoa: vals.length-giu.length}; };
const R=(id,mota,tt)=>{const r=new Array(H.length).fill('');r[iId]=id;r[H.indexOf('MoTa')]=mota;r[iTT]=tt;return r;};

let pass=0,fail=0;
const kt=(ten,got,mong)=>{ if(JSON.stringify(got)===JSON.stringify(mong)){pass++;console.log('  ok   '+ten.padEnd(48)+'= '+JSON.stringify(got));}
  else{fail++;console.log('  FAIL '+ten.padEnd(48)+'= '+JSON.stringify(got)+' (mong '+JSON.stringify(mong)+')');} };

console.log('=== Đúng tình huống vừa xảy ra: 8 dòng test, tất cả DA_THAY ===');
const a=[R('e4084e14','Hoá*','DA_THAY'),R('b73585ce','10 Toán','DA_THAY'),
         R('1f9c3315','10 Toán','DA_THAY'),R('5d0cb27b','MTT (Anh)','DA_THAY'),
         R('fbc5db9d','MTT (Anh)','DA_THAY'),R('1841c19e','Hoá*','DA_THAY'),
         R('47aee35a','10 Toán','DA_THAY'),R('85cdb0f4','Không hát quốc ca','DA_THAY')];
let r=don(a);
kt('Số dòng bị xoá', r.soXoa, 8);
kt('Số dòng giữ lại', r.giu.length, 0);

console.log('\n=== Trộn lẫn: có dòng đang dùng thật ===');
const b=[R('1','Hoá*','DA_THAY'), R('2','10 Toán','HOAT_DONG'),
         R('3','MTT','DA_XOA'),   R('4','Đi học muộn','HOAT_DONG'),
         R('5','cũ','DA_THAY')];
r=don(b);
kt('Xoá 3 dòng lịch sử', r.soXoa, 3);
kt('Giữ 2 dòng đang dùng', r.giu.length, 2);
kt('Giữ đúng dòng nào', r.giu.map(x=>x[H.indexOf('MoTa')]), ['10 Toán','Đi học muộn']);

console.log('\n=== Không có gì để dọn ===');
const c=[R('1','a','HOAT_DONG'),R('2','b','HOAT_DONG')];
r=don(c);
kt('Không xoá dòng nào', r.soXoa, 0);

console.log('\n=== Dòng rỗng (ô trắng trong sheet) cũng bị loại ===');
const d=[R('1','a','HOAT_DONG'), new Array(H.length).fill('')];
r=don(d);
kt('Loại dòng rỗng', r.soXoa, 1);
kt('Còn lại dòng thật', r.giu.length, 1);

console.log('\n'+pass+' đạt, '+fail+' lỗi');
process.exit(fail?1:0);
