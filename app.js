let scene, camera, renderer, controls;
let engine = new PhysicsEngine();
let visualScale = 1.5e-10; 
let isPaused = true;
let timeScale = 864000;
let meshes = {}, orbitLines = {};
let spacecraft = null;
let graphCtx = document.getElementById('telemetry-chart').getContext('2d');
let telemetryData = [];

let currentMission = 1;
const missions = [
    { id: 1, text: "Misión 1: Selecciona Júpiter para ver su masa (Panel Info)." },
    { id: 2, text: "Misión 2: Abre '🚀 Lanzar' y lanza la nave (Vel: 12 km/s, Ángulo: 0°)." },
    { id: 3, text: "Misión 3: Consigue una 'Trayectoria Hiperbólica' (Velocidad de Escape)." },
    { id: 4, text: "Misión 4: Pasa cerca de otro planeta para detectar 'Asistencia Gravitatoria'." }
];

let currentExp = { v: 0, a: 0, status: "En vuelo" };

function completeMission(id) {
    if(currentMission === id) {
        currentMission++;
        document.getElementById('mission-progress').value = currentMission - 1;
        if(currentMission <= missions.length) {
            document.getElementById('mission-desc').innerText = missions[currentMission-1].text;
            document.getElementById('mission-panel').style.borderColor = "#00ff00";
            setTimeout(() => document.getElementById('mission-panel').style.borderColor = "#4db8ff", 1000);
        } else {
            document.getElementById('mission-desc').innerText = "¡Has completado todas las misiones introductorias!";
        }
    }
}

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 20000);
    camera.position.set(0, 500, 800);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    scene.add(new THREE.AmbientLight(0x404040));
    scene.add(new THREE.PointLight(0xffffff, 2, 10000));
    scene.add(new THREE.GridHelper(2000, 100, 0x222222, 0x111111));

    setupUI();
    loadSolarSystem(document.getElementById('sim-date').value);
    animate();
}

function getVisualRadius(r_km, isStar) {
    const mode = document.getElementById('scale-mode').value;
    if(mode === 'real') return (r_km * 1000) * visualScale;
    if(isStar) return 10;
    return Math.max(1.5, (r_km / 6371) * 3);
}

function loadSolarSystem(dateStr) {
    engine.bodies = [];
    Object.values(meshes).forEach(m => scene.remove(m));
    Object.values(orbitLines).forEach(m => scene.remove(m));
    meshes = {}; orbitLines = {}; spacecraft = null;

    PLANETS_KEPLER.forEach(data => {
        let state = getCartesianState(data, dateStr);
        let body = {
            id: data.name, mass: data.mass, radius: data.radius,
            x: state.x, y: state.y, z: state.z,
            vx: state.vx, vy: state.vy, vz: state.vz,
            ax: 0, ay: 0, az: 0
        };
        engine.addBody(body);

        let mesh = new THREE.Mesh(new THREE.SphereGeometry(getVisualRadius(data.radius, data.isStar), 32, 32), new THREE.MeshBasicMaterial({ color: data.color }));
        mesh.userData = { id: data.name };
        scene.add(mesh);
        meshes[data.name] = mesh;

        if(!data.isStar) drawOrbitLine(data, dateStr);
    });

    engine.calculateForces();
    engine.initialEnergy = engine.getTotalEnergy();
    updateMeshes();
    document.getElementById('mission-desc').innerText = missions[currentMission-1].text;
}

function drawOrbitLine(planet, dateStr) {
    const points = [];
    const steps = 300;
    const dummyDate = new Date(dateStr);
    const a_m = planet.a * CONSTANTS.AU;
    const P_days = Math.sqrt(Math.pow(planet.a, 3)) * 365.25;
    const stepDays = P_days / steps;

    for(let i=0; i<=steps; i++) {
        dummyDate.setTime(dummyDate.getTime() + (stepDays * 24*60*60*1000));
        let s = getCartesianState(planet, dummyDate.toISOString());
        points.push(new THREE.Vector3(s.x * visualScale, s.z * visualScale, -s.y * visualScale));
    }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: planet.color, transparent: true, opacity: 0.3 }));
    scene.add(line);
    orbitLines[planet.name] = line;
}

