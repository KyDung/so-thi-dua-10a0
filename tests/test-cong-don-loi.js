// Mô phỏng đúng phần cộng dồn lỗi nhỏ + trần ghi sổ trong tinhLaiTatCa
const BAC=['CHUA_DAT','DAT','KHA','TOT'];
const haBac=(b,n)=>BAC[Math.max(0,BAC.indexOf(b)-n)];
const thapHon=(a,b)=>BAC.indexOf(a)<=BAC.indexOf(b)?a:b;
const NG=3, GS_TOT=3, GS_KHA=5;

function chay(thangs){ // [{nho, haBac, chuaDat}]
  let vi=0; const out=[];
  thangs.forEach(m=>{
    const tong=(m.nho||0)+vi;
    const ghiSo=Math.floor(tong/NG); vi=tong%NG;
    let xl;
    if(m.chuaDat) xl='CHUA_DAT';
    else{
      xl=haBac('TOT',m.haBac||0);
      let tran='TOT';
      if(ghiSo>=GS_KHA) tran='DAT'; else if(ghiSo>=GS_TOT) tran='KHA';
      xl=thapHon(xl,tran);
    }
    out.push({ghiSo,du:vi,xl});
  });
  return out;
}

console.log('--- Cộng dồn lỗi nhỏ qua các tháng (3 lỗi nhỏ = 1 lần ghi sổ) ---');
const r=chay([{nho:5},{nho:4},{nho:2},{nho:0}]);
r.forEach((x,i)=>console.log(`  Tháng ${i+1}: ghi sổ=${x.ghiSo}  lỗi dư chuyển sang=${x.du}  -> ${x.xl}`));
console.log('  Kỳ vọng: T1 ghi sổ 1 dư 2 | T2 (2+4=6) ghi sổ 2 dư 0 | T3 ghi sổ 0 dư 2 | T4 ghi sổ 0 dư 2');

console.log('\n--- Trần theo số lần ghi sổ ---');
[[9,'9 lỗi nhỏ = 3 lần ghi sổ -> trần KHÁ'],[15,'15 lỗi nhỏ = 5 lần ghi sổ -> trần ĐẠT']].forEach(([n,mo])=>{
  console.log('  '+mo+' => '+chay([{nho:n}])[0].xl);
});

console.log('\n--- Hạ bậc cộng dồn với trần ---');
console.log('  2 lỗi hạ bậc, sạch lỗi nhỏ      =>', chay([{haBac:2}])[0].xl, '(mong ĐẠT)');
console.log('  1 lỗi hạ bậc + 9 lỗi nhỏ        =>', chay([{haBac:1,nho:9}])[0].xl, '(mong KHÁ: hạ 1 = KHÁ, trần KHÁ)');
console.log('  1 lỗi hạ bậc + 15 lỗi nhỏ       =>', chay([{haBac:1,nho:15}])[0].xl, '(mong ĐẠT: trần ĐẠT thấp hơn)');
console.log('  Có lỗi nghiêm trọng             =>', chay([{chuaDat:true}])[0].xl, '(mong CHƯA ĐẠT)');
console.log('  Sạch hoàn toàn                  =>', chay([{}])[0].xl, '(mong TỐT)');
