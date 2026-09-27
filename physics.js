class PhysicsEngine {
    constructor() {
        this.bodies = [];
        this.initialEnergy = 0;
    }
    addBody(body) { this.bodies.push(body); }
    calculateForces() {
        for (let b of this.bodies) { b.ax = 0; b.ay = 0; b.az = 0; }
        for (let i = 0; i < this.bodies.length; i++) {
            for (let j = i + 1; j < this.bodies.length; j++) {
                let b1 = this.bodies[i]; let b2 = this.bodies[j];
                let dx = b2.x - b1.x, dy = b2.y - b1.y, dz = b2.z - b1.z;
                let distSq = dx*dx + dy*dy + dz*dz;
                let dist = Math.sqrt(distSq);
                
                if(dist < (b1.radius + b2.radius)*1500) {
                    if(b1.id === "Nave" || b2.id === "Nave") {
                        if(window.onSpacecraftCrash) window.onSpacecraftCrash(b1.id === "Nave" ? b2.id : b1.id);
                    }
                    continue; 
                }
                let force = (CONSTANTS.G * b1.mass * b2.mass) / distSq;
                let ax = (force * dx / dist), ay = (force * dy / dist), az = (force * dz / dist);
                b1.ax += ax / b1.mass; b1.ay += ay / b1.mass; b1.az += az / b1.mass;
                b2.ax -= ax / b2.mass; b2.ay -= ay / b2.mass; b2.az -= az / b2.mass;
            }
        }
    }
    step(dt) {
        for (let b of this.bodies) {
            b.x += b.vx * dt + 0.5 * b.ax * dt * dt; b.y += b.vy * dt + 0.5 * b.ay * dt * dt; b.z += b.vz * dt + 0.5 * b.az * dt * dt;
            b.vx += 0.5 * b.ax * dt; b.vy += 0.5 * b.ay * dt; b.vz += 0.5 * b.az * dt;
        }
        this.calculateForces();
        for (let b of this.bodies) {
            b.vx += 0.5 * b.ax * dt; b.vy += 0.5 * b.ay * dt; b.vz += 0.5 * b.az * dt;
        }
    }
    getTotalEnergy() {
        let kinetic = 0, potential = 0;
        for (let i = 0; i < this.bodies.length; i++) {
            let b = this.bodies[i];
            kinetic += 0.5 * b.mass * (b.vx*b.vx + b.vy*b.vy + b.vz*b.vz);
            for (let j = i + 1; j < this.bodies.length; j++) {
                let b2 = this.bodies[j];
                let dist = Math.sqrt(Math.pow(b2.x-b.x, 2) + Math.pow(b2.y-b.y, 2) + Math.pow(b2.z-b.z, 2));
                potential -= (CONSTANTS.G * b.mass * b2.mass) / dist;
            }
        }
        return kinetic + potential;
    }
}
