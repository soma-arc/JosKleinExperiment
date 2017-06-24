import Maskit from './maskit.js';
import Canvas2D from './canvas2d.js';

window.addEventListener('load', () => {
    const maskit = new Maskit(2, 0, 0.5); // k = 2
    const canvas = new Canvas2D('canvas', maskit);
    const drawLineCheck = document.getElementById('drawLineCheck');
    drawLineCheck.addEventListener('change', () => {
        maskit.drawLines = drawLineCheck.checked;
        canvas.render();
    });
    const inversionCheck = document.getElementById('inversionCheck');
    inversionCheck.addEventListener('change', () => {
        maskit.applyInversion = inversionCheck.checked;
        canvas.render();
    });
    canvas.render();
});
