import Complex from './complex.js'

export default class Maskit {
    /**
     *
     * @param {number} u
     * @param {number} v
     * @param {number} n
     */
    constructor(u, v, n) {
        this.t = new Complex(u, v);
        this.n = n;
        this.k = 2 * Math.cos(Math.PI / this.n);
        this.update();

        this.pointRadius = 0.03;
        this.lineWidth = 0.01;

        this.selectedComponentId = -1;
        this.diffToComponent = new Complex(0, 0);

        this.drawLines = false;
    }

    release() {
        this.selectedComponentId = -1;
    }

    update() {
        this.symmetricalPoint = new Complex(-this.t.im * 0.5, this.t.re * 0.5);

        this.halfK = this.k * 0.5;

        this.rightBelowP = new Complex(this.halfK, 0);
        this.leftBelowP = new Complex(-this.halfK, 0);

        // right abobe point = halfK - v + iu (originally, 1 - v +iu)
        this.rightAbobeP = new Complex(this.halfK - this.t.im, this.t.re);
        this.leftAbobeP = new Complex(-this.halfK - this.t.im, this.t.re);

        const lineRightDir = this.rightAbobeP.sub(this.rightBelowP);
        this.lineRightNormal = new Complex(-lineRightDir.im, lineRightDir.re); // rotate 90
        this.lineLeftNormal = this.lineRightNormal.scale(-1);
    }

    /**
     *
     * @param {Complex} mouse
     * @return {boolean}
     */
    select(mouse) {
        const dpra = mouse.sub(this.rightAbobeP);
        if (dpra.abs() < this.pointRadius) {
            this.selectedComponentId = Maskit.POINT_RIGHT_ABOVE;
            this.diffToComponent = dpra;
            return true;
        }

        const dprb = mouse.sub(this.rightBelowP);
        if (dprb.abs() < this.pointRadius) {
            this.selectedComponentId = Maskit.POINT_RIGHT_BELOW;
            this.diffToComponent = dprb;
            return true;
        }

        const dpla = mouse.sub(this.leftAbobeP);
        if (dpla.abs() < this.pointRadius) {
            this.selectedComponentId = Maskit.POINT_LEFT_ABOVE;
            this.diffToComponent = dpla;
            return true;
        }

        const dplb = mouse.sub(this.leftBelowP);
        if (dplb.abs() < this.pointRadius) {
            this.selectedComponentId = Maskit.POINT_LEFT_BELOW;
            this.diffToComponent = dplb;
            return true;
        }

        const dpsy = mouse.sub(this.symmetricalPoint);
        if (dpsy.abs() < this.pointRadius) {
            this.selectedComponentId = Maskit.POINT_SYMMETRICAL;
            this.diffToComponent = dpsy;
            return true;
        }
        return false;
    }

    /**
     * 
     * @param {Complex} mouse
     * @return {boolean}
     */
    move(mouse) {
        switch (this.selectedComponentId) {
        case Maskit.POINT_RIGHT_ABOVE: {
            const np = mouse.sub(this.diffToComponent);
            this.t = new Complex(np.im, this.halfK - np.re);
            break;
        }
        case Maskit.POINT_RIGHT_BELOW: {
            const np = mouse.sub(this.diffToComponent);
            this.k = np.re * 2;
            break;
        }
        case Maskit.POINT_LEFT_ABOVE: {
            const np = mouse.sub(this.diffToComponent);
            this.t = new Complex(np.im, -this.halfK - np.re);
            break;
        }
        case Maskit.POINT_LEFT_BELOW: {
            const np = mouse.sub(this.diffToComponent);
            this.k = np.re * 2;
            break;
        }
        case Maskit.POINT_SYMMETRICAL: {
            const np = mouse.sub(this.diffToComponent);
            this.t = new Complex(np.im * 2, -np.re * 2);
            break;
        }
        default: {
            return false;
        }
        }

        this.update()
        return true;
    }

    setUniformLocations(gl, uniLocations, program) {
        uniLocations.push(gl.getUniformLocation(program, 'u_maskit.uv'));
        uniLocations.push(gl.getUniformLocation(program, 'u_maskit.k'));
        uniLocations.push(gl.getUniformLocation(program, 'u_maskit.symmetricalPoint'));
        uniLocations.push(gl.getUniformLocation(program, 'u_maskit.lineLeftNormal'));
        uniLocations.push(gl.getUniformLocation(program, 'u_maskit.lineLeftPoints'));
        uniLocations.push(gl.getUniformLocation(program, 'u_maskit.lineRightNormal'));
        uniLocations.push(gl.getUniformLocation(program, 'u_maskit.lineRightPoints'));
        uniLocations.push(gl.getUniformLocation(program, 'u_maskit.ui'));
        uniLocations.push(gl.getUniformLocation(program, 'u_maskit.drawLines'));
    }

    setUniformValues(gl, uniLocations, uniIndex, sceneScale) {
        let uniI = uniIndex;
        gl.uniform2f(uniLocations[uniI++],
                     this.t.re, this.t.im);
        gl.uniform1f(uniLocations[uniI++], this.k);
        gl.uniform2f(uniLocations[uniI++],
                     this.symmetricalPoint.re, this.symmetricalPoint.im);
        // left line
        gl.uniform2f(uniLocations[uniI++],
                     this.lineLeftNormal.re, this.lineLeftNormal.im);
        gl.uniform4f(uniLocations[uniI++],
                     this.leftBelowP.re, this.leftBelowP.im,
                     this.leftAbobeP.re, this.leftAbobeP.im);
        // left line
        gl.uniform2f(uniLocations[uniI++],
                     this.lineRightNormal.re, this.lineRightNormal.im);
        gl.uniform4f(uniLocations[uniI++],
                     this.rightBelowP.re, this.rightBelowP.im,
                     this.rightAbobeP.re, this.rightAbobeP.im);
        // ui
        gl.uniform2f(uniLocations[uniI++],
                     this.pointRadius, this.lineWidth);
        gl.uniform1i(uniLocations[uniI++],
                     this.drawLines);
        return uniI;
    }

    static get POINT_RIGHT_ABOVE() {
        return 0;
    }

    static get POINT_RIGHT_BELOW() {
        return 1;
    }

    static get POINT_LEFT_ABOVE() {
        return 2;
    }

    static get POINT_LEFT_BELOW() {
        return 3;
    }

    static get POINT_SYMMETRICAL() {
        4;
    }
}
