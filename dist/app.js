"use strict";

// Original procedural light field. No reference-site code, image, or shader is used.
function initWaterLight() {
  const hero = document.querySelector(".hero");
  const canvas = document.querySelector(".hero__water");
  if (!hero || !canvas) return;
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "low-power" });
  if (!gl) { canvas.hidden = true; return; }
  const vertexSource = `attribute vec2 position; void main(){gl_Position=vec4(position,0.,1.);}`;
  const fragmentSource = `
    precision mediump float;
    uniform vec2 resolution;
    uniform vec2 pointer;
    uniform float time;
    uniform float energy;
    float field(vec2 p, float t) {
      p += .52*vec2(sin(p.y*1.85+t*.34),cos(p.x*1.6-t*.27));
      return sin(p.x*1.48+p.y*.7+sin(p.y*1.4-t*.26)*1.8+t*.2)
          + .58*sin(p.y*2.1-p.x*.8+cos(p.x*1.7+t*.15)*1.4)
          + .19*sin(p.x*3.4+p.y*2.2-t*.3);
    }
    void main(){
      vec2 uv=gl_FragCoord.xy/resolution;
      float aspect=resolution.x/resolution.y;
      vec2 p=(uv-.5)*vec2(aspect,1.)*3.15;
      vec2 m=(pointer-.5)*vec2(aspect,1.)*3.15;
      float vicinity=exp(-length(p-m)*.65);
      p += energy*vicinity*.46*vec2(sin(length(p-m)*2.5-time*.8),cos(length(p-m)*2.-time*.7));
      p += (pointer-.5)*energy*.55;
      float f=field(p,time);
      float dx=field(p+vec2(.018,0.),time)-f;
      float dy=field(p+vec2(0.,.018),time)-f;
      vec3 normal=normalize(vec3(-dx*25.,-dy*25.,1.));
      float sheen=pow(max(dot(normal,normalize(vec3(-.4,.65,.6))),0.),6.);
      float fold=exp(-abs(f-.12)*5.5);
      float thin=exp(-abs(f-.21)*32.);
      float strength=.13+energy*(.42+.65*vicinity);
      float broad=smoothstep(-1.8,1.5,f);
      vec3 col=mix(vec3(.016,.038,.071),vec3(.035,.14,.235),broad);
      col+=vec3(.035,.08,.115)*sheen;
      col+=strength*fold*vec3(.16,.26,.36);
      col+=strength*sheen*vec3(.24,.29,.33);
      col+=thin*strength*vec3(.19,.29,.34);
      vec3 iridescent=.5+.5*cos(7.*f+vec3(.6,2.3,4.4));
      col+=iridescent*exp(-abs(f+.12)*17.)*strength*.095;
      float vignette=1.-.58*smoothstep(.18,.8,length((uv-.5)*vec2(.9,1.)));
      col*=vignette;
      float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
      col+=(grain-.5)*.018;
      gl_FragColor=vec4(col,1.);
    }`;
  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn("Water light shader unavailable:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }
  const vertex = compileShader(gl.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) { canvas.hidden = true; return; }
  const program = gl.createProgram();
  gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { canvas.hidden = true; return; }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uniforms = Object.fromEntries(["resolution","pointer","time","energy"].map(name => [name, gl.getUniformLocation(program,name)]));
  let contextLost = false;
  let frame = 0, last = 0, elapsed = 0, visible = true;
  let x = .43, y = .6, targetX = x, targetY = y, energy = 0, targetEnergy = 0;
  function resize() {
    const scale = Math.min(devicePixelRatio || 1, 1.5, 1600 / hero.clientWidth);
    canvas.width = Math.max(1, Math.round(hero.clientWidth * scale));
    canvas.height = Math.max(1, Math.round(hero.clientHeight * scale));
    gl.viewport(0,0,canvas.width,canvas.height);
    draw();
  }
  function draw() {
    gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);
    gl.uniform2f(uniforms.pointer,x,y);
    gl.uniform1f(uniforms.time,elapsed);
    gl.uniform1f(uniforms.energy,energy);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }
  function animate(now) {
    frame = 0;
    const dt = last ? Math.min((now-last)/1000,.05) : .016;
    last = now; elapsed += dt;
    const ease = 1-Math.exp(-dt*3.6);
    x += (targetX-x)*ease; y += (targetY-y)*ease;
    energy += (targetEnergy-energy)*ease;
    targetEnergy *= Math.exp(-dt*.65);
    draw();
    if (!contextLost && visible && !document.hidden) frame = requestAnimationFrame(animate);
  }
  function syncPlayback() {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    if (!contextLost && visible && !document.hidden) frame = requestAnimationFrame(animate);
  }
  hero.addEventListener("pointermove", event => {
    if (contextLost) return;
    const bounds = hero.getBoundingClientRect();
    targetX = (event.clientX-bounds.left)/bounds.width;
    targetY = 1-(event.clientY-bounds.top)/bounds.height;
    targetEnergy = 1;
  }, { passive: true });
  hero.addEventListener("pointerleave", () => { targetEnergy = 0; });
  hero.addEventListener("pointerup", event => { if (event.pointerType !== "mouse") targetEnergy = 0; });
  document.addEventListener("visibilitychange", syncPlayback);
  canvas.addEventListener("webglcontextlost", event => { event.preventDefault(); contextLost = true; cancelAnimationFrame(frame); canvas.hidden = true; });
  if ("IntersectionObserver" in window) new IntersectionObserver(entries => { visible = entries[0].isIntersecting; syncPlayback(); }).observe(hero);
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(hero);
  else window.addEventListener("resize", resize);
  resize(); syncPlayback();
}

function initScrollReveal() {
  const targets = [...document.querySelectorAll("[data-reveal]")];
  if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: .06 });
  document.documentElement.classList.add("reveal-ready");
  targets.forEach(target => observer.observe(target));
}

initWaterLight();
initScrollReveal();
