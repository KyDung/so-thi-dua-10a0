// batDauNamHocMoi() phải dọn ĐÚNG các bảng chứa dữ liệu của năm học,
// và GIỮ NGUYÊN các bảng cấu hình / danh mục / tài khoản.
const fs=require('fs'), path=require('path');
const s=fs.readFileSync(path.join(__dirname,'..','apps-script','Setup.gs'),'utf8');

let pass=0,fail=0;
const kt=(ten,dung,ct)=>{ if(dung){pass++;console.log('  ok   '+ten);}
  else{fail++;console.log('  FAIL '+ten+(ct?' -> '+ct:''));} };

const than = s.slice(s.indexOf('function batDauNamHocMoi'), s.indexOf('function xoaHetTrangTuan'));

console.log('=== Dọn đúng các bảng chứa dữ liệu theo năm ===');
const domDon = (than.match(/\[([^\]]*)\]\.forEach/)||['',''])[1];
['NHATKY','THANG','TUANXL','KY','LOG','TUAN'].forEach(k=>
  kt('có dọn SHEETS.'+k, domDon.includes('SHEETS.'+k)));

console.log('\n=== KHÔNG dọn nhầm các bảng phải giữ nguyên ===');
['LOI','CONG','TK','CFG','HS'].forEach(k=>
  kt('không đụng SHEETS.'+k, !domDon.includes('SHEETS.'+k)));

console.log('\n=== Có sao lưu trước khi xoá ===');
kt('gọi ss.copy() để sao lưu', /ss\.copy\(/.test(than));
kt('sao lưu TRƯỚC khi dọn dữ liệu',
   than.indexOf('ss.copy(') < than.indexOf('.forEach(function (ten)'));

console.log('\n=== Bắt xác nhận bằng năm học mới, không phải OK suông ===');
kt('dùng ui.prompt (phải gõ chữ) chứ không phải ui.alert xác nhận', /ui\.prompt\(/.test(than));
kt('kiểm tra định dạng năm học (4 số - 4 số)', /\\d\{4\}-\\d\{4\}/.test(than));
kt('hủy khi bấm Cancel', /getSelectedButton\(\) !== ui\.Button\.OK/.test(than));

console.log('\n=== Thông báo cuối nhắc đủ việc còn lại ===');
kt('nhắc cập nhật HocSinh', /HocSinh/.test(than) && /Việc còn lại/.test(than));
kt('nhắc xử lý tài khoản phụ huynh khi đổi danh sách', /tài khoản phụ huynh/i.test(than));
kt('nhắc tạo trang tuần 1', /trang tuần 1/.test(than));

console.log('\n'+pass+' đạt, '+fail+' lỗi');
process.exit(fail?1:0);
