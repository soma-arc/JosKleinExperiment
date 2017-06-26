import Maskit from './maskit.js';
import { MaskitCanvas, InvertedMaskitCanvas, Maskit3dCanvas } from './canvas.js';

const RENDER_MASKIT_FRAGMENT = require('./shaders/maskit.frag');
const RENDER_INV_MASKIT_FRAGMENT = require('./shaders/invMaskit.frag');
const RENDER_3D_FRAGMENT = require('./shaders/maskit3d.frag');

window.addEventListener('load', () => {
    const maskit = new Maskit(2, 0, 0.5); // k = 2
    const maskitCanvas = new MaskitCanvas('canvas', maskit,
                                          RENDER_MASKIT_FRAGMENT);
    const invCanvas = new InvertedMaskitCanvas('invCanvas', maskit,
                                               RENDER_INV_MASKIT_FRAGMENT);
    const canvas3d = new Maskit3dCanvas('3dCanvas', maskit,
                                        RENDER_3D_FRAGMENT);

    const drawLineCheck = document.getElementById('drawLineCheck');
    drawLineCheck.addEventListener('change', () => {
        maskit.drawLines = drawLineCheck.checked;
        maskitCanvas.render();
        invCanvas.render();
    });
    const drawCircle = document.getElementById('drawCircleCheck');
    drawCircle.addEventListener('change', () => {
        maskit.drawCircle = drawCircle.checked;
        maskitCanvas.render();
        invCanvas.render();
    });
    const drawInner = document.getElementById('drawInnerCheck');
    drawInner.addEventListener('change', () => {
        maskit.drawInner = drawInner.checked;
        maskitCanvas.render();
        invCanvas.render();
    });
    const applyInversion = document.getElementById('applyInversionCheck');
    applyInversion.addEventListener('change', () => {
        maskit.applyInversion = applyInversion.checked;
        maskitCanvas.render();
        invCanvas.render();
    });
    const trackOrbit = document.getElementById('trackOrbitCheck');
    trackOrbit.addEventListener('change', () => {
        maskit.trackOrbit = trackOrbit.checked;
        maskitCanvas.render();
        invCanvas.render();
    });
    const view3d = document.getElementById('view3dCheck');
    view3d.addEventListener('change', () => {
        canvas3d.toggleCanvas();
        invCanvas.toggleCanvas();
    });
    maskitCanvas.render();
    invCanvas.render();
    canvas3d.render();
});
