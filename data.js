const CONSTANTS = {
    G: 6.67430e-11, // m^3 kg^-1 s^-2
    AU: 149597870700, // metros
    DAY: 86400, // segundos
    M_EARTH: 5.972e24
};

const PLANETS_KEPLER = [
    { name: "Sol", mass: 1.989e30, radius: 696340, color: 0xffcc00, isStar: true },
    { name: "Mercurio", mass: 3.3011e23, radius: 2439, color: 0xaaaaaa, a: 0.387, e: 0.2056, i: 7.00, w: 29.124, node: 48.33, M0: 174.796 },
    { name: "Venus", mass: 4.8675e24, radius: 6051, color: 0xffaa55, a: 0.723, e: 0.0067, i: 3.39, w: 54.884, node: 76.68, M0: 50.115 },
    { name: "Tierra", mass: 5.972e24, radius: 6371, color: 0x3333ff, a: 1.000, e: 0.0167, i: 0.00, w: 114.20, node: -11.26, M0: 358.617 },
    { name: "Marte", mass: 6.4171e23, radius: 3389, color: 0xff3300, a: 1.524, e: 0.0934, i: 1.85, w: 286.50, node: 49.55, M0: 19.373 },
    { name: "Júpiter", mass: 1.8982e27, radius: 69911, color: 0xddaa77, a: 5.204, e: 0.0485, i: 1.30, w: 273.86, node: 100.46, M0: 20.020 },
    { name: "Urano", mass: 8.6810e25, radius: 25362, color: 0x00ffff, a: 19.191, e: 0.0472, i: 0.77, w: 96.73, node: 74.01, M0: 142.238 },
    { name: "Neptuno", mass: 1.0241e26, radius: 24622, color: 0x3333aa, a: 30.07, e: 0.0086, i: 1.77, w: 265.64, node: 131.78, M0: 256.228 }
];

function solveKepler(M, e) {
    let E = M;
    for(let i=0; i<10; i++) { E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); }
    return E;
}

function getCartesianState(planet, dateStr) {
    if(planet.isStar) return { x:0, y:0, z:0, vx:0, vy:0, vz:0 };

    const targetDate = new Date(dateStr);
    const J2000 = new Date('2000-01-01T12:00:00Z');
    const daysSinceJ2000 = (targetDate - J2000) / (1000 * 60 * 60 * 24);

    const a_m = planet.a * CONSTANTS.AU;
    const mu = CONSTANTS.G * 1.989e30; 
    const n = Math.sqrt(mu / Math.pow(a_m, 3)); 
    
    const M_rad = (planet.M0 * Math.PI/180) + (n * daysSinceJ2000 * CONSTANTS.DAY);
    const M_mod = M_rad % (2*Math.PI);

    const E = solveKepler(M_mod, planet.e);
    
    const v = 2 * Math.atan(Math.sqrt((1 + planet.e)/(1 - planet.e)) * Math.tan(E/2));
    const r = a_m * (1 - planet.e * Math.cos(E));

    const x_orb = r * Math.cos(v);
    const y_orb = r * Math.sin(v);
    const p = a_m * (1 - planet.e*planet.e);
    const h = Math.sqrt(mu * p);
    const vx_orb = (h/p) * (-Math.sin(v));
    const vy_orb = (h/p) * (planet.e + Math.cos(v));

    const i = planet.i * Math.PI/180;
    const w = planet.w * Math.PI/180;
    const node = planet.node * Math.PI/180;

    const cosW = Math.cos(w), sinW = Math.sin(w);
    const cosNode = Math.cos(node), sinNode = Math.sin(node);
    const cosI = Math.cos(i), sinI = Math.sin(i);

    const x = x_orb * (cosNode*cosW - sinNode*sinW*cosI) + y_orb * (-cosNode*sinW - sinNode*cosW*cosI);
    const y = x_orb * (sinNode*cosW + cosNode*sinW*cosI) + y_orb * (-sinNode*sinW + cosNode*cosW*cosI);
    const z = x_orb * (sinW*sinI) + y_orb * (cosW*sinI);

    const vx = vx_orb * (cosNode*cosW - sinNode*sinW*cosI) + vy_orb * (-cosNode*sinW - sinNode*cosW*cosI);
    const vy = vx_orb * (sinNode*cosW + cosNode*sinW*cosI) + vy_orb * (-sinNode*sinW + cosNode*cosW*cosI);
    const vz = vx_orb * (sinW*sinI) + vy_orb * (cosW*sinI);

    return { x: x, y: y, z: z, vx: vx, vy: vy, vz: vz };
}
