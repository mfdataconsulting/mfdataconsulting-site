let library;
function load(){if(window.ZXingBrowser)return Promise.resolve(window.ZXingBrowser);if(!library)library=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/vendor/zxing-browser.min.js';script.onload=()=>window.ZXingBrowser?resolve(window.ZXingBrowser):reject(new Error('Leitor indisponível.'));script.onerror=()=>{library=null;script.remove();reject(new Error('Não foi possível carregar o leitor.'));};document.head.append(script);});return library;}
export function barcodeCamera(video,onRead,onError){
 let cancelled=false,controls,delivered=false;
 const stop=()=>{cancelled=true;controls?.stop();video.srcObject?.getTracks?.().forEach(track=>track.stop());video.srcObject=null;document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',stop);};
 const hidden=()=>{if(document.hidden){stop();onError('Câmera encerrada. Abra novamente para continuar.');}};
 document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',stop);
 const start=async()=>{try{
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('A câmera precisa de HTTPS ou do Nexo aberto neste computador.');
  const ZXing=await load();if(cancelled)return;
  const reader=new ZXing.BrowserMultiFormatOneDReader();
  controls=await reader.decodeFromConstraints({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280}}},video,(result,error,active)=>{if(result&&!cancelled&&!delivered){delivered=true;active.stop();stop();onRead(result.getText());}});
  if(cancelled)controls.stop();
 }catch(error){if(cancelled)return;stop();onError(error.name==='NotAllowedError'?'Permissão da câmera negada. Libere a câmera no navegador ou digite o código.':error.name==='NotFoundError'?'Nenhuma câmera encontrada. Use o leitor USB ou digite o código.':error.message||'Não foi possível abrir a câmera.');}};
 return {start,stop};
}
