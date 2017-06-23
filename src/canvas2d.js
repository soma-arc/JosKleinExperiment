import { GetWebGL2Context, CreateSquareVbo, AttachShader,
         LinkProgram } from './glUtils.js';
import Complex from './complex.js';

const RENDER_VERTEX = require('./shaders/render.vert');
const RENDER_MASKIT_FRAGMENT = require('./shaders/maskit.frag');

export default class Canvas2D {
    constructor(canvasId, maskit) {
        this.canvasId = canvasId;
        this.maskit = maskit;

        this.canvas = document.getElementById(canvasId);
        this.pixelRatio = window.devicePixelRatio;
        this.canvas.style.width = `${this.canvas.width}px`;
        this.canvas.style.height = `${this.canvas.height}px`;
        this.canvas.width = this.canvas.width * this.pixelRatio;
        this.canvas.height = this.canvas.height * this.pixelRatio;
        this.canvasRatio = this.canvas.width / this.canvas.height / 2;

        this.gl = GetWebGL2Context(this.canvas);
        this.setupShader();
        this.setUniformLocations();

        this.translate = new Complex(0, 1);
        this.scale = 2.1;
        this.kleinIterations = 200;

        this.sceneScaleFactor = 1.5;
        this.setupMouseListener();
    }

    setupShader() {
        this.vertexBuffer = CreateSquareVbo(this.gl);
        this.renderProgram = this.gl.createProgram();
        AttachShader(this.gl, RENDER_VERTEX,
                     this.renderProgram, this.gl.VERTEX_SHADER);
        AttachShader(this.gl, RENDER_MASKIT_FRAGMENT,
                     this.renderProgram, this.gl.FRAGMENT_SHADER);
        LinkProgram(this.gl, this.renderProgram);
        this.renderVAttrib = this.gl.getAttribLocation(this.renderProgram, 'a_vertex');
        this.gl.enableVertexAttribArray(this.renderVAttrib);
    }

    setUniformLocations() {
        this.uniLocations = [];
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram, 'u_resolution'));
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram, 'u_geometry'));
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram, 'u_kleinIterations'));
        this.maskit.setUniformLocations(this.gl, this.uniLocations, this.renderProgram);
    }

    setUniformValues() {
        let i = 0;
        this.gl.uniform2f(this.uniLocations[i++], this.canvas.width, this.canvas.height);
        this.gl.uniform3f(this.uniLocations[i++],
                          this.translate.re, this.translate.im, this.scale);
        this.gl.uniform1i(this.uniLocations[i++], this.kleinIterations);
        i = this.maskit.setUniformValues(this.gl, this.uniLocations, i, this.scale);
    }

    render() {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.useProgram(this.renderProgram);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.vertexAttribPointer(this.renderCanvasVAttrib, 2,
                                    this.gl.FLOAT, false, 0, 0);
        this.setUniformValues();
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        this.gl.flush();
    }

    /**
     * Calculate screen coordinates from mouse position
     * scale * [-width/2, width/2]x[-height/2, height/2]
     * @param {number} mx
     * @param {number} my
     * @returns {Vec2}
     */
    calcCanvasCoord(mx, my) {
        const rect = this.canvas.getBoundingClientRect();
        return new Complex(this.scale * (((mx - rect.left) * this.pixelRatio) /
                                         this.canvas.height - this.canvasRatio),
                           this.scale * -(((my - rect.top) * this.pixelRatio) /
                                          this.canvas.height - 0.5));
    }

    /**
     * Calculate coordinates on scene (consider translation) from mouse position
     * @param {number} mx
     * @param {number} my
     * @returns {Vec2}
     */
    calcSceneCoord(mx, my) {
        return this.calcCanvasCoord(mx, my).add(this.translate);
    }

    setupMouseListener() {
        this.mouseState = {
            isPressing: false,
            prevPosition: new Complex(0, 0),
            prevTranslate: new Complex(0, 0)
        };
        this.boundOnMouseWheel = this.onMouseWheel.bind(this);
        this.canvas.addEventListener('wheel', this.boundOnMouseWheel);
        this.boundOnMouseDown = this.onMouseDown.bind(this);
        this.canvas.addEventListener('mousedown', this.boundOnMouseDown);
        this.boundOnMouseMove = this.onMouseMove.bind(this);
        this.canvas.addEventListener('mousemove', this.boundOnMouseMove);
        this.boundOnMouseUp = this.onMouseUp.bind(this);
        this.canvas.addEventListener('mouseup', this.boundOnMouseUp);
        this.canvas.addEventListener('contextmenu', event => event.preventDefault());
    }

    onMouseWheel(event) {
        event.preventDefault();
        if (event.deltaY > 0) {
            this.scale *= this.sceneScaleFactor;
        } else {
            this.scale /= this.sceneScaleFactor;
        }
        this.render();
    }

    onMouseDown(event) {
        event.preventDefault();
        const mouse = this.calcSceneCoord(event.clientX, event.clientY);
        if (event.button === Canvas2D.MOUSE_BUTTON_LEFT) {
            this.maskit.select(mouse);
            this.render();
        }
        this.mouseState.prevPosition = mouse;
        this.mouseState.prevTranslate = this.translate;
        this.mouseState.isPressing = true;
    }

    onMouseUp(event) {
        this.mouseState.isPressing = false;
        this.maskit.release();
    }

    onMouseMove(event) {
        // envent.button return 0 when the mouse is not pressed.
        // Thus we store mouseState and check it
        if (!this.mouseState.isPressing) return;
        const mouse = this.calcSceneCoord(event.clientX, event.clientY);
        if (event.button === Canvas2D.MOUSE_BUTTON_LEFT) {
            const moved = this.maskit.move(mouse);
            if (moved) this.render();
        } else if (event.button === Canvas2D.MOUSE_BUTTON_RIGHT) {
            this.translate = this.translate.sub(mouse.sub(this.mouseState.prevPosition));
            this.render();
        }
    }

    static get MOUSE_BUTTON_LEFT() {
        return 0;
    }

    static get MOUSE_BUTTON_WHEEL() {
        return 1;
    }

    static get MOUSE_BUTTON_RIGHT() {
        return 2;
    }
}
