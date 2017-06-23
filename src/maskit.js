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
        this.update();

        this.pointRadius = 0.01;
        this.lineWidth = 0.1;
    }

    update() {
        this.symmetricalPoint = new Complex(-this.t.im * 0.5, this.t.re * 0.5);

        // this.k = 2;
        this.k = 2 * Math.cos(Math.PI / this.n);
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

    setUniformLocations(gl, uniLocations, program) {
        uniLocations.push(gl.getUniformLocation(program, 'u_maskit.uv'));
        uniLocations.push(gl.getUniformLocation(program, 'u_maskit.k'));
        uniLocations.push(gl.getUniformLocation(program, 'u_maskit.lineLeftNormal'));
        uniLocations.push(gl.getUniformLocation(program, 'u_maskit.lineLeftPoints'));
        uniLocations.push(gl.getUniformLocation(program, 'u_maskit.lineRightNormal'));
        uniLocations.push(gl.getUniformLocation(program, 'u_maskit.lineRightPoints'));
        uniLocations.push(gl.getUniformLocation(program, 'u_maskit.ui'));
    }

    setUniformValues(gl, uniLocations, uniIndex, sceneScale) {
        let uniI = uniIndex;
        gl.uniform2f(uniLocations[uniI++],
                     this.t.re, this.t.im);
        gl.uniform1f(uniLocations[uniI++], this.k);
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
}
