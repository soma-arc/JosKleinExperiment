import Maskit from './maskit.js';
import Canvas2D from './canvas2d.js';

window.addEventListener('load', () => {
    const maskit = new Maskit(2, 0, 0.5); // k = 2
    const canvas = new Canvas2D('canvas', maskit);
    canvas.render();
});
