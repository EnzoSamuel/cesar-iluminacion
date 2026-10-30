/**
 * ========================================
 * VOZ LOCAL (dictado sin depender del navegador)
 * ========================================
 * El dictado nativo de Chrome/Edge usa el servicio de voz de Google/Microsoft
 * y a veces falla con "network" aunque haya internet (Brave, Edge, redes con
 * filtros, etc.). Este motor graba el micrófono y transcribe con Whisper
 * corriendo en el propio navegador (transformers.js + WebAssembly):
 *   - se descarga una sola vez (~80 MB) y queda en caché;
 *   - después funciona sin mandar tu voz a ningún servidor.
 */

const VozLocal = {

    LIB: 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2',
    MODELO: 'Xenova/whisper-base',
    FLAG: 'cesar_voz_local_listo',
    MAX_SEG: 120,           // tope de grabación (segundos)

    _pipe: null,
    _cargando: null,

    get listo() { return !!this._pipe; },
    get descargadoAntes() { return !!StorageService.getLocal(this.FLAG, false); },

    get puedeGrabar() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
    },

    /** Descarga (la 1ª vez) y prepara el modelo. onProgreso(0..100, texto). */
    cargar(onProgreso) {
        if (this._pipe) return Promise.resolve(this._pipe);
        if (this._cargando) return this._cargando;

        const archivos = {};
        this._cargando = (async () => {
            const lib = await import(this.LIB);
            lib.env.allowLocalModels = false;
            lib.env.useBrowserCache = true;
            this._pipe = await lib.pipeline('automatic-speech-recognition', this.MODELO, {
                quantized: true,
                progress_callback: p => {
                    if (!onProgreso) return;
                    if (p.status === 'progress' && p.total) {
                        archivos[p.file] = { cargado: p.loaded, total: p.total };
                        let c = 0, t = 0;
                        Object.values(archivos).forEach(a => { c += a.cargado; t += a.total; });
                        onProgreso(Math.min(99, Math.round((c / t) * 100)), `${(c / 1048576).toFixed(0)} de ${(t / 1048576).toFixed(0)} MB`);
                    } else if (p.status === 'ready') {
                        onProgreso(100, 'listo');
                    }
                }
            });
            StorageService.saveLocal(this.FLAG, true);
            return this._pipe;
        })();
        this._cargando.then(() => { this._cargando = null; }, () => { this._cargando = null; });
        return this._cargando;
    },

    /** Empieza a grabar. Devuelve { parar(): Promise<Float32Array>, cancelar() }. */
    async grabar(onTiempo) {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
        const rec = new MediaRecorder(stream);
        const trozos = [];
        rec.ondataavailable = e => { if (e.data && e.data.size) trozos.push(e.data); };
        rec.start(250);

        const inicio = Date.now();
        const reloj = setInterval(() => {
            const s = Math.floor((Date.now() - inicio) / 1000);
            if (onTiempo) onTiempo(s);
        }, 500);

        const soltar = () => { clearInterval(reloj); stream.getTracks().forEach(t => t.stop()); };

        return {
            parar: () => new Promise((ok, mal) => {
                rec.onstop = async () => {
                    soltar();
                    try { ok(await this.aAudio(new Blob(trozos, { type: rec.mimeType || 'audio/webm' }))); }
                    catch (e) { mal(e); }
                };
                if (rec.state !== 'inactive') rec.stop(); else rec.onstop();
            }),
            cancelar: () => { try { rec.onstop = null; if (rec.state !== 'inactive') rec.stop(); } catch (e) { /* ya parado */ } soltar(); }
        };
    },

    /** Blob de audio → Float32Array mono a 16 kHz (lo que espera Whisper). */
    async aAudio(blob) {
        const buf = await blob.arrayBuffer();
        const Ctx = window.AudioContext || window.webkitAudioContext;
        const ctx = new Ctx();
        let dec;
        try { dec = await ctx.decodeAudioData(buf); } finally { ctx.close(); }

        const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(dec.duration * 16000)), 16000);
        const src = off.createBufferSource();
        src.buffer = dec;
        src.connect(off.destination);
        src.start();
        const r = await off.startRendering();
        return r.getChannelData(0);
    },

    async transcribir(audio) {
        const pipe = await this.cargar();
        const r = await pipe(audio, { language: 'spanish', task: 'transcribe', chunk_length_s: 30, stride_length_s: 5 });
        return (r.text || '').trim();
    }
};
