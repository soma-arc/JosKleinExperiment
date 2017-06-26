import { GetWebGL2Context, CreateSquareVbo, AttachShader,
         LinkProgram } from './glUtils.js';
import Complex from './complex.js';

const RENDER_VERTEX = require('./shaders/render.vert');

class Canvas {
    constructor(canvasId, maskit, fragment) {
        this.canvasId = canvasId;
        this.maskit = maskit;
        this.fragment = fragment;

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
    }

    hideCanvas() {
        this.canvas.style.display = 'none';
    }

    showCanvas() {
        this.canvas.style.display = 'inline';
    }

    toggleCanvas() {
        if (this.canvas.style.display === 'none') {
            this.showCanvas();
            this.render();
        } else {
            this.hideCanvas();
        }
    }

    setupShader() {
        this.vertexBuffer = CreateSquareVbo(this.gl);
        this.renderProgram = this.gl.createProgram();
        AttachShader(this.gl, RENDER_VERTEX,
                     this.renderProgram, this.gl.VERTEX_SHADER);
        AttachShader(this.gl, this.fragment,
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
        if (this.canvas.style.display === 'none') return;
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

    onMouseDown(event) {}

    onMouseMove(event) {}

    onMouseUp(event) {
        this.mouseState.isPressing = false;
        this.maskit.release();
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

export class MaskitCanvas extends Canvas {
    constructor(canvasId, maskit, fragment) {
        super(canvasId, maskit, fragment);
        this.maskit.addParameterChangedListener((e) => {
            this.render();
        });
        this.setupMouseListener();
    }

    onMouseDown(event) {
        event.preventDefault();
        const mouse = this.calcSceneCoord(event.clientX, event.clientY);
        if (event.button === Canvas.MOUSE_BUTTON_LEFT) {
            this.maskit.select(mouse);
            this.render();
        }
        this.mouseState.prevPosition = mouse;
        this.mouseState.prevTranslate = this.translate;
        this.mouseState.isPressing = true;
    }

    onMouseMove(event) {
        const mouse = this.calcSceneCoord(event.clientX, event.clientY);
        this.maskit.updateOrbitPoints(mouse);
        // envent.button return 0 when the mouse is not pressed.
        // Thus we store mouseState and check it
        if (!this.mouseState.isPressing) return;
        if (event.button === Canvas.MOUSE_BUTTON_LEFT) {
            this.maskit.move(mouse);
        } else if (event.button === Canvas.MOUSE_BUTTON_RIGHT) {
            this.translate = this.translate.sub(mouse.sub(this.mouseState.prevPosition));
            this.render();
        }
    }
}

export class InvertedMaskitCanvas extends Canvas {
    constructor(canvasId, maskit, fragment) {
        super(canvasId, maskit, fragment);
        this.maskit.addParameterChangedListener((e) => {
            this.render();
        });
        this.setupMouseListener();
    }

    onMouseDown(event) {
        event.preventDefault();
        const mouse = this.calcSceneCoord(event.clientX, event.clientY);

        this.mouseState.prevPosition = mouse;
        this.mouseState.prevTranslate = this.translate;
        this.mouseState.isPressing = true;
    }

    onMouseMove(event) {
        // envent.button return 0 when the mouse is not pressed.
        // Thus we store mouseState and check it
        if (!this.mouseState.isPressing) return;
        const mouse = this.calcSceneCoord(event.clientX, event.clientY);
        if (event.button === Canvas.MOUSE_BUTTON_RIGHT) {
            this.translate = this.translate.sub(mouse.sub(this.mouseState.prevPosition));
            this.render();
        }
    }
}

export class Maskit3dCanvas extends Canvas {
    constructor(canvasId, maskit, fragment) {
        super(canvasId, maskit, fragment);
        this.cameraPos = [0, 1, 1];
        this.cameraUp = [0, 1, 0];
        this.cameraTarget = [0, 1, 0];
        this.cameraDistance = 2;
        // camera position
        this.cameraLnglat = [90, 0];
        this.mouseDownLngLat = [0, 0];

        this.setupMouseListener();
        this.updateCamera();
        //        console.log(this.cameraPos);

        this.maskit.addParameterChangedListener((e) => {
            this.render();
        });
    }

    updateCamera() {
//        this.cameraLnglat[1] = Math.max(-85, Math.min(85, this.cameraLnglat[1]));
        const phi = (90 - this.cameraLnglat[1]) * Math.PI / 180;
        const theta = (this.cameraLnglat[0]) * Math.PI / 180;

        this.cameraPos = [this.cameraDistance * Math.sin(phi) * Math.cos(theta),
                          Math.max(-0.9, this.cameraDistance * Math.cos(phi)),
                          this.cameraDistance * Math.sin(phi) * Math.sin(theta)];
        this.cameraPos = [this.cameraPos[0] + this.cameraTarget[0],
                          this.cameraPos[1] + this.cameraTarget[1],
                          this.cameraPos[2] + this.cameraTarget[2]];
        this.render();
    }

    onMouseDown(event) {
        event.preventDefault();
        const mouse = this.calcCanvasCoord(event.clientX, event.clientY);
        this.mouseState.prevPosition = mouse;
        this.mouseState.prevTranslate = this.translate;
        this.mouseDownLngLat = this.cameraLnglat;
        this.mouseState.isPressing = true;
    }

    onMouseMove(event) {
        event.preventDefault();
        if (this.mouseState.isPressing) {
            const mouse = this.calcCanvasCoord(event.clientX, event.clientY);
            this.cameraLnglat = [(this.mouseState.prevPosition.re - mouse.re) * 50.5 +
                                 this.mouseDownLngLat[0],
                                 (mouse.im - this.mouseState.prevPosition.im) * 50.5 +
                                 this.mouseDownLngLat[1]];
            this.updateCamera();
        }
    }

    onMouseWheel(event) {
        event.preventDefault();
        if (event.deltaY > 0) {
            this.cameraDistance *= 1.25;
        } else if (this.cameraDistance) {
            this.cameraDistance /= 1.25;
        }
        this.updateCamera();
    }

    setUniformLocations() {
        this.uniLocations = [];
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram, 'u_resolution'));
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram,
                                                          'u_cameraPos'));
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram,
                                                          'u_cameraTarget'));
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram,
                                                          'u_cameraUp'));
        this.uniLocations.push(this.gl.getUniformLocation(this.renderProgram, 'u_kleinIterations'));
        this.maskit.setUniformLocations(this.gl, this.uniLocations, this.renderProgram);
    }

    setUniformValues() {
        let i = 0;
        this.gl.uniform2f(this.uniLocations[i++], this.canvas.width, this.canvas.height);
        this.gl.uniform3f(this.uniLocations[i++],
                          this.cameraPos[0], this.cameraPos[1], this.cameraPos[2]);
        this.gl.uniform3f(this.uniLocations[i++],
                          this.cameraTarget[0], this.cameraTarget[1], this.cameraTarget[2]);
        this.gl.uniform3f(this.uniLocations[i++],
                          this.cameraUp[0], this.cameraUp[1], this.cameraUp[2]);
        this.gl.uniform1i(this.uniLocations[i++], this.kleinIterations);
        i = this.maskit.setUniformValues(this.gl, this.uniLocations, i, this.scale);
    }
}
