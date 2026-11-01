/* AURELIS — living aurora hero (raw WebGL) + motion layer */
(() => {
  document.documentElement.classList.add('js'); // gate reveal-hiding on JS presence
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // nav backdrop after leaving the hero
  const nav = document.querySelector('.nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > window.innerHeight * 0.7);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // failsafe: if GSAP never arrives, reveal everything so content is never stuck hidden
  const revealAll = () => document.querySelectorAll('.reveal').forEach(e => e.classList.add('is-in'));
  setTimeout(() => { if (!window.gsap) revealAll(); }, 2500);

  // hero intro is CSS-driven (compositor animation) so it never depends on rAF/GSAP being alive
  const hero = document.querySelector('.hero');
  requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('loaded')));
  setTimeout(() => hero.classList.add('loaded'), 400); // hard failsafe

  /* ---------- WebGL aurora ---------- */
  const canvas = document.getElementById('aurora');
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });

  if (!gl) {
    canvas.style.background =
      'radial-gradient(120% 100% at 30% 20%,#3a2ff0,transparent 55%),radial-gradient(120% 100% at 80% 30%,#c026d3,transparent 60%),radial-gradient(140% 120% at 50% 110%,#f5c14b,#0a0710 60%)';
  } else {
    const vert = `attribute vec2 p; void main(){ gl_Position = vec4(p,0.0,1.0); }`;
    const frag = `
      precision highp float;
      uniform float u_time; uniform vec2 u_res; uniform vec2 u_mouse;
      float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
      float noise(vec2 p){
        vec2 i=floor(p), f=fract(p);
        float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
        vec2 u=f*f*(3.-2.*f);
        return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;
      }
      float fbm(vec2 p){
        float v=0.0, amp=0.55; mat2 m=mat2(1.6,1.2,-1.2,1.6);
        for(int i=0;i<6;i++){ v+=amp*noise(p); p=m*p; amp*=0.5; }
        return v;
      }
      void main(){
        vec2 uv=gl_FragCoord.xy/u_res.xy;
        vec2 p=(gl_FragCoord.xy-0.5*u_res.xy)/u_res.y;
        float t=u_time*0.05;
        p += (u_mouse-0.5)*0.35;
        vec2 q=vec2(fbm(p+vec2(0.0,t)), fbm(p+vec2(3.2,-t)));
        vec2 r=vec2(fbm(p+1.7*q+vec2(1.7,9.2)+0.15*t), fbm(p+1.7*q+vec2(8.3,2.8)-0.12*t));
        float f=fbm(p+2.2*r);
        vec3 A=vec3(0.16,0.11,0.72);   // indigo
        vec3 B=vec3(0.76,0.15,0.83);   // magenta
        vec3 C=vec3(0.96,0.76,0.29);   // gold
        vec3 col=mix(A,B,smoothstep(0.15,0.75,f+0.15*r.x));
        col=mix(col,C,smoothstep(0.55,1.05,f*1.1+0.35*q.y+0.25*uv.y));
        // ribbon banding
        float band=smoothstep(0.0,0.5,abs(sin((f+r.y)*3.14159+t)));
        col*=0.55+0.75*band;
        col*=0.35+0.9*uv.y;                       // vertical falloff
        col+=0.04*C*pow(1.0-uv.y,3.0);            // warm base bloom
        float d=hash(gl_FragCoord.xy*0.5)*0.03-0.015; // dither
        gl_FragColor=vec4(col+d,1.0);
      }`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vert));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uT = gl.getUniformLocation(prog, 'u_time');
    const uR = gl.getUniformLocation(prog, 'u_res');
    const uM = gl.getUniformLocation(prog, 'u_mouse');
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    addEventListener('pointermove', e => { mouse.tx = e.clientX / innerWidth; mouse.ty = 1 - e.clientY / innerHeight; }, { passive: true });

    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    function resize(){
      const w = canvas.clientWidth * dpr, h = canvas.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h){ canvas.width = w; canvas.height = h; gl.viewport(0,0,w,h); }
    }
    addEventListener('resize', resize);
    const start = performance.now();
    function frame(now){
      resize();
      mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
      gl.uniform1f(uT, reduce ? 12 : (now - start) / 1000);
      gl.uniform2f(uR, canvas.width, canvas.height);
      gl.uniform2f(uM, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduce) requestAnimationFrame(frame);
    }
    resize();
    requestAnimationFrame(frame);
  }

  /* ---------- custom cursor ---------- */
  if (!reduce && matchMedia('(pointer:fine)').matches) {
    const cur = document.querySelector('.cursor');
    const pos = { x: innerWidth/2, y: innerHeight/2, tx: innerWidth/2, ty: innerHeight/2 };
    addEventListener('pointermove', e => { pos.tx = e.clientX; pos.ty = e.clientY; });
    (function loop(){ pos.x += (pos.tx-pos.x)*0.18; pos.y += (pos.ty-pos.y)*0.18;
      cur.style.transform = `translate(${pos.x}px,${pos.y}px) translate(-50%,-50%)`; requestAnimationFrame(loop); })();
    document.querySelectorAll('a,button,.card,.cta').forEach(el => {
      el.addEventListener('pointerenter', () => cur.classList.add('hot'));
      el.addEventListener('pointerleave', () => cur.classList.remove('hot'));
    });
  }

  /* ---------- motion (GSAP) ---------- */
  window.addEventListener('load', () => {
    if (!window.gsap) { revealAll(); return; }
    gsap.registerPlugin(ScrollTrigger);

    // scroll reveals
    gsap.utils.toArray('.reveal:not(.hero .reveal)').forEach(el => {
      ScrollTrigger.create({ trigger: el, start: 'top 88%',
        onEnter: () => el.classList.add('is-in') });
    });
    gsap.utils.toArray('.card, .note-row').forEach((el, i) => {
      gsap.from(el, { opacity: 0, y: 40, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%' }, delay: (i % 3) * 0.08 });
    });
    // pyramid line
    gsap.to('.pyramid-line', { scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: '.pyramid', start: 'top 70%', end: 'bottom 80%', scrub: true } });
  });
})();
