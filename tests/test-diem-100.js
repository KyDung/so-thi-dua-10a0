// Kiểm tra thang điểm 100đ/tuần theo huong-dan-thi-đua-cá-nhân-2023-2024.docx
const BAC=['CHUA_DAT','DAT','KHA','TOT'];
const haBac=(b,n)=>BAC[Math.max(0,BAC.indexOf(b)-n)];
const thapHon=(a,b)=>BAC.indexOf(a)<=BAC.indexOf(b)?a:b;
const NG={batDau:100,tot:100,kha:80,dat:50,nhanDoi:true};

// Danh mục rút gọn đúng số trong tài liệu
const LOI={
  CC02:{d:-5,nhom:'HA_BAC',nd:true},   RV01:{d:-3,nhom:'NHO',nd:true},
  TP01:{d:-2,nhom:'NHO',nd:true,ngHK:2}, XE05:{d:-20,nhom:'CHUA_DAT',nd:false},
  GH01:{d:-5,nhom:'NHO',nd:false,ghiSo:true}, GH02:{d:-10,nhom:'HA_BAC',nd:false},
  GH06:{d:-10,nhom:'CHUA_DAT',nd:false},
};
const CONG={DT10:3,DT09:2,DT08:1,PB01:1,HT01:3};

function tuan(muc){
  let cong=0,tru=0,soLoi=0,ghiSo=0,haBacN=0,chuaDat=false;
  const dem={};
  muc.forEach(m=>{
    if(CONG[m.ma]!==undefined){ cong+=CONG[m.ma]; return; }
    const L=LOI[m.ma]; soLoi++;
    let t=Math.abs(L.d);
    dem[m.ma]=(dem[m.ma]||0)+1;
    if(NG.nhanDoi&&L.nd&&dem[m.ma]>=2) t*=2;
    if(L.ghiSo) ghiSo++;
    if(L.nhom==='CHUA_DAT') chuaDat=true; else if(L.nhom==='HA_BAC') haBacN++;
    tru+=t;
  });
  const diem=NG.batDau+cong-tru;
  let xl;
  if(chuaDat) xl='CHUA_DAT';
  else if(diem>=NG.tot&&soLoi===0) xl='TOT';
  else if(diem>=NG.kha) xl='KHA';
  else if(diem>=NG.dat) xl='DAT';
  else xl='CHUA_DAT';
  return {diem,soLoi,ghiSo,haBacN,chuaDat,xl};
}

let pass=0,fail=0;
const kt=(ten,got,mong)=>{ if(got===mong){pass++;console.log('  ok   '+ten.padEnd(52)+'= '+got);}
  else{fail++;console.log('  FAIL '+ten.padEnd(52)+'= '+got+' (mong '+mong+')');} };

console.log('=== Xếp loại TUẦN theo ngưỡng điểm ===');
let r=tuan([]);
kt('Không vi phạm gì', r.diem, 100); kt('  -> xếp loại', r.xl, 'TOT');

r=tuan([{ma:'DT10'},{ma:'PB01'}]);
kt('Chỉ có điểm cộng: 100+3+1', r.diem, 104); kt('  -> xếp loại', r.xl, 'TOT');

r=tuan([{ma:'RV01'},{ma:'DT10'},{ma:'DT10'}]);
kt('Đi học muộn -3, hai điểm 10 +6 = 103', r.diem, 103);
kt('  -> có lỗi nên KHÔNG được Tốt', r.xl, 'KHA');

r=tuan([{ma:'RV01'}]);
kt('Chỉ đi học muộn: 100-3', r.diem, 97); kt('  -> xếp loại', r.xl, 'KHA');

r=tuan([{ma:'CC02'},{ma:'CC02'},{ma:'GH01'}]);
kt('Nghỉ ko phép x2 (nhân đôi lần 2) + ghi sổ', r.diem, 100-5-10-5);
kt('  -> xếp loại', r.xl, 'KHA');

r=tuan([{ma:'GH02'},{ma:'GH01'},{ma:'RV01'},{ma:'RV01'},{ma:'CC02'}]);
kt('Nhiều lỗi: 100-10-5-3-6-5', r.diem, 71); kt('  -> xếp loại', r.xl, 'DAT');

r=tuan([{ma:'XE05'}]);
kt('Không đội mũ bảo hiểm: 100-20', r.diem, 80);
kt('  -> dù 80đ vẫn CHƯA ĐẠT', r.xl, 'CHUA_DAT');

r=tuan([{ma:'GH06'},{ma:'DT10'},{ma:'DT10'},{ma:'DT10'},{ma:'DT10'}]);
kt('Gian lận thi + 4 điểm 10 = 102đ', r.diem, 102);
kt('  -> vẫn CHƯA ĐẠT', r.xl, 'CHUA_DAT');

console.log('\n=== Nhân đôi từ lần 2 (mục I của tài liệu) ===');
r=tuan([{ma:'RV01'}]);              kt('Muộn 1 lần: -3', 100-r.diem, 3);
r=tuan([{ma:'RV01'},{ma:'RV01'}]);  kt('Muộn 2 lần: -3 -6', 100-r.diem, 9);
r=tuan([{ma:'RV01'},{ma:'RV01'},{ma:'RV01'}]); kt('Muộn 3 lần: -3 -6 -6', 100-r.diem, 15);
r=tuan([{ma:'GH01'},{ma:'GH01'}]);  kt('Lỗi KHÔNG nhân đôi: -5 -5', 100-r.diem, 10);

console.log('\n=== Xếp loại THÁNG: trung bình điểm tuần ===');
const thang=(tuans,ghiSo,haBacN,chuaDat)=>{
  const tb=tuans.reduce((a,b)=>a+b,0)/tuans.length;
  let xl;
  if(chuaDat) xl='CHUA_DAT';
  else{
    xl = tb>=100?'TOT':tb>=80?'KHA':tb>=50?'DAT':'CHUA_DAT';
    if(tb>=100) xl='KHA';                 // có lỗi trong tháng -> không Tốt
    xl=haBac(xl,haBacN);
    let tran='TOT';
    if(ghiSo>=5) tran='DAT'; else if(ghiSo>=3) tran='KHA';
    xl=thapHon(xl,tran);
  }
  return {tb:Math.round(tb*10)/10,xl};
};
let m=thang([100,100,100,100],0,0,false);
kt('4 tuần đều 100đ, không lỗi', m.tb, 100);
m=thang([97,95,100,90],0,0,false); kt('TB (97+95+100+90)/4', m.tb, 95.5); kt('  -> xếp loại', m.xl, 'KHA');
m=thang([97,95,100,90],3,0,false); kt('Bị ghi sổ 3 lần -> trần KHÁ', m.xl, 'KHA');
m=thang([97,95,100,90],5,0,false); kt('Bị ghi sổ 5 lần -> trần ĐẠT', m.xl, 'DAT');
m=thang([97,95,100,90],0,1,false); kt('1 lỗi hạ bậc: KHÁ -> ĐẠT', m.xl, 'DAT');
m=thang([97,95,100,90],0,0,true);  kt('Có lỗi Chưa đạt', m.xl, 'CHUA_DAT');

console.log('\n'+pass+' đạt, '+fail+' lỗi');
process.exit(fail?1:0);
