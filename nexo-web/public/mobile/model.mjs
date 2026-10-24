export const money=v=>(Number(v)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export const quantity=(v,unit)=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:v%1000?2:0,maximumFractionDigits:2}).format(v/1000)+' '+unit;
export function sameItems(a,b){return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every(line=>b.some(other=>line.productId===other.productId&&line.qtyMills===other.qtyMills&&line.priceCents===other.priceCents));}
export function installments(balance,count,due){
 if(balance===0)return [];
 if(!Number.isSafeInteger(balance)||balance<0||!Number.isInteger(count)||count<1||count>36||balance<count)throw Error('Confira entrada e quantidade de parcelas.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(due))throw Error('Informe o primeiro vencimento.');
 const [year,month,day]=due.split('-').map(Number),first=new Date(Date.UTC(year,month-1,day));
 if(first.toISOString().slice(0,10)!==due)throw Error('Vencimento inválido.');
 const base=Math.floor(balance/count);return Array.from({length:count},(_,i)=>{const last=new Date(Date.UTC(year,month+i,0)).getUTCDate(),date=new Date(Date.UTC(year,month-1+i,Math.min(day,last)));return {due:date.toISOString().slice(0,10),amountCents:base+(i===count-1?balance-base*count:0)};});
}
export function summary(doc,dayId){
 const sold=doc.sales.filter(s=>!s.cancelledAt),movements=rows=>rows.reduce((n,r)=>n+(r.dayId===dayId?r.amountCents:0)-(r.reversedAt&&r.reverseDayId===dayId?r.amountCents:0),0);
 return {sales:sold.filter(s=>s.dayId===dayId).reduce((n,s)=>n+s.totalCents,0),received:dayId?movements(doc.receipts):0,paid:dayId?movements(doc.payments):0,receivable:sold.flatMap(s=>s.accounts).reduce((n,a)=>n+a.amountCents-a.paidCents,0),payable:doc.payables.reduce((n,p)=>n+p.amountCents-p.paidCents,0)};
}
