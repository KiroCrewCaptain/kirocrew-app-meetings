// Restated from the dashboard's `lib/widgetSrcdoc` (`FRAME_PING_MESSAGE_TYPE`,
// `FRAME_ALIVE_MESSAGE_TYPE`, `FRAME_ALIVE_REPLY_BODY`), which the App Kit SDK
// does not publish. The sketch frame admits the reply by hash, so its text must
// stay byte-for-byte the dashboard's.

/** What the page posts into the sketch frame on `load`, and what the frame posts back. */
export const FRAME_PING_MESSAGE_TYPE = 'mc-frame-ping'
export const FRAME_ALIVE_MESSAGE_TYPE = 'mc-frame-alive'

/** Answers the page's ping, so the page can tell this document from whatever
 * else the frame holds after the browser reloads it on its own. A sandbox-doc
 * URL is single-use, so such a reload gets the gateway's 404, which has no
 * script and cannot answer (see `useFrameAliveRecovery`). Replies only to the
 * parent, and carries nothing but its type. */
export const FRAME_ALIVE_REPLY_BODY = `(function(){
  window.addEventListener('message',function(e){
    var d=e.data;
    if(e.source!==parent||!d||d.type!=='${FRAME_PING_MESSAGE_TYPE}')return;
    try{parent.postMessage({type:'${FRAME_ALIVE_MESSAGE_TYPE}'},'*');}catch(_){}
  });
})();`