function launchSpacecraft(vRelative, angleDeg) {
    let earth = engine.bodies.find(b => b.id === "Tierra");
    let angleRad = angleDeg * (Math.PI / 180);
    let vRel_ms = vRelative * 1000;
    
    let ship = {
        id: "Nave", mass: 5000, radius: 10,
        x: earth.x + (earth.radius * 2000), 
        y: earth.y, z: earth.z,
        vx: earth.vx + (vRel_ms * Math.cos(angleRad)),
        vy: earth.vy,
        vz: earth.vz + (vRel_ms * Math.sin(angleRad)),
        ax: 0, ay: 0, az: 0
    };
    
    engine.addBody(ship);
    spacecraft = ship;
    telemetryData = [];
    
    currentExp = { v: vRelative, a: angleDeg, status: "En vuelo" };
    completeMission(2);

    let mesh = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
    scene.add(mesh);
    meshes["Nave"] = mesh;
    
    isPaused = false;
    document.getElementById('btn-play').style.background = '#4db8ff';
    document.getElementById('btn-pause').style.background = '#1a1a3a';
}

function logExperimentResult(status) {
    if(!spacecraft) return;
    currentExp.status = status;
    const tbody = document.getElementById('history-body');
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${currentExp.v}</td><td>${currentExp.a}</td><td>${status}</td>`;
    tbody.prepend(tr);
}

window.onSpacecraftCrash = (target) => {
    logExperimentResult(`Impacto: ${target}`);
    document.getElementById('ship-status').innerText = `Impacto con ${target}`;
    engine.bodies = engine.bodies.filter(b => b.id !== "Nave");
    scene.remove(meshes["Nave"]);
    delete meshes["Nave"];
    spacecraft = null;
};

function setupUI() {
    const setDisplay = (id, show) => { document.getElementById(id).classList.toggle('hidden', !show); };
    
    document.getElementById('btn-pause').onclick = (e) => { isPaused = true; e.target.style.background = '#4db8ff'; document.getElementById('btn-play').style.background = '#1a1a3a'; };
    document.getElementById('btn-play').onclick = (e) => { isPaused = false; e.target.style.background = '#4db8ff'; document.getElementById('btn-pause').style.background = '#1a1a3a'; };
    document.getElementById('time-scale').onchange = (e) => timeScale = parseInt(e.target.value);
    document.getElementById('btn-set-date').onclick = () => loadSolarSystem(document.getElementById('sim-date').value);
    document.getElementById('scale-mode').onchange = () => loadSolarSystem(document.getElementById('sim-date').value);

    document.getElementById('nav-reset').onclick = () => loadSolarSystem(document.getElementById('sim-date').value);
    document.getElementById('nav-launch').onclick = () => setDisplay('launch-panel', true);

    const sVel = document.getElementById('slider-vel'), sAng = document.getElementById('slider-angle');
    const updatePred = () => {
        document.getElementById('val-vel').innerText = sVel.value;
        document.getElementById('val-angle').innerText = sAng.value;
        let v = parseFloat(sVel.value);
        document.getElementById('traj-prediction').innerText = v < 11.2 ? "Vuelo suborbital" : (v < 42 ? "Órbita Solar Elíptica" : "Trayectoria Hiperbólica (Escape)");
    };
    sVel.oninput = updatePred; sAng.oninput = updatePred;
    document.getElementById('btn-close-launch').onclick = () => setDisplay('launch-panel', false);
    document.getElementById('btn-launch').onclick = () => { launchSpacecraft(parseFloat(sVel.value), parseFloat(sAng.value)); };

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    window.addEventListener('click', (event) => {
        if(event.target.tagName === 'BUTTON' || event.target.tagName === 'INPUT' || event.target.closest('.panel')) return;
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1; mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children);
        if(intersects.length > 0 && intersects[0].object.userData.id) showInfo(intersects[0].object.userData.id);
    });
    document.getElementById('btn-close-info').onclick = () => setDisplay('info-panel', false);
}

function showInfo(id) {
    if(id === "Júpiter") completeMission(1);
    let body = engine.bodies.find(b => b.id === id);
    if(!body) return;
    document.getElementById('info-name').innerText = body.id;
    document.getElementById('info-mass').innerText = body.mass.toExponential(2);
    document.getElementById('info-radius').innerText = body.radius;
    document.getElementById('info-dist').innerText = (Math.sqrt(body.x**2 + body.y**2 + body.z**2) / CONSTANTS.AU).toFixed(4);
    document.getElementById('info-vel').innerText = (Math.sqrt(body.vx**2 + body.vy**2 + body.vz**2) / 1000).toFixed(2);
    document.getElementById('info-panel').classList.remove('hidden');
}

function updateMeshes() {
    engine.bodies.forEach(b => {
        if(meshes[b.id]) meshes[b.id].position.set(b.x * visualScale, b.z * visualScale, -b.y * visualScale);
    });
}

function drawGraph() {
    graphCtx.clearRect(0,0,300,100);
    if(telemetryData.length === 0) return;
    graphCtx.strokeStyle = '#00ff00';
    graphCtx.beginPath();
    let maxV = Math.max(...telemetryData);
    for(let i=0; i<telemetryData.length; i++) {
        let x = (i / 200) * 300;
        let y = 100 - ((telemetryData[i] / maxV) * 90);
        if(i===0) graphCtx.moveTo(x, y); else graphCtx.lineTo(x, y);
    }
    graphCtx.stroke();
    graphCtx.fillStyle = '#fff';
    graphCtx.fillText(`Max: ${maxV.toFixed(2)}`, 5, 15);
}

function detectGravityAssist() {
    if(!spacecraft) return;
    for(let b of engine.bodies) {
        if(b.id === "Nave" || b.id === "Sol" || b.id === "Tierra") continue;
        let dist = Math.sqrt((b.x-spacecraft.x)**2 + (b.y-spacecraft.y)**2 + (b.z-spacecraft.z)**2);
        if(dist < b.radius * 20000) {
            document.getElementById('assist-hud').style.display = "block";
            completeMission(4);
            setTimeout(()=> document.getElementById('assist-hud').style.display = "none", 2000);
        }
    }
}

function updatePhysics() {
    if (isPaused) return;
    const dt = (1/60) * timeScale; 
    const subSteps = 20; 
    for(let i=0; i<subSteps; i++) engine.step(dt / subSteps);

    updateMeshes();
    detectGravityAssist();

    if(spacecraft) {
        let graphMode = document.getElementById('graph-type').value;
        let dSun = Math.sqrt(spacecraft.x**2 + spacecraft.y**2 + spacecraft.z**2);
        let v = Math.sqrt(spacecraft.vx**2 + spacecraft.vy**2 + spacecraft.vz**2) / 1000;
        
        telemetryData.push(graphMode === 'vel' ? v : dSun / CONSTANTS.AU);
        if(telemetryData.length > 200) telemetryData.shift();
        drawGraph();
        
        let vEsc = Math.sqrt(2 * CONSTANTS.G * 1.989e30 / dSun) / 1000;
        if(v > vEsc) {
            document.getElementById('ship-status').innerText = "Trayectoria Hiperbólica";
            completeMission(3);
        } else {
            document.getElementById('ship-status').innerText = "Órbita Elíptica";
        }

        if(Math.random() < 0.2) {
            let dot = new THREE.Mesh(new THREE.SphereGeometry(0.8,4,4), new THREE.MeshBasicMaterial({color: 0x00ff00}));
            dot.position.copy(meshes["Nave"].position);
            scene.add(dot);
        }
    }

    let err = Math.abs((engine.getTotalEnergy() - engine.initialEnergy) / engine.initialEnergy) * 100;
    document.getElementById('energy-val').innerText = err.toFixed(5) + "%";
}

function animate() { requestAnimationFrame(animate); updatePhysics(); controls.update(); renderer.render(scene, camera); }
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
init();
